const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const destinationSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    tagline: {
        type: String,
        default: "Discover unforgettable places, sights, and experiences."
    },
    description: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true // e.g. "Himachal Pradesh, India"
    },
    country: {
        type: String,
        default: "India"
    },
    image: {
        filename: {
            type: String,
            default: "destinationimage"
        },
        url: {
            type: String,
            default: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
            set: (v) => (!v ? "https://images.unsplash.com/photo-1506744038136-46273834b3fb" : v)
        }
    },
    geometry: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            default: [77.1892, 32.2432] // Default coordinates
        }
    },
    bestTimeToVisit: {
        type: String,
        default: "October to June"
    },
    climate: {
        type: String,
        default: "Pleasant"
    },
    estimatedBudget: {
        low: { type: Number, default: 1500 }, // Approx cost per day per person in INR
        medium: { type: Number, default: 3500 },
        high: { type: Number, default: 7500 }
    },
    popularInterests: [
        {
            type: String
        }
    ],
    featured: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Destination = mongoose.model("Destination", destinationSchema);
module.exports = Destination;
