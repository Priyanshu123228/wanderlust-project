const Destination = require("../models/destination.js");
const Attraction = require("../models/attraction.js");
const Activity = require("../models/activity.js");
const Restaurant = require("../models/restaurant.js");
const Listing = require("../models/listing.js");
const { getDestinationWeather } = require("./weatherService.js");

/**
 * Generate an optimized day-by-day travel plan with detailed time slots and budget calculation.
 */
async function generateSmartItinerary({ destinationName, durationDays = 3, numTravelers = 2, budgetTier = "MEDIUM", interests = [] }) {
    durationDays = parseInt(durationDays) || 3;
    numTravelers = parseInt(numTravelers) || 2;
    budgetTier = (budgetTier || "MEDIUM").toUpperCase();

    if (typeof interests === "string") {
        interests = [interests];
    }

    // 1. Fetch Destination details
    let destination = await Destination.findOne({ name: { $regex: new RegExp(`^${destinationName}$`, "i") } });
    if (!destination) {
        destination = await Destination.findOne({ name: { $regex: new RegExp(destinationName, "i") } });
    }

    // 2. Fetch candidates from MongoDB & Live Weather in parallel
    const destQuery = destination ? { $or: [{ destination: destination._id }, { destinationName: { $regex: new RegExp(destinationName, "i") } }] } : { destinationName: { $regex: new RegExp(destinationName, "i") } };

    const [attractions, activities, restaurants, stays, weather] = await Promise.all([
        Attraction.find(destQuery),
        Activity.find(destQuery),
        Restaurant.find(destQuery),
        Listing.find(destQuery),
        getDestinationWeather({
            destinationName: destination ? destination.name : destinationName,
            coordinates: destination?.geometry?.coordinates
        }).catch(err => {
            console.error("Weather fetch failed:", err.message);
            return { available: false, message: "Weather information is currently unavailable." };
        })
    ]);

    // 3. Select matching stay
    let matchingStays = stays.filter(s => s.budgetCategory === budgetTier);
    if (matchingStays.length === 0) matchingStays = stays;
    let selectedStay = matchingStays.length > 0 ? matchingStays[0] : null;

    // Fallback default stay if no listing exists
    let stayPricePerNight = selectedStay ? selectedStay.price : (budgetTier === "LOW" ? 1200 : (budgetTier === "MEDIUM" ? 3500 : 8000));
    let stayTitle = selectedStay ? selectedStay.title : `${destinationName} Recommended ${budgetTier.toLowerCase()} Stay`;
    let stayLocation = selectedStay ? selectedStay.location : `${destinationName}, India`;

    // 4. Score and sort activities by user interests and budget
    const scoredActivities = activities.map(act => {
        let score = 0;
        if (interests.some(interest => act.category.toLowerCase() === interest.toLowerCase())) {
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

    // 5. Construct Day-by-Day Schedule
    const dailyPlan = [];
    let attrIndex = 0;
    let actIndex = 0;
    let restIndex = 0;

    let totalActivitiesCost = 0;
    let totalEntryFees = 0;

    for (let day = 1; day <= durationDays; day++) {
        // Morning Slot: Major Attraction
        let morningItem = sortedAttractions[attrIndex % (sortedAttractions.length || 1)];
        attrIndex++;

        let morningCost = morningItem ? (morningItem.entryFee || 0) : 0;
        totalEntryFees += morningCost;

        const morning = {
            type: "Attraction",
            attraction: morningItem ? morningItem._id : null,
            title: morningItem ? morningItem.name : `Morning Exploration in ${destinationName}`,
            description: morningItem ? morningItem.description : `Visit top local viewpoints and cultural spots.`,
            location: morningItem ? morningItem.location : `${destinationName}`,
            coordinates: morningItem?.geometry?.coordinates || destination?.geometry?.coordinates || [77.1892, 32.2432],
            time: "09:00 AM - 12:30 PM",
            estimatedCost: morningCost
        };

        // Lunch Slot: Restaurant
        let lunchRest = sortedRestaurants[restIndex % (sortedRestaurants.length || 1)];
        restIndex++;

        const lunch = {
            restaurant: lunchRest ? lunchRest._id : null,
            title: lunchRest ? lunchRest.name : `Authentic Local Dining`,
            cuisine: lunchRest ? (lunchRest.cuisine ? lunchRest.cuisine.join(", ") : "Multi-Cuisine") : "Local Specialties",
            location: lunchRest ? lunchRest.location : `${destinationName}`,
            coordinates: lunchRest?.geometry?.coordinates || destination?.geometry?.coordinates || [77.1892, 32.2432],
            time: "01:00 PM - 02:30 PM",
            estimatedCost: lunchRest ? lunchRest.averagePrice : (budgetTier === "LOW" ? 200 : (budgetTier === "MEDIUM" ? 450 : 900))
        };

        // Afternoon Slot: Activity / Experience
        let afternoonItem = scoredActivities[actIndex % (scoredActivities.length || 1)];
        actIndex++;

        let actCost = afternoonItem ? afternoonItem.estimatedCost : (budgetTier === "LOW" ? 300 : (budgetTier === "MEDIUM" ? 1200 : 2500));
        totalActivitiesCost += actCost;

        const afternoon = {
            type: "Activity",
            activity: afternoonItem ? afternoonItem._id : null,
            title: afternoonItem ? afternoonItem.name : `Afternoon Adventure & Activity`,
            description: afternoonItem ? afternoonItem.description : `Engage in thrilling outdoor sports or guided exploration.`,
            location: afternoonItem ? afternoonItem.location : `${destinationName}`,
            coordinates: afternoonItem?.geometry?.coordinates || destination?.geometry?.coordinates || [77.1892, 32.2432],
            time: "03:00 PM - 05:30 PM",
            estimatedCost: actCost
        };

        // Evening Slot: Sunset / Market / Relaxing Attraction
        let eveningItem = sortedAttractions[attrIndex % (sortedAttractions.length || 1)];
        attrIndex++;

        let eveningCost = eveningItem ? (eveningItem.entryFee || 0) : 0;
        totalEntryFees += eveningCost;

        const evening = {
            type: "Attraction",
            attraction: eveningItem ? eveningItem._id : null,
            title: eveningItem ? eveningItem.name : `Evening Promenade & Sunset View`,
            description: eveningItem ? eveningItem.description : `Relax, stroll through bazaars, and take in the sunset.`,
            location: eveningItem ? eveningItem.location : `${destinationName}`,
            coordinates: eveningItem?.geometry?.coordinates || destination?.geometry?.coordinates || [77.1892, 32.2432],
            time: "06:00 PM - 08:00 PM",
            estimatedCost: eveningCost
        };

        // Dinner Slot: Dinner Restaurant
        let dinnerRest = sortedRestaurants[restIndex % (sortedRestaurants.length || 1)];
        restIndex++;

        const dinner = {
            restaurant: dinnerRest ? dinnerRest._id : null,
            title: dinnerRest ? dinnerRest.name : `Dinner & Evening Drinks`,
            cuisine: dinnerRest ? (dinnerRest.cuisine ? dinnerRest.cuisine.join(", ") : "Fine Dining") : "Regional Flavors",
            location: dinnerRest ? dinnerRest.location : `${destinationName}`,
            coordinates: dinnerRest?.geometry?.coordinates || destination?.geometry?.coordinates || [77.1892, 32.2432],
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
            title: `Day ${day}: ${morning.title} & ${afternoon.title}`,
            weather: dayWeather,
            morning,
            lunch,
            afternoon,
            evening,
            dinner,
            nightStay
        });
    }

    // 6. Comprehensive Multi-Category Budget Calculation
    const numNights = durationDays > 1 ? durationDays - 1 : 1;
    const stayTotal = stayPricePerNight * numNights;

    const dailyFoodPerPerson = budgetTier === "LOW" ? 450 : (budgetTier === "MEDIUM" ? 1000 : 2000);
    const foodTotal = dailyFoodPerPerson * numTravelers * durationDays;

    const activitiesTotal = totalActivitiesCost * numTravelers;
    const entryFeesTotal = totalEntryFees * numTravelers;

    const dailyTransitCost = budgetTier === "LOW" ? 400 : (budgetTier === "MEDIUM" ? 900 : 2000);
    const estimatedTransportation = dailyTransitCost * durationDays;

    const grandTotal = stayTotal + foodTotal + activitiesTotal + entryFeesTotal + estimatedTransportation;

    const costBreakdown = {
        stayTotal,
        foodTotal,
        activitiesTotal,
        entryFeesTotal,
        estimatedTransportation,
        grandTotal
    };

    const tripTitle = `${durationDays}-Day ${destinationName} ${interests.length > 0 ? interests.join(" & ") : "Classic"} Getaway`;

    return {
        title: tripTitle,
        destination: destination ? destination._id : null,
        destinationName: destination ? destination.name : destinationName,
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
