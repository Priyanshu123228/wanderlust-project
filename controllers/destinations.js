const Destination = require("../models/destination.js");
const Listing = require("../models/listing.js");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mapToken ? mbxGeocoding({ accessToken: mapToken }) : null;

// List all destinations
module.exports.index = async (req, res) => {
    let { q, interest } = req.query;
    let filter = {};

    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: "i" } },
            { location: { $regex: q, $options: "i" } }
        ];
    }

    if (interest && interest !== "All") {
        filter.popularInterests = { $in: [new RegExp(interest, "i")] };
    }

    const allDestinations = await Destination.find(filter).sort({ featured: -1, name: 1 });
    res.render("destinations/index.ejs", { allDestinations, q, selectedInterest: interest || "All" });
};

// Render form to create new destination
module.exports.renderNewForm = (req, res) => {
    res.render("destinations/new.ejs");
};

// Show details of a destination
module.exports.showDestination = async (req, res) => {
    const { id } = req.params;
    const destination = await Destination.findById(id);

    if (!destination) {
        req.flash("error", "Destination you requested does not exist!");
        return res.redirect("/destinations");
    }

    // Fetch stays matching this destination name or location regex
    const stays = await Listing.find({
        $or: [
            { destination: destination._id },
            { location: { $regex: destination.name, $options: "i" } }
        ]
    }).limit(6);

    res.render("destinations/show.ejs", { destination, stays, mapToken });
};

// Create new destination
module.exports.createDestination = async (req, res) => {
    let geometry = { type: "Point", coordinates: [77.1892, 32.2432] };

    if (geocodingClient && req.body.destination.location) {
        try {
            let response = await geocodingClient.forwardGeocode({
                query: `${req.body.destination.name}, ${req.body.destination.location}`,
                limit: 1
            }).send();
            if (response.body.features && response.body.features.length > 0) {
                geometry = response.body.features[0].geometry;
            }
        } catch (err) {
            console.log("Geocoding failed, using default coordinates:", err.message);
        }
    }

    const newDestination = new Destination(req.body.destination);
    newDestination.geometry = geometry;

    if (req.file) {
        newDestination.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    if (typeof req.body.destination.popularInterests === "string") {
        newDestination.popularInterests = req.body.destination.popularInterests
            .split(",")
            .map(i => i.trim())
            .filter(i => i.length > 0);
    }

    await newDestination.save();
    req.flash("success", `Destination "${newDestination.name}" added successfully!`);
    res.redirect(`/destinations/${newDestination._id}`);
};

// Render Edit form
module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const destination = await Destination.findById(id);

    if (!destination) {
        req.flash("error", "Destination not found!");
        return res.redirect("/destinations");
    }

    res.render("destinations/edit.ejs", { destination });
};

// Update destination
module.exports.updateDestination = async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body.destination };

    if (typeof updateData.popularInterests === "string") {
        updateData.popularInterests = updateData.popularInterests
            .split(",")
            .map(i => i.trim())
            .filter(i => i.length > 0);
    }

    const destination = await Destination.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });

    if (req.file) {
        destination.image = {
            url: req.file.path,
            filename: req.file.filename
        };
        await destination.save();
    }

    req.flash("success", "Destination updated successfully!");
    res.redirect(`/destinations/${id}`);
};

// Delete destination
module.exports.destroyDestination = async (req, res) => {
    const { id } = req.params;
    await Destination.findByIdAndDelete(id);
    req.flash("success", "Destination deleted successfully!");
    res.redirect("/destinations");
};
