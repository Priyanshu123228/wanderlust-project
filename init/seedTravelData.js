const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");

const Destination = require("../models/destination.js");
const Restaurant = require("../models/restaurant.js");
const Attraction = require("../models/attraction.js");
const Activity = require("../models/activity.js");

const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust";

const sampleRestaurants = [
    // Manali
    {
        name: "Cafe 1947",
        destinationName: "Manali",
        location: "Old Manali, Near Manalsu River",
        description: "Iconic riverside Italian cafe known for woodfired pizzas, craft pastas, live acoustic music, and soothing sound of rushing mountain water.",
        cuisine: ["Italian", "Continental", "Cafe"],
        averagePrice: 550,
        budgetCategory: "MEDIUM",
        rating: 4.8,
        openingHours: "11:00 AM - 11:00 PM",
        specialties: ["Woodfired Pizza", "Trout Fish", "Espresso", "Pesto Pasta"],
        geometry: { type: "Point", coordinates: [77.1795, 32.2530] },
        image: { url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Johnson's Cafe & Bar",
        destinationName: "Manali",
        location: "Circuit House Road, Siyal, Manali",
        description: "Classic European alpine restaurant situated in charming lush gardens. World-famous for local Himalayan pan-fried trout fish and cider.",
        cuisine: ["Continental", "European", "Seafood"],
        averagePrice: 850,
        budgetCategory: "HIGH",
        rating: 4.7,
        openingHours: "10:00 AM - 11:30 PM",
        specialties: ["Grilled Mountain Trout", "Apple Pie", "Cocktails"],
        geometry: { type: "Point", coordinates: [77.1870, 32.2430] },
        image: { url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Chopsticks Restaurant",
        destinationName: "Manali",
        location: "Mall Road, Manali",
        description: "Beloved traditional eatery serving comforting Tibetan steamed momos, piping hot thukpa noodle soup, and Chinese delicacies.",
        cuisine: ["Tibetan", "Asian", "Street Food"],
        averagePrice: 280,
        budgetCategory: "LOW",
        rating: 4.6,
        openingHours: "10:00 AM - 10:00 PM",
        specialties: ["Steamed Momos", "Thukpa Soup", "Gyathuk Noodles"],
        geometry: { type: "Point", coordinates: [77.1890, 32.2398] },
        image: { url: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "The Lazy Dog Lounge",
        destinationName: "Manali",
        location: "Manu Temple Road, Old Manali",
        description: "Relaxed riverside lounge with outdoor wooden decks, craft burgers, sushi rolls, and panoramic Himalayan pine views.",
        cuisine: ["Continental", "Finger Food", "Cafe"],
        averagePrice: 650,
        budgetCategory: "MEDIUM",
        rating: 4.7,
        openingHours: "11:00 AM - 11:00 PM",
        specialties: ["Gourmet Burgers", "Smoothie Bowls", "Craft Beer"],
        geometry: { type: "Point", coordinates: [77.1780, 32.2540] },
        image: { url: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=60" }
    },
    // Goa
    {
        name: "Fisherman's Wharf",
        destinationName: "Goa",
        location: "Mobor Beach, Cavelossim, South Goa",
        description: "Riverside fine dining offering authentic Goan fish curry, butter garlic prawns, and live coastal music.",
        cuisine: ["Seafood", "Goan", "Indian"],
        averagePrice: 800,
        budgetCategory: "HIGH",
        rating: 4.8,
        openingHours: "12:00 PM - 11:00 PM",
        specialties: ["Goan Prawn Curry", "Crab Xec Xec", "Bebinca"],
        geometry: { type: "Point", coordinates: [73.9350, 15.1550] },
        image: { url: "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Gunpowder",
        destinationName: "Goa",
        location: "Assagao, North Goa",
        description: "Charming heritage bungalow serving flavorsome peninsular South Indian and coastal recipes in an open-air courtyard.",
        cuisine: ["South Indian", "Coastal"],
        averagePrice: 650,
        budgetCategory: "MEDIUM",
        rating: 4.7,
        openingHours: "12:00 PM - 11:00 PM",
        specialties: ["Kerala Beef Fry", "Appam with Stew", "Pandhi Curry"],
        geometry: { type: "Point", coordinates: [73.7650, 15.5900] },
        image: { url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=60" }
    },
    // Jaipur
    {
        name: "Chokhi Dhani Heritage Restaurant",
        destinationName: "Jaipur",
        location: "12 Miles, Tonk Road, Jaipur",
        description: "An immersive royal ethnic village offering grand traditional Rajasthani Dal Baati Churma thalis served with traditional folk hospitality.",
        cuisine: ["North Indian", "Rajasthani"],
        averagePrice: 950,
        budgetCategory: "HIGH",
        rating: 4.8,
        openingHours: "05:00 PM - 11:00 PM",
        specialties: ["Dal Baati Churma", "Gatte ki Sabzi", "Ker Sangri"],
        geometry: { type: "Point", coordinates: [75.8200, 26.7800] },
        image: { url: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Laxmi Mishthan Bhandar (LMB)",
        destinationName: "Jaipur",
        location: "Johari Bazaar, Old Pink City, Jaipur",
        description: "Century-old legendary restaurant and sweet shop in the heart of the Pink City known for Pyaz Kachori and Ghewar.",
        cuisine: ["Street Food", "North Indian", "Sweets"],
        averagePrice: 300,
        budgetCategory: "LOW",
        rating: 4.6,
        openingHours: "08:00 AM - 10:30 PM",
        specialties: ["Pyaaz Kachori", "Paneer Ghewar", "Raj Kachori"],
        geometry: { type: "Point", coordinates: [75.8240, 26.9200] },
        image: { url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=60" }
    }
];

const sampleAttractions = [
    // Manali
    {
        name: "Hidimba Devi Temple",
        destinationName: "Manali",
        location: "Dhungri Forest, Old Manali",
        description: "Ancient 16th-century four-tiered wooden pagoda temple built around a natural cave sanctuary, surrounded by towering cedar trees.",
        category: "Spiritual",
        entryFee: 0,
        openingHours: "08:00 AM - 06:00 PM",
        estimatedVisitDuration: 60,
        bestTimeOfDay: "Morning",
        rating: 4.7,
        geometry: { type: "Point", coordinates: [77.1788, 32.2483] },
        image: { url: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Solang Valley",
        destinationName: "Manali",
        location: "Solang Valley, Vashisht, Manali",
        description: "Famed mountain valley offering world-class views of glaciers and snow peaks. Hub for paragliding, skiing, zorbing, and ropeways.",
        category: "Scenic",
        entryFee: 0,
        openingHours: "09:00 AM - 05:30 PM",
        estimatedVisitDuration: 180,
        bestTimeOfDay: "Morning",
        rating: 4.8,
        geometry: { type: "Point", coordinates: [77.1578, 32.3166] },
        image: { url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Mall Road Manali",
        destinationName: "Manali",
        location: "City Center, Manali",
        description: "The bustling pedestrian heart of Manali lined with wooden shops selling Kashmiri shawls, Himachali caps, wooden handicrafts, and street delicacies.",
        category: "Cultural",
        entryFee: 0,
        openingHours: "10:00 AM - 10:00 PM",
        estimatedVisitDuration: 90,
        bestTimeOfDay: "Evening",
        rating: 4.5,
        geometry: { type: "Point", coordinates: [77.1887, 32.2396] },
        image: { url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Vashisht Hot Water Springs & Temple",
        destinationName: "Manali",
        location: "Vashisht Village, Manali",
        description: "4000-year-old historic stone temple honoring Sage Vashisht, renowned for therapeutic natural sulfur hot springs baths.",
        category: "Spiritual",
        entryFee: 0,
        openingHours: "07:00 AM - 09:00 PM",
        estimatedVisitDuration: 60,
        bestTimeOfDay: "Morning",
        rating: 4.6,
        geometry: { type: "Point", coordinates: [77.1993, 32.2612] },
        image: { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=60" }
    },
    // Goa
    {
        name: "Aguada Fort & Lighthouse",
        destinationName: "Goa",
        location: "Sinquerim Beach, Candolim, North Goa",
        description: "A well-preserved 17th-century Portuguese fortress and historic 4-storey lighthouse overlooking the vast Arabian Sea.",
        category: "Historical",
        entryFee: 50,
        openingHours: "09:00 AM - 06:00 PM",
        estimatedVisitDuration: 90,
        bestTimeOfDay: "Evening",
        rating: 4.6,
        geometry: { type: "Point", coordinates: [73.7736, 15.4925] },
        image: { url: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Basilica of Bom Jesus",
        destinationName: "Goa",
        location: "Old Goa Road, Bainguinim",
        description: "UNESCO World Heritage Baroque landmark holding the mortal sacred remains of St. Francis Xavier.",
        category: "Historical",
        entryFee: 0,
        openingHours: "09:00 AM - 06:30 PM",
        estimatedVisitDuration: 60,
        bestTimeOfDay: "Morning",
        rating: 4.7,
        geometry: { type: "Point", coordinates: [73.9118, 15.5009] },
        image: { url: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=60" }
    },
    // Jaipur
    {
        name: "Amber Palace & Fort",
        destinationName: "Jaipur",
        location: "Devisinghpura, Amer, Jaipur",
        description: "Magnificent hilltop fortress blending Rajput and Mughal architecture with the world-famous Sheesh Mahal (Mirror Palace).",
        category: "Historical",
        entryFee: 200,
        openingHours: "08:00 AM - 05:30 PM",
        estimatedVisitDuration: 180,
        bestTimeOfDay: "Morning",
        rating: 4.9,
        geometry: { type: "Point", coordinates: [75.8513, 26.9855] },
        image: { url: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Hawa Mahal (Palace of Winds)",
        destinationName: "Jaipur",
        location: "Hawa Mahal Rd, Badi Choupad, Jaipur",
        description: "Iconic five-story pink sandstone palace constructed with 953 intricate honeycomb jharokhas to allow royal ladies to watch street festivals unseen.",
        category: "Architecture",
        entryFee: 50,
        openingHours: "09:00 AM - 05:00 PM",
        estimatedVisitDuration: 60,
        bestTimeOfDay: "Morning",
        rating: 4.7,
        geometry: { type: "Point", coordinates: [75.8267, 26.9239] },
        image: { url: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=60" }
    }
];

const sampleActivities = [
    // Manali
    {
        name: "Solang Valley Paragliding Flight",
        destinationName: "Manali",
        category: "Adventure",
        description: "Soar like an eagle across snow-capped alpine peaks with certified tandem flight instructors from heights up to 2,000 feet.",
        estimatedCost: 2200,
        duration: 90,
        budgetCategory: "MEDIUM",
        suitableTimeOfDay: "Morning",
        location: "Solang Valley, Manali",
        rating: 4.9,
        geometry: { type: "Point", coordinates: [77.1578, 32.3166] },
        image: { url: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Beas River White Water Rafting",
        destinationName: "Manali",
        category: "Adventure",
        description: "Tackle Grade II and III rapids along a scenic 14-km stretch of the rushing Beas River with professional safety gear.",
        estimatedCost: 1400,
        duration: 120,
        budgetCategory: "MEDIUM",
        suitableTimeOfDay: "Afternoon",
        location: "Pirdi, Kullu-Manali Highway",
        rating: 4.8,
        geometry: { type: "Point", coordinates: [77.1650, 32.1850] },
        image: { url: "https://images.unsplash.com/photo-1533619239233-6280475a633a?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Old Manali Cafe Hopping & Culture Walk",
        destinationName: "Manali",
        category: "Food",
        description: "Guided relaxed walking tour tasting Himalayan herbal teas, apple pies, yak cheese, and visiting traditional wooden Kath Kuni houses.",
        estimatedCost: 450,
        duration: 120,
        budgetCategory: "LOW",
        suitableTimeOfDay: "Evening",
        location: "Old Manali Village",
        rating: 4.7,
        geometry: { type: "Point", coordinates: [77.1785, 32.2520] },
        image: { url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Jogini Waterfall Forest Trek",
        destinationName: "Manali",
        category: "Nature",
        description: "Scenic pine trail hike passing through Vashisht village leading to the cascading Jogini Falls.",
        estimatedCost: 300,
        duration: 150,
        budgetCategory: "LOW",
        suitableTimeOfDay: "Morning",
        location: "Vashisht to Jogini Falls Trail",
        rating: 4.8,
        geometry: { type: "Point", coordinates: [77.1985, 32.2710] },
        image: { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=60" }
    },
    // Goa
    {
        name: "Grande Island Scuba Diving & Dolphin Sight",
        destinationName: "Goa",
        category: "Adventure",
        description: "Boat cruise to Grande Island featuring supervised PADI scuba diving among coral reefs and spotting playful dolphins.",
        estimatedCost: 2800,
        duration: 240,
        budgetCategory: "HIGH",
        suitableTimeOfDay: "Morning",
        location: "Grande Island, Vasco da Gama",
        rating: 4.9,
        geometry: { type: "Point", coordinates: [73.7500, 15.4000] },
        image: { url: "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Sunset Catamaran Cruise on Mandovi",
        destinationName: "Goa",
        category: "Relaxation",
        description: "Chilled luxury sailing experience along the Mandovi river mouth with drinks, snacks, and spectacular coastal sunset views.",
        estimatedCost: 1200,
        duration: 90,
        budgetCategory: "MEDIUM",
        suitableTimeOfDay: "Evening",
        location: "Panaji Jetty, Goa",
        rating: 4.7,
        geometry: { type: "Point", coordinates: [73.8300, 15.5000] },
        image: { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=60" }
    },
    // Jaipur
    {
        name: "Sunrise Hot Air Balloon Safari",
        destinationName: "Jaipur",
        category: "Adventure",
        description: "Glide silently over royal Aravalli forts, desert villages, and lake palaces as morning sun lights up Rajasthan.",
        estimatedCost: 7500,
        duration: 180,
        budgetCategory: "HIGH",
        suitableTimeOfDay: "Morning",
        location: "Kukas, Near Amber Fort",
        rating: 4.9,
        geometry: { type: "Point", coordinates: [75.8500, 26.9900] },
        image: { url: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?auto=format&fit=crop&w=800&q=60" }
    },
    {
        name: "Pink City Bazaars & Textile Heritage Walk",
        destinationName: "Jaipur",
        category: "Shopping",
        description: "Curated walking tour through Johari, Bapu, and Tripolia bazaars for block printing, authentic silver jewelry, and blue pottery.",
        estimatedCost: 350,
        duration: 120,
        budgetCategory: "LOW",
        suitableTimeOfDay: "Evening",
        location: "Johari Bazaar, Jaipur",
        rating: 4.6,
        geometry: { type: "Point", coordinates: [75.8260, 26.9210] },
        image: { url: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=60" }
    }
];

async function seedTravelData() {
    try {
        await mongoose.connect(dbUrl);
        console.log("Connected to MongoDB for Travel Data Seeding.");

        // Build destination map
        const destinations = await Destination.find({});
        const destMap = {};
        for (let d of destinations) {
            destMap[d.name.toLowerCase()] = d;
        }

        // Seed Restaurants
        for (let rest of sampleRestaurants) {
            const dest = destMap[rest.destinationName.toLowerCase()];
            if (dest) rest.destination = dest._id;

            await Restaurant.findOneAndUpdate(
                { name: rest.name, destinationName: rest.destinationName },
                rest,
                { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
            );
            console.log(`✓ Seeded Restaurant: ${rest.name} (${rest.destinationName})`);
        }

        // Seed Attractions
        for (let attr of sampleAttractions) {
            const dest = destMap[attr.destinationName.toLowerCase()];
            if (dest) attr.destination = dest._id;

            await Attraction.findOneAndUpdate(
                { name: attr.name, destinationName: attr.destinationName },
                attr,
                { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
            );
            console.log(`✓ Seeded Attraction: ${attr.name} (${attr.destinationName})`);
        }

        // Seed Activities
        for (let act of sampleActivities) {
            const dest = destMap[act.destinationName.toLowerCase()];
            if (dest) act.destination = dest._id;

            await Activity.findOneAndUpdate(
                { name: act.name, destinationName: act.destinationName },
                act,
                { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
            );
            console.log(`✓ Seeded Activity: ${act.name} (${act.destinationName})`);
        }

        console.log("\nAll Restaurants, Attractions, and Activities successfully seeded!");
    } catch (err) {
        console.error("Error seeding travel data:", err);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.");
    }
}

seedTravelData();
