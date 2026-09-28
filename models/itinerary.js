const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const itineraryDaySchema = new Schema({
    dayNumber: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        default: function() { return `Day ${this.dayNumber}`; }
    },
    morning: {
        type: { type: String, default: "Attraction" },
        attraction: { type: Schema.Types.ObjectId, ref: "Attraction" },
        activity: { type: Schema.Types.ObjectId, ref: "Activity" },
        title: String,
        description: String,
        location: String,
        coordinates: [Number],
        time: { type: String, default: "09:00 AM - 12:30 PM" },
        estimatedCost: { type: Number, default: 0 }
    },
    lunch: {
        restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant" },
        title: String,
        cuisine: String,
        location: String,
        coordinates: [Number],
        time: { type: String, default: "01:00 PM - 02:30 PM" },
        estimatedCost: { type: Number, default: 400 }
    },
    afternoon: {
        type: { type: String, default: "Activity" },
        attraction: { type: Schema.Types.ObjectId, ref: "Attraction" },
        activity: { type: Schema.Types.ObjectId, ref: "Activity" },
        title: String,
        description: String,
        location: String,
        coordinates: [Number],
        time: { type: String, default: "03:00 PM - 05:30 PM" },
        estimatedCost: { type: Number, default: 0 }
    },
    evening: {
        type: { type: String, default: "Attraction" },
        attraction: { type: Schema.Types.ObjectId, ref: "Attraction" },
        activity: { type: Schema.Types.ObjectId, ref: "Activity" },
        title: String,
        description: String,
        location: String,
        coordinates: [Number],
        time: { type: String, default: "06:00 PM - 08:00 PM" },
        estimatedCost: { type: Number, default: 0 }
    },
    dinner: {
        restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant" },
        title: String,
        cuisine: String,
        location: String,
        coordinates: [Number],
        time: { type: String, default: "08:30 PM - 10:00 PM" },
        estimatedCost: { type: Number, default: 500 }
    },
    nightStay: {
        listing: { type: Schema.Types.ObjectId, ref: "Listing" },
        title: String,
        location: String,
        pricePerNight: { type: Number, default: 3500 }
    }
}, { _id: true });

const itinerarySchema = new Schema({
    title: {
        type: String,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    destination: {
        type: Schema.Types.ObjectId,
        ref: "Destination"
    },
    destinationName: {
        type: String,
        required: true
    },
    durationDays: {
        type: Number,
        required: true,
        min: 1,
        max: 14
    },
    numTravelers: {
        type: Number,
        default: 2,
        min: 1,
        max: 20
    },
    budgetTier: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH"],
        default: "MEDIUM"
    },
    interests: [
        {
            type: String
        }
    ],
    selectedStay: {
        type: Schema.Types.ObjectId,
        ref: "Listing"
    },
    dailyPlan: [itineraryDaySchema],
    costBreakdown: {
        stayTotal: { type: Number, default: 0 },
        foodTotal: { type: Number, default: 0 },
        activitiesTotal: { type: Number, default: 0 },
        entryFeesTotal: { type: Number, default: 0 },
        estimatedTransportation: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 }
    },
    customNotes: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["Draft", "Planned", "Completed"],
        default: "Planned"
    }
}, { timestamps: true });

const Itinerary = mongoose.model("Itinerary", itinerarySchema);
module.exports = Itinerary;
