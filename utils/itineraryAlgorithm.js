const Destination = require("../models/destination.js");
const Attraction = require("../models/attraction.js");
const Activity = require("../models/activity.js");
const Restaurant = require("../models/restaurant.js");
const Listing = require("../models/listing.js");
const { getDestinationWeather } = require("./weatherService.js");
const { forwardGeocode, reverseGeocode, calculateRouteDetails } = require("./routeService.js");

/**
 * Generate an optimized day-by-day travel plan from origin to destination
 * with detailed time slots, route calculations, live weather, and budget breakdown.
 */
async function generateSmartItinerary({
    fromName = "",
    fromCoordinates = null,
    destinationName,
    durationDays = 3,
    numTravelers = 2,
    budgetTier = "MEDIUM",
    interests = [],
    transportMode = "Car",
    startDate = "",
    endDate = ""
}) {
    durationDays = parseInt(durationDays) || 3;
    numTravelers = parseInt(numTravelers) || 2;
    budgetTier = (budgetTier || "MEDIUM").toUpperCase();
    transportMode = transportMode || "Car";

    if (typeof interests === "string") {
        interests = [interests];
    }

    // 1. Fetch Destination details
    let destination = await Destination.findOne({ name: { $regex: new RegExp(`^${destinationName}$`, "i") } });
    if (!destination) {
        destination = await Destination.findOne({ name: { $regex: new RegExp(destinationName, "i") } });
    }

    const destCoords = destination?.geometry?.coordinates || [77.1892, 32.2432];

    // 2. Resolve Starting (From) Location & Coordinates
    let resolvedFrom = null;

    // If coordinates were supplied directly (e.g. from browser geolocation or hidden form inputs)
    if (fromCoordinates) {
        let parsedCoords = null;
        if (Array.isArray(fromCoordinates) && fromCoordinates.length === 2) {
            parsedCoords = [parseFloat(fromCoordinates[0]), parseFloat(fromCoordinates[1])];
        } else if (typeof fromCoordinates === "string" && fromCoordinates.includes(",")) {
            const parts = fromCoordinates.split(",").map(p => parseFloat(p.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                parsedCoords = parts;
            }
        }

        if (parsedCoords && !isNaN(parsedCoords[0]) && !isNaN(parsedCoords[1])) {
            if (fromName && fromName.trim()) {
                resolvedFrom = {
                    name: fromName.trim(),
                    coordinates: parsedCoords,
                    lat: parsedCoords[1],
                    lng: parsedCoords[0]
                };
            } else {
                resolvedFrom = await reverseGeocode(parsedCoords[0], parsedCoords[1]);
            }
        }
    }

    // If still not resolved, resolve from fromName query text
    if (!resolvedFrom) {
        if (fromName && fromName.trim()) {
            resolvedFrom = await forwardGeocode(fromName.trim());
        } else {
            // Default starting location
            resolvedFrom = {
                name: "Chandigarh, India",
                coordinates: [76.7794, 30.7333],
                lat: 30.7333,
                lng: 76.7794
            };
        }
    }

    // 3. Compute Route, Distance, Duration & Transport Cost between Origin and Destination
    const routeDetails = await calculateRouteDetails({
        originCoordinates: resolvedFrom.coordinates,
        destinationCoordinates: destCoords,
        transportMode,
        numTravelers,
        budgetTier
    });

    // 4. Fetch candidates from MongoDB & Live Weather in parallel
    const destQuery = destination
        ? { $or: [{ destination: destination._id }, { destinationName: { $regex: new RegExp(destinationName, "i") } }] }
        : { destinationName: { $regex: new RegExp(destinationName, "i") } };

    const [attractions, activities, restaurants, stays, weather] = await Promise.all([
        Attraction.find(destQuery),
        Activity.find(destQuery),
        Restaurant.find(destQuery),
        Listing.find(destQuery),
        getDestinationWeather({
            destinationName: destination ? destination.name : destinationName,
            coordinates: destCoords
        }).catch(err => {
            console.error("Weather fetch failed:", err.message);
            return { available: false, message: "Weather information is currently unavailable." };
        })
    ]);

    // 5. Select matching stay
    let matchingStays = stays.filter(s => s.budgetCategory === budgetTier);
    if (matchingStays.length === 0) matchingStays = stays;
    let selectedStay = matchingStays.length > 0 ? matchingStays[0] : null;

    let stayPricePerNight = selectedStay ? selectedStay.price : (budgetTier === "LOW" ? 1200 : (budgetTier === "MEDIUM" ? 3500 : 8000));
    let stayTitle = selectedStay ? selectedStay.title : `${destinationName} Recommended ${budgetTier.toLowerCase()} Stay`;
    let stayLocation = selectedStay ? selectedStay.location : `${destinationName}, India`;

    // 6. Score and sort activities by user interests and budget
    const scoredActivities = activities.map(act => {
        let score = 0;
        if (interests.some(interest => act.category && act.category.toLowerCase() === interest.toLowerCase())) {
            score += 10;
        }
        if (act.budgetCategory === budgetTier) {
            score += 4;
        }
        score += act.rating || 4;
        return { act, score };
    }).sort((a, b) => b.score - a.score).map(item => item.act);

    // Filter and sort attractions & restaurants
    const sortedAttractions = [...attractions].sort((a, b) => (b.rating || 4) - (a.rating || 4));
    const sortedRestaurants = [...restaurants].sort((a, b) => {
        const aMatch = a.budgetCategory === budgetTier ? 2 : 0;
        const bMatch = b.budgetCategory === budgetTier ? 2 : 0;
        return (bMatch + (b.rating || 4)) - (aMatch + (a.rating || 4));
    });

    // 7. Construct Day-by-Day Schedule
    const dailyPlan = [];
    let attrIndex = 0;
    let actIndex = 0;
    let restIndex = 0;

    let totalActivitiesCost = 0;
    let totalEntryFees = 0;

    for (let day = 1; day <= durationDays; day++) {
        let morning, lunch, afternoon, evening, dinner;

        if (day === 1) {
            // DAY 1 SPECIAL SCHEDULE: Travel from Origin to Destination
            morning = {
                type: "Travel",
                attraction: null,
                activity: null,
                title: `Departure from ${resolvedFrom.name.split(",")[0]} & Travel to ${destinationName}`,
                description: `Commence your trip from ${resolvedFrom.name.split(",")[0]} towards ${destinationName} via ${transportMode}. Enjoy scenic landscapes (~${routeDetails.distanceKm} km, approx ${routeDetails.durationText}).`,
                location: `${resolvedFrom.name.split(",")[0]} → ${destinationName}`,
                coordinates: resolvedFrom.coordinates,
                time: "07:30 AM - 01:00 PM",
                estimatedCost: 0
            };

            // Lunch on arrival / highway stop
            let lunchRest = sortedRestaurants[restIndex % (sortedRestaurants.length || 1)];
            restIndex++;

            lunch = {
                restaurant: lunchRest ? lunchRest._id : null,
                title: lunchRest ? lunchRest.name : `Welcome Lunch & Refreshment`,
                cuisine: lunchRest ? (lunchRest.cuisine ? lunchRest.cuisine.join(", ") : "Multi-Cuisine") : "Local Dining",
                location: lunchRest ? lunchRest.location : `${destinationName}`,
                coordinates: lunchRest?.geometry?.coordinates || destCoords,
                time: "01:00 PM - 02:30 PM",
                estimatedCost: lunchRest ? lunchRest.averagePrice : (budgetTier === "LOW" ? 200 : (budgetTier === "MEDIUM" ? 450 : 900))
            };

            // Afternoon: Check-in & Relaxation
            afternoon = {
                type: "Activity",
                activity: null,
                title: `Check-in at ${stayTitle} & Unpack`,
                description: `Settle into your accommodation, unpack, relax after your journey, and get ready for the evening.`,
                location: stayLocation,
                coordinates: destCoords,
                time: "03:00 PM - 05:00 PM",
                estimatedCost: 0
            };

            // Evening: Local promenade / market
            let eveningItem = sortedAttractions[attrIndex % (sortedAttractions.length || 1)];
            attrIndex++;
            let eveningCost = eveningItem ? (eveningItem.entryFee || 0) : 0;
            totalEntryFees += eveningCost;

            evening = {
                type: "Attraction",
                attraction: eveningItem ? eveningItem._id : null,
                title: eveningItem ? eveningItem.name : `Evening Promenade & Sunset View`,
                description: eveningItem ? eveningItem.description : `Take a stroll through the local markets and viewpoints.`,
                location: eveningItem ? eveningItem.location : `${destinationName}`,
                coordinates: eveningItem?.geometry?.coordinates || destCoords,
                time: "05:30 PM - 08:00 PM",
                estimatedCost: eveningCost
            };
        } else {
            // DAYS 2+: Exploration, Activities & Sightseeing
            let morningItem = sortedAttractions[attrIndex % (sortedAttractions.length || 1)];
            attrIndex++;
            let morningCost = morningItem ? (morningItem.entryFee || 0) : 0;
            totalEntryFees += morningCost;

            morning = {
                type: "Attraction",
                attraction: morningItem ? morningItem._id : null,
                title: morningItem ? morningItem.name : `Morning Exploration in ${destinationName}`,
                description: morningItem ? morningItem.description : `Visit top local viewpoints, historical landmarks, and scenic trails.`,
                location: morningItem ? morningItem.location : `${destinationName}`,
                coordinates: morningItem?.geometry?.coordinates || destCoords,
                time: "09:00 AM - 12:30 PM",
                estimatedCost: morningCost
            };

            let lunchRest = sortedRestaurants[restIndex % (sortedRestaurants.length || 1)];
            restIndex++;

            lunch = {
                restaurant: lunchRest ? lunchRest._id : null,
                title: lunchRest ? lunchRest.name : `Authentic Local Dining`,
                cuisine: lunchRest ? (lunchRest.cuisine ? lunchRest.cuisine.join(", ") : "Multi-Cuisine") : "Local Specialties",
                location: lunchRest ? lunchRest.location : `${destinationName}`,
                coordinates: lunchRest?.geometry?.coordinates || destCoords,
                time: "01:00 PM - 02:30 PM",
                estimatedCost: lunchRest ? lunchRest.averagePrice : (budgetTier === "LOW" ? 200 : (budgetTier === "MEDIUM" ? 450 : 900))
            };

            let afternoonItem = scoredActivities[actIndex % (scoredActivities.length || 1)];
            actIndex++;
            let actCost = afternoonItem ? afternoonItem.estimatedCost : (budgetTier === "LOW" ? 300 : (budgetTier === "MEDIUM" ? 1200 : 2500));
            totalActivitiesCost += actCost;

            afternoon = {
                type: "Activity",
                activity: afternoonItem ? afternoonItem._id : null,
                title: afternoonItem ? afternoonItem.name : `Afternoon Adventure & Experience`,
                description: afternoonItem ? afternoonItem.description : `Engage in thrilling activities, guided tours, or culture workshops.`,
                location: afternoonItem ? afternoonItem.location : `${destinationName}`,
                coordinates: afternoonItem?.geometry?.coordinates || destCoords,
                time: "03:00 PM - 05:30 PM",
                estimatedCost: actCost
            };

            let eveningItem = sortedAttractions[attrIndex % (sortedAttractions.length || 1)];
            attrIndex++;
            let eveningCost = eveningItem ? (eveningItem.entryFee || 0) : 0;
            totalEntryFees += eveningCost;

            evening = {
                type: "Attraction",
                attraction: eveningItem ? eveningItem._id : null,
                title: eveningItem ? eveningItem.name : `Sunset Viewpoint & Bazaars`,
                description: eveningItem ? eveningItem.description : `Enjoy the golden hour views and shopping for local souvenirs.`,
                location: eveningItem ? eveningItem.location : `${destinationName}`,
                coordinates: eveningItem?.geometry?.coordinates || destCoords,
                time: "06:00 PM - 08:00 PM",
                estimatedCost: eveningCost
            };
        }

        // Dinner Slot (For all days)
        let dinnerRest = sortedRestaurants[restIndex % (sortedRestaurants.length || 1)];
        restIndex++;

        dinner = {
            restaurant: dinnerRest ? dinnerRest._id : null,
            title: dinnerRest ? dinnerRest.name : `Dinner & Evening Ambience`,
            cuisine: dinnerRest ? (dinnerRest.cuisine ? dinnerRest.cuisine.join(", ") : "Fine Dining") : "Regional Flavors",
            location: dinnerRest ? dinnerRest.location : `${destinationName}`,
            coordinates: dinnerRest?.geometry?.coordinates || destCoords,
            time: "08:30 PM - 10:00 PM",
            estimatedCost: dinnerRest ? dinnerRest.averagePrice : (budgetTier === "LOW" ? 250 : (budgetTier === "MEDIUM" ? 550 : 1100))
        };

        // Night Stay
        const nightStay = {
            listing: selectedStay ? selectedStay._id : null,
            title: stayTitle,
            location: stayLocation,
            pricePerNight: stayPricePerNight
        };

        // Attach Day Weather Forecast
        let dayWeather = { available: false, message: "Weather information is currently unavailable." };
        if (weather && weather.available && weather.dailyForecast && weather.dailyForecast[day - 1]) {
            dayWeather = { ...weather.dailyForecast[day - 1], available: true };
        } else if (weather && weather.available && weather.current) {
            dayWeather = { ...weather.current, dayNumber: day, available: true };
        }

        dailyPlan.push({
            dayNumber: day,
            title: day === 1 
                ? `Day 1: ${resolvedFrom.name.split(",")[0]} to ${destinationName} Journey & Welcome`
                : `Day ${day}: ${morning.title} & ${afternoon.title}`,
            weather: dayWeather,
            morning,
            lunch,
            afternoon,
            evening,
            dinner,
            nightStay
        });
    }

    // 8. Comprehensive Multi-Category Budget Calculation
    const numNights = durationDays > 1 ? durationDays - 1 : 1;
    const stayTotal = stayPricePerNight * numNights;

    const dailyFoodPerPerson = budgetTier === "LOW" ? 450 : (budgetTier === "MEDIUM" ? 1000 : 2000);
    const foodTotal = dailyFoodPerPerson * numTravelers * durationDays;

    const activitiesTotal = totalActivitiesCost * numTravelers;
    const entryFeesTotal = totalEntryFees * numTravelers;

    const dailyLocalTransit = budgetTier === "LOW" ? 300 : (budgetTier === "MEDIUM" ? 600 : 1400);
    const localTransitTotal = dailyLocalTransit * durationDays;
    const estimatedTransportation = localTransitTotal + routeDetails.travelCost;

    const grandTotal = stayTotal + foodTotal + activitiesTotal + entryFeesTotal + estimatedTransportation;

    const costBreakdown = {
        stayTotal,
        foodTotal,
        activitiesTotal,
        entryFeesTotal,
        travelCost: routeDetails.travelCost,
        estimatedTransportation,
        grandTotal
    };

    const fromCityShort = resolvedFrom.name.split(",")[0].trim();
    const tripTitle = `${fromCityShort} to ${destinationName} (${durationDays} Days, ${transportMode})`;

    return {
        title: tripTitle,
        fromLocation: {
            name: resolvedFrom.name,
            coordinates: resolvedFrom.coordinates,
            lat: resolvedFrom.lat,
            lng: resolvedFrom.lng
        },
        destination: destination ? destination._id : null,
        destinationName: destination ? destination.name : destinationName,
        transportMode: routeDetails.transportMode,
        travelDistanceKm: routeDetails.distanceKm,
        travelDurationText: routeDetails.durationText,
        travelCost: routeDetails.travelCost,
        routeGeometry: routeDetails.routeGeometry,
        startDate: startDate || "",
        endDate: endDate || "",
        durationDays,
        numTravelers,
        budgetTier,
        interests,
        selectedStay: selectedStay ? selectedStay._id : null,
        dailyPlan,
        costBreakdown,
        destinationDetails: destination,
        weather
    };
}

module.exports = { generateSmartItinerary };
