const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN || "";
const geocodingClient = mapToken ? mbxGeocoding({ accessToken: mapToken }) : null;

// Built-in Indian Cities Database for instant offline / fallback resolution
const KNOWN_CITIES = {
    "chandigarh": { name: "Chandigarh, India", coordinates: [76.7794, 30.7333] },
    "manali": { name: "Manali, Himachal Pradesh, India", coordinates: [77.1892, 32.2432] },
    "delhi": { name: "New Delhi, Delhi, India", coordinates: [77.2090, 28.6139] },
    "new delhi": { name: "New Delhi, Delhi, India", coordinates: [77.2090, 28.6139] },
    "shimla": { name: "Shimla, Himachal Pradesh, India", coordinates: [77.1734, 31.1048] },
    "mumbai": { name: "Mumbai, Maharashtra, India", coordinates: [72.8777, 19.0760] },
    "goa": { name: "Goa, India", coordinates: [74.1240, 15.2993] },
    "jaipur": { name: "Jaipur, Rajasthan, India", coordinates: [75.7873, 26.9124] },
    "bengaluru": { name: "Bengaluru, Karnataka, India", coordinates: [77.5946, 12.9716] },
    "bangalore": { name: "Bengaluru, Karnataka, India", coordinates: [77.5946, 12.9716] },
    "hyderabad": { name: "Hyderabad, Telangana, India", coordinates: [78.4867, 17.3850] },
    "kolkata": { name: "Kolkata, West Bengal, India", coordinates: [88.3639, 22.5726] },
    "chennai": { name: "Chennai, Tamil Nadu, India", coordinates: [80.2707, 13.0827] },
    "pune": { name: "Pune, Maharashtra, India", coordinates: [73.8567, 18.5204] },
    "varanasi": { name: "Varanasi, Uttar Pradesh, India", coordinates: [82.9739, 25.3176] },
    "agra": { name: "Agra, Uttar Pradesh, India", coordinates: [78.0081, 27.1767] },
    "amritsar": { name: "Amritsar, Punjab, India", coordinates: [74.8723, 31.6340] },
    "rishikesh": { name: "Rishikesh, Uttarakhand, India", coordinates: [78.2676, 30.0869] },
    "dehradun": { name: "Dehradun, Uttarakhand, India", coordinates: [78.0322, 30.3165] },
    "udaipur": { name: "Udaipur, Rajasthan, India", coordinates: [73.7125, 24.5854] },
    "leh": { name: "Leh, Ladakh, India", coordinates: [77.5771, 34.1526] },
    "srinagar": { name: "Srinagar, Jammu and Kashmir, India", coordinates: [74.7973, 34.0837] },
    "kochi": { name: "Kochi, Kerala, India", coordinates: [76.2673, 9.9312] },
    "munnar": { name: "Munnar, Kerala, India", coordinates: [77.0595, 10.0889] },
    "ooty": { name: "Ooty, Tamil Nadu, India", coordinates: [76.6932, 11.4102] }
};

/**
 * Great-circle distance using Haversine formula (returns km)
 */
function calculateHaversineDistance(coords1, coords2) {
    if (!coords1 || !coords2 || coords1.length < 2 || coords2.length < 2) return 0;
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;

    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

/**
 * Format minutes into readable "X hr Y min"
 */
function formatDuration(totalMinutes) {
    if (!totalMinutes || totalMinutes <= 0) return "1 hr";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} hr`;
    return `${hours} hr ${minutes} min`;
}

/**
 * Geocode text input into { name, coordinates: [lng, lat], lat, lng }
 */
async function forwardGeocode(locationQuery) {
    if (!locationQuery || typeof locationQuery !== "string") {
        return {
            name: "Chandigarh, India",
            coordinates: [76.7794, 30.7333],
            lat: 30.7333,
            lng: 76.7794
        };
    }

    const cleanedQuery = locationQuery.trim().toLowerCase();

    // Check offline dictionary first for exact city match
    for (const [key, val] of Object.entries(KNOWN_CITIES)) {
        if (cleanedQuery === key || cleanedQuery.startsWith(key + ",") || cleanedQuery.startsWith(key + " ")) {
            return {
                name: val.name,
                coordinates: val.coordinates,
                lat: val.coordinates[1],
                lng: val.coordinates[0]
            };
        }
    }

    // Use Mapbox Geocoding if token is available
    if (geocodingClient) {
        try {
            const response = await geocodingClient
                .forwardGeocode({
                    query: locationQuery.includes("India") ? locationQuery : `${locationQuery}, India`,
                    limit: 1
                })
                .send();

            if (response && response.body && response.body.features && response.body.features.length > 0) {
                const feature = response.body.features[0];
                const coords = feature.geometry.coordinates; // [lng, lat]
                return {
                    name: feature.place_name || locationQuery,
                    coordinates: coords,
                    lat: coords[1],
                    lng: coords[0]
                };
            }
        } catch (err) {
            console.warn(`[RouteService] Mapbox forward geocoding failed for "${locationQuery}":`, err.message);
        }
    }

    // Fallback: Default to title-cased location query with default coordinates
    const fallbackCoords = [76.7794, 30.7333]; // Default Chandigarh
    return {
        name: locationQuery.trim(),
        coordinates: fallbackCoords,
        lat: fallbackCoords[1],
        lng: fallbackCoords[0]
    };
}

/**
 * Reverse geocode coordinates [lng, lat] into human-readable location name
 */
async function reverseGeocode(lng, lat) {
    lng = parseFloat(lng);
    lat = parseFloat(lat);

    if (isNaN(lng) || isNaN(lat)) {
        return {
            name: "Unknown Location",
            coordinates: [76.7794, 30.7333],
            lat: 30.7333,
            lng: 76.7794
        };
    }

    // Check known cities within 25km radius
    for (const val of Object.values(KNOWN_CITIES)) {
        const dist = calculateHaversineDistance([lng, lat], val.coordinates);
        if (dist <= 25) {
            return {
                name: val.name,
                coordinates: [lng, lat],
                lat,
                lng
            };
        }
    }

    if (geocodingClient) {
        try {
            const response = await geocodingClient
                .reverseGeocode({
                    query: [lng, lat],
                    limit: 1
                })
                .send();

            if (response && response.body && response.body.features && response.body.features.length > 0) {
                const feature = response.body.features[0];
                return {
                    name: feature.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    coordinates: [lng, lat],
                    lat,
                    lng
                };
            }
        } catch (err) {
            console.warn(`[RouteService] Mapbox reverse geocoding failed for [${lng}, ${lat}]:`, err.message);
        }
    }

    return {
        name: `Location (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
        coordinates: [lng, lat],
        lat,
        lng
    };
}

