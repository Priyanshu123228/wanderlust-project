const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const restaurantSchema = new Schema({
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
    location: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    cuisine: [
        {
            type: String
        }
    ],
    averagePrice: {
        type: Number,
        required: true // Approx cost per person in INR
    },
    budgetCategory: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH"],
        default: function() {
            if (this.averagePrice <= 300) return "LOW";
            if (this.averagePrice <= 700) return "MEDIUM";
            return "HIGH";
        }
    },
    rating: {
        type: Number,
        default: 4.5,
        min: 1,
        max: 5
    },
    openingHours: {
        type: String,
        default: "10:00 AM - 10:30 PM"
    },
    image: {
        filename: {
            type: String,
            default: "restaurantimage"
        },
        url: {
            type: String,
            default: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
            set: (v) => (!v ? "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4" : v)
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
    },
    specialties: [
        {
            type: String
        }
    ]
}, { timestamps: true });

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
module.exports = Restaurant;
