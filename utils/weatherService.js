/**
 * Weather Service for Wanderlust
 * Retrieves and normalizes forecast data from OpenWeatherMap API with in-memory caching and error resilience.
 */

// In-memory cache to respect API rate limits and avoid duplicate requests (TTL: 20 minutes)
const weatherCache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Maps weather condition to human-friendly emoji
 */
function getWeatherEmoji(condition, icon = "") {
    const cond = (condition || "").toLowerCase();
    if (cond.includes("thunderstorm")) return "⛈️";
    if (cond.includes("rain") || cond.includes("drizzle")) return "🌧️";
    if (cond.includes("snow")) return "🌨️";
    if (cond.includes("cloud")) return "☁️";
    if (cond.includes("clear")) return icon.includes("n") ? "🌙" : "☀️";
    if (cond.includes("mist") || cond.includes("fog") || cond.includes("haze")) return "🌫️";
    return "🌤️";
}

/**
 * Generates an advisory suggestion based on forecast conditions
 */
function getWeatherSuggestion(condition, rainProbability = 0, temp = 20) {
    const cond = (condition || "").toLowerCase();
    if (cond.includes("thunderstorm")) {
        return "Thunderstorms expected. Check local alerts and prioritize indoor sightseeing.";
    }
    if (cond.includes("rain") || cond.includes("drizzle") || rainProbability >= 50) {
        return "Rain is expected. Consider indoor or cultural attractions.";
    }
    if (cond.includes("snow")) {
        return "Snowfall expected. Check mountain passes and keep warm thermal gear handy.";
    }
    if (cond.includes("clear") || cond.includes("sun")) {
        return "Weather looks suitable for outdoor activities.";
    }
    if (cond.includes("cloud")) {
        return "Pleasant overcast skies, great for walking and exploration.";
    }
    if (temp >= 35) {
        return "Warm conditions. Stay hydrated and plan outdoor tours during morning or evening.";
    }
    return "Weather looks suitable for sightseeing.";
}

/**
 * Fetch destination weather by coordinates or destination name
 * @param {Object} options - { destinationName, coordinates: [lng, lat] or { lat, lon } }
 * @returns {Promise<Object>} Normalized weather object or fallback
 */
