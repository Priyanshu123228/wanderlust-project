const Restaurant = require("../models/restaurant.js");
const Destination = require("../models/destination.js");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mapToken ? mbxGeocoding({ accessToken: mapToken }) : null;

module.exports.index = async (req, res) => {
    let { destination, cuisine, budget, q } = req.query;
    let filter = {};

    if (destination && destination !== "All") {
        filter.destinationName = { $regex: destination, $options: "i" };
    }

    if (cuisine && cuisine !== "All") {
        filter.cuisine = { $in: [new RegExp(cuisine, "i")] };
    }

    if (budget && budget !== "All") {
        filter.budgetCategory = budget.toUpperCase();
    }

    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: "i" } },
            { location: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } }
        ];
    }

    const allRestaurants = await Restaurant.find(filter).sort({ rating: -1 });
    const allDestinations = await Destination.find({}).sort({ name: 1 });

    res.render("restaurants/index.ejs", {
        allRestaurants,
        allDestinations,
        selectedDestination: destination || "All",
        selectedCuisine: cuisine || "All",
        selectedBudget: budget || "All",
        q: q || ""
    });
};

module.exports.renderNewForm = async (req, res) => {
    const allDestinations = await Destination.find({}).sort({ name: 1 });
    res.render("restaurants/new.ejs", { allDestinations });
};

module.exports.showRestaurant = async (req, res) => {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id).populate("destination");

    if (!restaurant) {
        req.flash("error", "Restaurant requested does not exist!");
        return res.redirect("/restaurants");
    }

    res.render("restaurants/show.ejs", { restaurant, mapToken });
};

module.exports.createRestaurant = async (req, res) => {
    let geometry = { type: "Point", coordinates: [77.1892, 32.2432] };

    if (geocodingClient && req.body.restaurant.location) {
        try {
            let response = await geocodingClient.forwardGeocode({
                query: `${req.body.restaurant.name}, ${req.body.restaurant.location}`,
                limit: 1
            }).send();
            if (response.body.features && response.body.features.length > 0) {
                geometry = response.body.features[0].geometry;
            }
        } catch (err) {
            console.log("Geocoding failed:", err.message);
        }
    }

    const restData = { ...req.body.restaurant };
    restData.geometry = geometry;

    if (typeof restData.cuisine === "string") {
        restData.cuisine = restData.cuisine.split(",").map(c => c.trim()).filter(Boolean);
    }

    if (typeof restData.specialties === "string") {
        restData.specialties = restData.specialties.split(",").map(s => s.trim()).filter(Boolean);
    }

    if (restData.destination) {
        const dest = await Destination.findById(restData.destination);
        if (dest) restData.destinationName = dest.name;
    }

    if (req.file) {
        restData.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    const newRestaurant = new Restaurant(restData);
    await newRestaurant.save();
    req.flash("success", `Restaurant "${newRestaurant.name}" added successfully!`);
    res.redirect(`/restaurants/${newRestaurant._id}`);
};

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
        req.flash("error", "Restaurant not found!");
        return res.redirect("/restaurants");
    }
    const allDestinations = await Destination.find({}).sort({ name: 1 });
    res.render("restaurants/edit.ejs", { restaurant, allDestinations });
};

module.exports.updateRestaurant = async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body.restaurant };

    if (typeof updateData.cuisine === "string") {
        updateData.cuisine = updateData.cuisine.split(",").map(c => c.trim()).filter(Boolean);
    }

    if (typeof updateData.specialties === "string") {
        updateData.specialties = updateData.specialties.split(",").map(s => s.trim()).filter(Boolean);
    }

    if (updateData.destination) {
        const dest = await Destination.findById(updateData.destination);
        if (dest) updateData.destinationName = dest.name;
    }

    const restaurant = await Restaurant.findByIdAndUpdate(id, updateData, { returnDocument: "after" });

    if (req.file) {
        restaurant.image = {
            url: req.file.path,
            filename: req.file.filename
        };
        await restaurant.save();
    }

    req.flash("success", "Restaurant updated successfully!");
    res.redirect(`/restaurants/${id}`);
};

module.exports.destroyRestaurant = async (req, res) => {
    const { id } = req.params;
    await Restaurant.findByIdAndDelete(id);
    req.flash("success", "Restaurant deleted successfully!");
    res.redirect("/restaurants");
};
