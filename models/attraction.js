const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const attractionSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    destination: {
        type: Schema.Types.ObjectId,
        ref: "Destination"
    },
    destinationName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ["Historical", "Spiritual", "Nature", "Scenic", "Cultural", "Viewpoint", "Architecture", "Adventure"],
        default: "Scenic"
    },
    entryFee: {
        type: Number,
        default: 0 // In INR, 0 if free entry
    },
    openingHours: {
        type: String,
        default: "09:00 AM - 06:00 PM"
    },
    estimatedVisitDuration: {
        type: Number, // In minutes (e.g. 60, 90, 120, 180)
        default: 90
    },
    bestTimeOfDay: {
        type: String,
        enum: ["Morning", "Afternoon", "Evening", "Anytime"],
        default: "Morning"
    },
    rating: {
        type: Number,
        default: 4.6,
        min: 1,
        max: 5
    },
    image: {
        filename: {
            type: String,
            default: "attractionimage"
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
            type: [Number], // [lng, lat]
            required: true,
            default: [77.1892, 32.2432]
        }
    }
}, { timestamps: true });

const Attraction = mongoose.model("Attraction", attractionSchema);
module.exports = Attraction;