async function getDestinationWeather({ destinationName, coordinates }) {
    const rawKey = process.env.OPENWEATHER_API_KEY || "";
    const apiKey = rawKey.replace(/['"]/g, "").trim();

    // Graceful fallback if API key is missing
    if (!apiKey || apiKey === "") {
        console.warn("[WeatherService] OPENWEATHER_API_KEY is not set or empty in .env.");
        return {
            available: false,
            message: "Weather information is currently unavailable."
        };
    }

    // Determine query parameters (prefer GeoJSON coordinates [longitude, latitude])
    let lat = null;
    let lon = null;
    if (Array.isArray(coordinates) && coordinates.length === 2) {
        lon = coordinates[0];
        lat = coordinates[1];
    } else if (coordinates && coordinates.lat && coordinates.lon) {
        lat = coordinates.lat;
        lon = coordinates.lon;
    }

    // Build Cache Key
    const cacheKey = lat && lon 
        ? `coord_${lat.toFixed(2)}_${lon.toFixed(2)}` 
        : `name_${(destinationName || "").toLowerCase().trim()}`;

    // Check in-memory cache
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
    }

    try {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), 4500);

        let forecastUrl = "";
        let currentUrl = "";

        if (lat !== null && lon !== null) {
            forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
            currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        } else if (destinationName) {
            forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(destinationName)}&units=metric&appid=${apiKey}`;
            currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(destinationName)}&units=metric&appid=${apiKey}`;
        } else {
            clearTimeout(timeoutId);
            return {
                available: false,
                message: "No destination coordinates or name provided."
            };
        }

        // Fetch forecast and current weather in parallel
        const [forecastRes, currentRes] = await Promise.all([
            fetch(forecastUrl, { signal: timeoutController.signal }).catch(err => ({ ok: false, status: 500, statusText: err.message })),
            fetch(currentUrl, { signal: timeoutController.signal }).catch(err => ({ ok: false, status: 500, statusText: err.message }))
        ]);

        clearTimeout(timeoutId);

        if (!forecastRes.ok) {
            let errorDetail = "";
            try {
                const errJson = await forecastRes.json();
                errorDetail = errJson.message || JSON.stringify(errJson);
            } catch (e) {
                errorDetail = forecastRes.statusText;
            }
            console.warn(`[WeatherService] OpenWeatherMap API returned status ${forecastRes.status}: ${errorDetail}`);
            return {
                available: false,
                message: "Weather information is currently unavailable."
            };
        }

        const forecastData = await forecastRes.json();
        let currentData = null;
        if (currentRes.ok) {
            currentData = await currentRes.json();
        }

        // 1. Normalize Current Weather
        let current = null;
        if (currentData && currentData.main && currentData.weather && currentData.weather[0]) {
            const cond = currentData.weather[0].main;
            const icon = currentData.weather[0].icon;
            const temp = Math.round(currentData.main.temp);
            current = {
                temperature: temp,
                feelsLike: Math.round(currentData.main.feels_like),
                tempMin: Math.round(currentData.main.temp_min),
                tempMax: Math.round(currentData.main.temp_max),
                condition: cond,
                description: currentData.weather[0].description,
                icon: icon,
                iconUrl: `https://openweathermap.org/img/wn/${icon}@2x.png`,
                emoji: getWeatherEmoji(cond, icon),
                humidity: currentData.main.humidity,
                windSpeed: Math.round(currentData.wind ? currentData.wind.speed * 3.6 : 0), // convert m/s to km/h
                suggestion: getWeatherSuggestion(cond, 0, temp)
            };
        }

        // 2. Normalize 5-Day Forecast into Daily Forecasts
        const dailyMap = new Map();
        if (forecastData && Array.isArray(forecastData.list)) {
            for (const item of forecastData.list) {
                const dateText = item.dt_txt || ""; // "YYYY-MM-DD HH:mm:ss"
                const dateKey = dateText.split(" ")[0] || new Date(item.dt * 1000).toISOString().split("T")[0];

                if (!dailyMap.has(dateKey)) {
                    dailyMap.set(dateKey, []);
                }
                dailyMap.get(dateKey).push(item);
            }
        }

        const dailyForecast = [];
        let dayCounter = 1;

        for (const [dateStr, items] of dailyMap.entries()) {
            if (dailyForecast.length >= 7) break; // Maximum 7 days

            // Pick the midday forecast (12:00 / 15:00) or middle item
            let representativeItem = items.find(i => (i.dt_txt && i.dt_txt.includes("12:00:00"))) 
                || items.find(i => (i.dt_txt && i.dt_txt.includes("15:00:00"))) 
                || items[Math.floor(items.length / 2)];

            if (!representativeItem) continue;

            // Calculate min / max temps for the day across all 3h slots
            let minTemp = Infinity;
            let maxTemp = -Infinity;
            let maxRainProb = 0;

            for (const slot of items) {
                if (slot.main) {
                    if (slot.main.temp_min < minTemp) minTemp = slot.main.temp_min;
                    if (slot.main.temp_max > maxTemp) maxTemp = slot.main.temp_max;
                }
                if (slot.pop !== undefined && slot.pop > maxRainProb) {
                    maxRainProb = slot.pop;
                }
            }

            const cond = representativeItem.weather && representativeItem.weather[0] ? representativeItem.weather[0].main : "Clear";
            const desc = representativeItem.weather && representativeItem.weather[0] ? representativeItem.weather[0].description : "clear sky";
            const icon = representativeItem.weather && representativeItem.weather[0] ? representativeItem.weather[0].icon : "01d";
            const temp = Math.round(representativeItem.main ? representativeItem.main.temp : 20);
            const rainProbPercent = Math.round(maxRainProb * 100);

            const dateObj = new Date(dateStr);
            const dayName = isNaN(dateObj.getTime()) ? `Day ${dayCounter}` : dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

            dailyForecast.push({
                dayNumber: dayCounter,
                date: dateStr,
                dayName: dayName,
                temperature: temp,
                feelsLike: Math.round(representativeItem.main ? representativeItem.main.feels_like : temp),
                tempMin: minTemp !== Infinity ? Math.round(minTemp) : temp - 2,
                tempMax: maxTemp !== -Infinity ? Math.round(maxTemp) : temp + 2,
                condition: cond,
                description: desc,
                icon: icon,
                iconUrl: `https://openweathermap.org/img/wn/${icon}@2x.png`,
                emoji: getWeatherEmoji(cond, icon),
                humidity: representativeItem.main ? representativeItem.main.humidity : 50,
                windSpeed: Math.round(representativeItem.wind ? representativeItem.wind.speed * 3.6 : 0),
                rainProbability: rainProbPercent,
                suggestion: getWeatherSuggestion(cond, rainProbPercent, temp)
            });

            dayCounter++;
        }

        // If current weather wasn't available, synthesize current from day 1
        if (!current && dailyForecast.length > 0) {
            current = { ...dailyForecast[0] };
        }

        const normalizedResult = {
            available: true,
            destinationName: destinationName || (forecastData.city ? forecastData.city.name : "Destination"),
            current: current,
            dailyForecast: dailyForecast
        };

        // Cache the result
        weatherCache.set(cacheKey, {
            data: normalizedResult,
            expiresAt: Date.now() + CACHE_TTL_MS
        });

        return normalizedResult;
    } catch (err) {
        console.error("Weather service request failed:", err.message);
        return {
            available: false,
            message: "Weather information is currently unavailable."
        };
    }
}

module.exports = {
    getDestinationWeather,
    getWeatherEmoji,
    getWeatherSuggestion
};
