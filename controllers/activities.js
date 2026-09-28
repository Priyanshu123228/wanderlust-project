const Activity = require("../models/activity.js");
const Destination = require("../models/destination.js");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mapToken ? mbxGeocoding({ accessToken: mapToken }) : null;

module.exports.index = async (req, res) => {
    let { destination, category, budget, q } = req.query;
    let filter = {};

    if (destination && destination !== "All") {
        filter.destinationName = { $regex: destination, $options: "i" };
    }

    if (category && category !== "All") {
        filter.category = category;
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

    const allActivities = await Activity.find(filter).sort({ rating: -1 });
    const allDestinations = await Destination.find({}).sort({ name: 1 });

    res.render("activities/index.ejs", {
        allActivities,
        allDestinations,
        selectedDestination: destination || "All",
        selectedCategory: category || "All",
        selectedBudget: budget || "All",
        q: q || ""
    });
};

module.exports.renderNewForm = async (req, res) => {
    const allDestinations = await Destination.find({}).sort({ name: 1 });
    res.render("activities/new.ejs", { allDestinations });
};

module.exports.showActivity = async (req, res) => {
    const { id } = req.params;
    const activity = await Activity.findById(id).populate("destination");

    if (!activity) {
        req.flash("error", "Activity requested does not exist!");
        return res.redirect("/activities");
    }

    res.render("activities/show.ejs", { activity, mapToken });
};

module.exports.createActivity = async (req, res) => {
    let geometry = { type: "Point", coordinates: [77.1892, 32.2432] };

    if (geocodingClient && req.body.activity.location) {
        try {
            let response = await geocodingClient.forwardGeocode({
                query: `${req.body.activity.name}, ${req.body.activity.location}`,
                limit: 1
            }).send();
            if (response.body.features && response.body.features.length > 0) {
                geometry = response.body.features[0].geometry;
            }
        } catch (err) {
            console.log("Geocoding failed:", err.message);
        }
    }

    const actData = { ...req.body.activity };
    actData.geometry = geometry;

    if (actData.destination) {
        const dest = await Destination.findById(actData.destination);
        if (dest) actData.destinationName = dest.name;
    }

    if (req.file) {
        actData.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    const newActivity = new Activity(actData);
    await newActivity.save();
    req.flash("success", `Activity "${newActivity.name}" added successfully!`);
    res.redirect(`/activities/${newActivity._id}`);
};

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const activity = await Activity.findById(id);
    if (!activity) {
        req.flash("error", "Activity not found!");
        return res.redirect("/activities");
    }
    const allDestinations = await Destination.find({}).sort({ name: 1 });
    res.render("activities/edit.ejs", { activity, allDestinations });
};

module.exports.updateActivity = async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body.activity };

    if (updateData.destination) {
        const dest = await Destination.findById(updateData.destination);
        if (dest) updateData.destinationName = dest.name;
    }

    const activity = await Activity.findByIdAndUpdate(id, updateData, { returnDocument: "after" });

    if (req.file) {
        activity.image = {
            url: req.file.path,
            filename: req.file.filename
        };
        await activity.save();
    }

    req.flash("success", "Activity updated successfully!");
    res.redirect(`/activities/${id}`);
};

module.exports.destroyActivity = async (req, res) => {
    const { id } = req.params;
    await Activity.findByIdAndDelete(id);
    req.flash("success", "Activity deleted successfully!");
    res.redirect("/activities");
};
