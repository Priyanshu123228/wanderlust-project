const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const activitySchema = new Schema({
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
    category: {
        type: String,
        enum: ["Adventure", "Nature", "Food", "Shopping", "Historical", "Relaxation", "Culture"],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    estimatedCost: {
        type: Number,
        required: true // In INR per person
    },
    duration: {
        type: Number, // In minutes (e.g. 60, 120, 180, 240)
        default: 120
    },
    budgetCategory: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH"],
        default: function() {
            if (this.estimatedCost <= 500) return "LOW";
            if (this.estimatedCost <= 2500) return "MEDIUM";
            return "HIGH";
        }
    },
    suitableTimeOfDay: {
        type: String,
        enum: ["Morning", "Afternoon", "Evening", "Night", "Anytime"],
        default: "Afternoon"
    },
    location: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        default: 4.7,
        min: 1,
        max: 5
    },
    image: {
        filename: {
            type: String,
            default: "activityimage"
        },
        url: {
            type: String,
            default: "https://images.unsplash.com/photo-1533619239233-6280475a633a",
            set: (v) => (!v ? "https://images.unsplash.com/photo-1533619239233-6280475a633a" : v)
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

const Activity = mongoose.model("Activity", activitySchema);
module.exports = Activity;