/**
 * Calculate route, road distance, travel duration, and transport cost
 */
async function calculateRouteDetails({
    originCoordinates,
    destinationCoordinates,
    transportMode = "Car",
    numTravelers = 2,
    budgetTier = "MEDIUM"
}) {
    numTravelers = parseInt(numTravelers) || 2;
    transportMode = transportMode || "Car";

    const [oLng, oLat] = originCoordinates || [76.7794, 30.7333];
    const [dLng, dLat] = destinationCoordinates || [77.1892, 32.2432];

    const straightDistKm = calculateHaversineDistance([oLng, oLat], [dLng, dLat]);
    let roadDistanceKm = Math.max(10, Math.round(straightDistKm * 1.32)); // Standard road factor
    let durationMinutes = Math.round((roadDistanceKm / 50) * 60) + 30; // 50km/h avg + 30m break
    let routeGeometry = {
        type: "LineString",
        coordinates: [
            [oLng, oLat],
            [(oLng + dLng) / 2 + 0.05, (oLat + dLat) / 2],
            [dLng, dLat]
        ]
    };

    // If Mapbox token is available, request real-world driving directions
    if (mapToken && (transportMode === "Car" || transportMode === "Bus")) {
        try {
            const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${oLng},${oLat};${dLng},${dLat}?geometries=geojson&overview=full&access_token=${mapToken}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const res = await fetch(directionsUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data.routes && data.routes.length > 0) {
                    const primaryRoute = data.routes[0];
                    roadDistanceKm = Math.round(primaryRoute.distance / 1000);
                    durationMinutes = Math.round(primaryRoute.duration / 60);
                    if (primaryRoute.geometry) {
                        routeGeometry = primaryRoute.geometry;
                    }
                }
            }
        } catch (err) {
            console.warn("[RouteService] Mapbox directions fetch error:", err.message);
        }
    }

    // Mode-specific duration and cost adjustments
    let finalDistanceKm = roadDistanceKm;
    let finalDurationMinutes = durationMinutes;
    let travelCost = 0;

    switch (transportMode) {
        case "Bus":
            finalDurationMinutes = Math.round(durationMinutes * 1.25); // Bus stops / lower cruising speed
            // ₹2.4 / km per traveler
            travelCost = Math.max(200, Math.round(finalDistanceKm * 2.4)) * numTravelers;
            break;

        case "Train":
            finalDistanceKm = Math.round(straightDistKm * 1.2); // Train tracks alignment
            finalDurationMinutes = Math.round((finalDistanceKm / 60) * 60) + 40; // 60 km/h + station stops
            // Tier based rate per traveler
            const trainRate = budgetTier === "HIGH" ? 3.0 : (budgetTier === "LOW" ? 1.0 : 1.9);
            travelCost = Math.max(150, Math.round(finalDistanceKm * trainRate)) * numTravelers;
            break;

        case "Flight":
            finalDistanceKm = straightDistKm;
            // 1.5 hr security/boarding + flight duration (approx 650 km/h)
            finalDurationMinutes = Math.round(90 + (finalDistanceKm / 650) * 60);
            // Flight base fare + distance charge per traveler
            const baseFare = budgetTier === "HIGH" ? 5500 : (budgetTier === "LOW" ? 2800 : 3800);
            const kmRate = budgetTier === "HIGH" ? 5.5 : 4.0;
            travelCost = (baseFare + Math.round(finalDistanceKm * kmRate)) * numTravelers;
            break;

        case "Car":
        default:
            transportMode = "Car";
            finalDurationMinutes = durationMinutes;
            // Fuel + toll estimate (~₹13/km for standard car, shared for the whole group)
            travelCost = Math.max(600, Math.round(finalDistanceKm * 13));
            break;
    }

    const durationText = formatDuration(finalDurationMinutes);

    return {
        distanceKm: finalDistanceKm,
        durationMinutes: finalDurationMinutes,
        durationText,
        travelCost,
        routeGeometry,
        transportMode
    };
}

module.exports = {
    forwardGeocode,
    reverseGeocode,
    calculateHaversineDistance,
    calculateRouteDetails,
    formatDuration,
    KNOWN_CITIES
};
