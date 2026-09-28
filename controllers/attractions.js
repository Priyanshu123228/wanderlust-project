const Attraction = require("../models/attraction.js");
const Destination = require("../models/destination.js");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mapToken ? mbxGeocoding({ accessToken: mapToken }) : null;

module.exports.index = async (req, res) => {
    let { destination, category, q } = req.query;
    let filter = {};

    if (destination && destination !== "All") {
        filter.destinationName = { $regex: destination, $options: "i" };
    }

    if (category && category !== "All") {
        filter.category = category;
    }

    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: "i" } },
            { location: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } }
        ];
    }

    const allAttractions = await Attraction.find(filter).sort({ rating: -1 });
    const allDestinations = await Destination.find({}).sort({ name: 1 });

    res.render("attractions/index.ejs", {
        allAttractions,
        allDestinations,
        selectedDestination: destination || "All",
        selectedCategory: category || "All",
        q: q || ""
    });
};

module.exports.renderNewForm = async (req, res) => {
    const allDestinations = await Destination.find({}).sort({ name: 1 });
    res.render("attractions/new.ejs", { allDestinations });
};

module.exports.showAttraction = async (req, res) => {
    const { id } = req.params;
    const attraction = await Attraction.findById(id).populate("destination");

    if (!attraction) {
        req.flash("error", "Attraction requested does not exist!");
        return res.redirect("/attractions");
    }

    res.render("attractions/show.ejs", { attraction, mapToken });
};

module.exports.createAttraction = async (req, res) => {
    let geometry = { type: "Point", coordinates: [77.1892, 32.2432] };

    if (geocodingClient && req.body.attraction.location) {
        try {
            let response = await geocodingClient.forwardGeocode({
                query: `${req.body.attraction.name}, ${req.body.attraction.location}`,
                limit: 1
            }).send();
            if (response.body.features && response.body.features.length > 0) {
                geometry = response.body.features[0].geometry;
            }
        } catch (err) {
            console.log("Geocoding failed:", err.message);
        }
    }

    const attrData = { ...req.body.attraction };
    attrData.geometry = geometry;

    if (attrData.destination) {
        const dest = await Destination.findById(attrData.destination);
        if (dest) attrData.destinationName = dest.name;
    }

    if (req.file) {
        attrData.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    const newAttraction = new Attraction(attrData);
    await newAttraction.save();
    req.flash("success", `Attraction "${newAttraction.name}" added successfully!`);
    res.redirect(`/attractions/${newAttraction._id}`);
};

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const attraction = await Attraction.findById(id);
    if (!attraction) {
        req.flash("error", "Attraction not found!");
        return res.redirect("/attractions");
    }
    const allDestinations = await Destination.find({}).sort({ name: 1 });
    res.render("attractions/edit.ejs", { attraction, allDestinations });
};

module.exports.updateAttraction = async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body.attraction };

    if (updateData.destination) {
        const dest = await Destination.findById(updateData.destination);
        if (dest) updateData.destinationName = dest.name;
    }

    const attraction = await Attraction.findByIdAndUpdate(id, updateData, { returnDocument: "after" });

    if (req.file) {
        attraction.image = {
            url: req.file.path,
            filename: req.file.filename
        };
        await attraction.save();
    }

    req.flash("success", "Attraction updated successfully!");
    res.redirect(`/attractions/${id}`);
};

module.exports.destroyAttraction = async (req, res) => {
    const { id } = req.params;
    await Attraction.findByIdAndDelete(id);
    req.flash("success", "Attraction deleted successfully!");
    res.redirect("/attractions");
};
