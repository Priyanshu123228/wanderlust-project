const mongoose = require("mongoose");
const Review = require("./review.js");

const listingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: String,

    image: {
        filename: {
            type: String,
            default: "listingimage"
        },
        url: {
            type: String,
            default: "https://images.unsplash.com/photo-1761839256951-10c4468c3621",
            set: (v) => (!v ? "https://images.unsplash.com/default-image" : v),
        }
    },

    price: Number,
    location: String,
    country: String,
    destination: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Destination"
    },
    destinationName: {
        type: String
    },
    stayType: {
        type: String,
        enum: ["Hotel", "Resort", "Villa", "Homestay", "Hostel", "Cabin", "Apartment"],
        default: "Hotel"
    },
    budgetCategory: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH"],
        default: "MEDIUM"
    },
    amenities: [
        {
            type: String
        }
    ],
    rating: {
        type: Number,
        default: 4.5,
        min: 1,
        max: 5
    },
    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    geometry: {
        type: {
            type: String,
            enum: ["Point"],
            required: true,
            default: "Point"
        },

        coordinates: {
            type: [Number],
            required: true,
            default: [77.1892, 32.2432]
        }
    }
});

// Virtual for pricePerNight
listingSchema.virtual("pricePerNight").get(function() {
    return this.price;
});

//mongoose post middleware
listingSchema.post("findOneAndDelete", async (listing) => {
    if (listing && listing.reviews && listing.reviews.length > 0) {
        await Review.deleteMany({ _id: { $in: listing.reviews } });
    }
});


const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;