const Joi = require("joi");

module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        price: Joi.number().required().min(0),
        country: Joi.string().required(),
        image: Joi.string().allow("", null),
        destination: Joi.string().allow("", null),
        destinationName: Joi.string().allow("", null),
        stayType: Joi.string().valid("Hotel", "Resort", "Villa", "Homestay", "Hostel", "Cabin", "Apartment").allow("", null),
        budgetCategory: Joi.string().valid("LOW", "MEDIUM", "HIGH").allow("", null),
        amenities: Joi.alternatives().try(
            Joi.array().items(Joi.string()),
            Joi.string().allow("", null)
        ).optional(),
        rating: Joi.number().min(1).max(5).allow(null)
    }).required(),
});

module.exports.reviewSchema=Joi.object({
    review:Joi.object({
        rating:Joi.number().required().min(1).max(5),
        comment:Joi.string().required(),
    }).required(),
});

module.exports.destinationSchema = Joi.object({
    destination: Joi.object({
        name: Joi.string().required(),
        tagline: Joi.string().allow("", null),
        description: Joi.string().required(),
        location: Joi.string().required(),
        country: Joi.string().default("India"),
        bestTimeToVisit: Joi.string().allow("", null),
        climate: Joi.string().allow("", null),
        estimatedBudget: Joi.object({
            low: Joi.number().min(0).allow(null),
            medium: Joi.number().min(0).allow(null),
            high: Joi.number().min(0).allow(null)
        }).optional(),
        popularInterests: Joi.alternatives().try(
            Joi.array().items(Joi.string()),
            Joi.string()
        ).optional(),
        image: Joi.string().allow("", null)
    }).required()
});

module.exports.restaurantSchema = Joi.object({
    restaurant: Joi.object({
        name: Joi.string().required(),
        destination: Joi.string().allow("", null),
        destinationName: Joi.string().required(),
        location: Joi.string().required(),
        description: Joi.string().required(),
        cuisine: Joi.alternatives().try(
            Joi.array().items(Joi.string()),
            Joi.string().allow("", null)
        ).optional(),
        averagePrice: Joi.number().min(0).required(),
        budgetCategory: Joi.string().valid("LOW", "MEDIUM", "HIGH").allow("", null),
        rating: Joi.number().min(1).max(5).allow(null),
        openingHours: Joi.string().allow("", null),
        specialties: Joi.alternatives().try(
            Joi.array().items(Joi.string()),
            Joi.string().allow("", null)
        ).optional(),
        image: Joi.string().allow("", null)
    }).required()
});

module.exports.attractionSchema = Joi.object({
    attraction: Joi.object({
        name: Joi.string().required(),
        destination: Joi.string().allow("", null),
        destinationName: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        category: Joi.string().valid("Historical", "Spiritual", "Nature", "Scenic", "Cultural", "Viewpoint", "Architecture", "Adventure").allow("", null),
        entryFee: Joi.number().min(0).default(0),
        openingHours: Joi.string().allow("", null),
        estimatedVisitDuration: Joi.number().min(10).default(90),
        bestTimeOfDay: Joi.string().valid("Morning", "Afternoon", "Evening", "Anytime").allow("", null),
        rating: Joi.number().min(1).max(5).allow(null),
        image: Joi.string().allow("", null)
    }).required()
});

module.exports.activitySchema = Joi.object({
    activity: Joi.object({
        name: Joi.string().required(),
        destination: Joi.string().allow("", null),
        destinationName: Joi.string().required(),
        category: Joi.string().valid("Adventure", "Nature", "Food", "Shopping", "Historical", "Relaxation", "Culture").required(),
        description: Joi.string().required(),
        estimatedCost: Joi.number().min(0).required(),
        duration: Joi.number().min(15).default(120),
        budgetCategory: Joi.string().valid("LOW", "MEDIUM", "HIGH").allow("", null),
        suitableTimeOfDay: Joi.string().valid("Morning", "Afternoon", "Evening", "Night", "Anytime").allow("", null),
        location: Joi.string().required(),
        rating: Joi.number().min(1).max(5).allow(null),
        image: Joi.string().allow("", null)
    }).required()
});