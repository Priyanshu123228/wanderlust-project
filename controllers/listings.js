const Listing = require("../models/listing");
const Destination = require("../models/destination");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mapToken ? mbxGeocoding({ accessToken: mapToken }) : null;

// Helper to determine budget category based on price
function getBudgetCategory(price) {
    if (price <= 2000) return "LOW";
    if (price <= 5500) return "MEDIUM";
    return "HIGH";
}

module.exports.index = async (req, res) => {
    let { destination, budget, stayType, minPrice, maxPrice, q, sort } = req.query;
    let filter = {};

    if (destination && destination !== "All") {
        filter.$or = [
            { location: { $regex: destination, $options: "i" } },
            { destinationName: { $regex: destination, $options: "i" } }
        ];
    }

    if (budget && budget !== "All") {
        filter.budgetCategory = budget.toUpperCase();
    }

    if (stayType && stayType !== "All") {
        filter.stayType = stayType;
    }

    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: "i" } },
            { location: { $regex: q, $options: "i" } },
            { country: { $regex: q, $options: "i" } }
        ];
    }

    let sortOption = { _id: -1 };
    if (sort === "price-low") sortOption = { price: 1 };
    if (sort === "price-high") sortOption = { price: -1 };
    if (sort === "rating") sortOption = { rating: -1 };

    const allListing = await Listing.find(filter).sort(sortOption);
    const allDestinations = await Destination.find({}).sort({ name: 1 });

    res.render("listings/index.ejs", { 
        allListing, 
        allDestinations,
        selectedDestination: destination || "All",
        selectedBudget: budget || "All",
        selectedStayType: stayType || "All",
        q: q || ""
    });
};

module.exports.renderNewForm = async (req, res) => {
    const allDestinations = await Destination.find({}).sort({ name: 1 });
    res.render("listings/new.ejs", { allDestinations });
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            },
        })
        .populate("owner")
        .populate("destination");

    if (!listing) {
        req.flash("error", "Listing you requested does not exist");
        return res.redirect("/listings");
    }
    
    res.render("listings/show.ejs", { listing, mapToken });
};

module.exports.createListing = async (req, res, next) => {
    let geometry = { type: "Point", coordinates: [77.1892, 32.2432] };

    if (geocodingClient && req.body.listing.location) {
        try {
            let response = await geocodingClient.forwardGeocode({
                query: `${req.body.listing.location}, ${req.body.listing.country || 'India'}`,
                limit: 1,
            }).send();
            if (response.body.features && response.body.features.length > 0) {
                geometry = response.body.features[0].geometry;
            }
        } catch (err) {
            console.log("Geocoding failed, using fallback:", err.message);
        }
    }

    const listingData = { ...req.body.listing };

    // Set budget category if not set
    if (!listingData.budgetCategory && listingData.price) {
        listingData.budgetCategory = getBudgetCategory(Number(listingData.price));
    }

    // Process amenities
    if (typeof listingData.amenities === "string") {
        listingData.amenities = listingData.amenities.split(",").map(a => a.trim()).filter(Boolean);
    }

    // Link destination if matching
    if (listingData.destination) {
        const dest = await Destination.findById(listingData.destination);
        if (dest) {
            listingData.destinationName = dest.name;
        }
    }

    const newListings = new Listing(listingData);
    newListings.owner = req.user._id;
    if (req.file) {
        newListings.image = { url: req.file.path, filename: req.file.filename };
    }
    newListings.geometry = geometry;

    await newListings.save();
    req.flash("success", "New Stay Listing created!");
    return res.redirect(`/listings/${newListings._id}`);
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested does not exist");
        return res.redirect("/listings");
    }
    const allDestinations = await Destination.find({}).sort({ name: 1 });
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", { listing, allDestinations, originalImageUrl });
};

module.exports.upadateListing = async (req, res) => {
    let { id } = req.params;
    const updateData = { ...req.body.listing };

    if (!updateData.budgetCategory && updateData.price) {
        updateData.budgetCategory = getBudgetCategory(Number(updateData.price));
    }

    if (typeof updateData.amenities === "string") {
        updateData.amenities = updateData.amenities.split(",").map(a => a.trim()).filter(Boolean);
    }

    if (updateData.destination) {
        const dest = await Destination.findById(updateData.destination);
        if (dest) {
            updateData.destinationName = dest.name;
        }
    }

    let listing = await Listing.findByIdAndUpdate(id, updateData, { returnDocument: "after" });

    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }

    req.flash("success", "Listing updated successfully!");
    return res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    if (!deletedListing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }
    req.flash("success", "Listing Deleted");
    return res.redirect("/listings");
};