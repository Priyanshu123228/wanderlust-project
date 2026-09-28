const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");

const Listing = require("../models/listing.js");
const Destination = require("../models/destination.js");

const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust";

const sampleStaysForDestinations = [
    {
        title: "Himalayan Snow View Chalet",
        description: "Wake up to panoramic views of snow-clad Himalayan peaks in Old Manali. Features wooden pine interiors, bonfire patio, and cozy heated bedrooms.",
        image: {
            filename: "stay_manali_1",
            url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=60"
        },
        price: 3800,
        location: "Old Manali, Himachal Pradesh",
        country: "India",
        destinationName: "Manali",
        stayType: "Cabin",
        budgetCategory: "MEDIUM",
        amenities: ["Mountain View", "Free WiFi", "Breakfast Included", "Bonfire", "Heater", "Free Parking"],
        rating: 4.8,
        geometry: { type: "Point", coordinates: [77.1892, 32.2432] }
    },
    {
        title: "Backpacker Riverside Hostel & Cafe",
        description: "Vibrant social hostel right on the banks of Beas river. Co-working lounge, evening acoustic jam sessions, and budget dorm beds.",
        image: {
            filename: "stay_manali_2",
            url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=60"
        },
        price: 950,
        location: "Vashisht, Manali",
        country: "India",
        destinationName: "Manali",
        stayType: "Hostel",
        budgetCategory: "LOW",
        amenities: ["Free High-Speed WiFi", "Cafe & Bar", "River View", "Hot Water", "Common Lounge", "Lockers"],
        rating: 4.6,
        geometry: { type: "Point", coordinates: [77.1990, 32.2610] }
    },
    {
        title: "The Himalayan Royal Grand Resort",
        description: "5-star luxury retreat nestled inside apple orchards. Features heated infinity pool, spa, multi-cuisine gourmet dining, and private jacuzzi suites.",
        image: {
            filename: "stay_manali_3",
            url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=60"
        },
        price: 9500,
        location: "Naggar Road, Manali",
        country: "India",
        destinationName: "Manali",
        stayType: "Resort",
        budgetCategory: "HIGH",
        amenities: ["Heated Swimming Pool", "Luxury Spa", "Mountain View", "Fine Dining", "Airport Shuttle", "Bathtub"],
        rating: 4.9,
        geometry: { type: "Point", coordinates: [77.1750, 32.2250] }
    },
    {
        title: "Sunset Palm Beachfront Villa",
        description: "Step directly onto the golden sands of Anjuna beach. Private plunge pool, Portuguese balcony, and sunset ocean views.",
        image: {
            filename: "stay_goa_1",
            url: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=60"
        },
        price: 8500,
        location: "Anjuna Beach, Goa",
        country: "India",
        destinationName: "Goa",
        stayType: "Villa",
        budgetCategory: "HIGH",
        amenities: ["Private Pool", "Beach Access", "Air Conditioning", "Ocean View", "Kitchen", "Barbecue"],
        rating: 4.9,
        geometry: { type: "Point", coordinates: [73.7434, 15.5808] }
    },
    {
        title: "Tropical Heritage Homestay & Garden",
        description: "Restored Portuguese heritage villa surrounded by lush gardens and coconut groves. Friendly local hosts and homemade Goan breakfast.",
        image: {
            filename: "stay_goa_2",
            url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=60"
        },
        price: 2800,
        location: "Fontainhas, Panaji, Goa",
        country: "India",
        destinationName: "Goa",
        stayType: "Homestay",
        budgetCategory: "MEDIUM",
        amenities: ["Air Conditioning", "Complimentary Breakfast", "Garden", "Free WiFi", "Bicycle Rental"],
        rating: 4.7,
        geometry: { type: "Point", coordinates: [73.8315, 15.4989] }
    },
    {
        title: "Haveli Palace Heritage Hotel",
        description: "Experience authentic royal Rajasthani hospitality inside a 19th-century royal haveli with courtyards, jharokhas, and rooftop fort views.",
        image: {
            filename: "stay_jaipur_1",
            url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=60"
        },
        price: 4200,
        location: "Old Pink City, Jaipur",
        country: "India",
        destinationName: "Jaipur",
        stayType: "Hotel",
        budgetCategory: "MEDIUM",
        amenities: ["Rooftop Restaurant", "Traditional Decor", "Air Conditioning", "Free WiFi", "Courtyard", "Spa"],
        rating: 4.7,
        geometry: { type: "Point", coordinates: [75.8236, 26.9248] }
    },
    {
        title: "Cedar Woods Colonial Retreat",
        description: "Peaceful colonial-era heritage bungalow surrounded by deodar forests near Mall Road.",
        image: {
            filename: "stay_shimla_1",
            url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=60"
        },
        price: 3400,
        location: "Near The Ridge, Shimla",
        country: "India",
        destinationName: "Shimla",
        stayType: "Hotel",
        budgetCategory: "MEDIUM",
        amenities: ["Forest View", "Fireplace", "Breakfast Included", "Free WiFi", "Room Service"],
        rating: 4.6,
        geometry: { type: "Point", coordinates: [77.1734, 31.1048] }
    }
];

async function enrichListings() {
    try {
        await mongoose.connect(dbUrl);
        console.log("Connected to MongoDB for listing enrichment.");

        // Find all destinations
        const destinations = await Destination.find({});
        const destMap = {};
        for (let d of destinations) {
            destMap[d.name.toLowerCase()] = d;
        }

        // Update existing listings with default stayType, budgetCategory, and destination if missing
        const existingListings = await Listing.find({});
        console.log(`Found ${existingListings.length} existing listings.`);

        for (let listing of existingListings) {
            let updated = false;
            
            // Auto budget category
            if (!listing.budgetCategory) {
                if (listing.price <= 2000) listing.budgetCategory = "LOW";
                else if (listing.price <= 5500) listing.budgetCategory = "MEDIUM";
                else listing.budgetCategory = "HIGH";
                updated = true;
            }

            if (!listing.stayType) {
                listing.stayType = "Hotel";
                updated = true;
            }

            if (!listing.amenities || listing.amenities.length === 0) {
                listing.amenities = ["Free WiFi", "Air Conditioning", "Hot Water", "Room Service"];
                updated = true;
            }

            if (!listing.rating) {
                listing.rating = 4.5;
                updated = true;
            }

            // Match location with destination
            if (!listing.destination) {
                for (let destName in destMap) {
                    if (listing.location && listing.location.toLowerCase().includes(destName)) {
                        listing.destination = destMap[destName]._id;
                        listing.destinationName = destMap[destName].name;
                        updated = true;
                        break;
                    }
                }
            }

            if (updated) {
                await listing.save();
            }
        }
        console.log("Updated existing listings with default categories & amenities.");

        // Insert / Upsert sample curated destination stays
        for (let stay of sampleStaysForDestinations) {
            const dest = destMap[stay.destinationName.toLowerCase()];
            if (dest) {
                stay.destination = dest._id;
            }
            
            // Get owner from an existing listing or keep first available
            const sampleListing = await Listing.findOne({});
            if (sampleListing && sampleListing.owner) {
                stay.owner = sampleListing.owner;
            }

            await Listing.findOneAndUpdate(
                { title: stay.title },
                stay,
                { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
            );
            console.log(`✓ Seeded/Updated Stay: ${stay.title} (${stay.destinationName})`);
        }

        console.log("\nListing enrichment completed successfully!");
    } catch (err) {
        console.error("Error enriching listings:", err);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.");
    }
}

enrichListings();
