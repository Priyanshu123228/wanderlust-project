const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const Destination = require("../models/destination.js");
const destinationData = require("./destinationData.js");

const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust";


async function main() {
    await mongoose.connect(dbUrl);
    console.log("Connected to MongoDB for Destination Seeding");
}

const seedDestinations = async () => {
    try {
        await main();

        for (let item of destinationData.data) {
            await Destination.findOneAndUpdate(
                { name: item.name },
                item,
                { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
            );
            console.log(`✓ Seeded Destination: ${item.name}`);
        }

        console.log("\nAll destinations successfully seeded!");
    } catch (err) {
        console.error("Error seeding destinations:", err);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.");
    }
};

seedDestinations();
