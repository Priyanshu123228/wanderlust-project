const mongoose = require("mongoose");
const Itinerary = require("../models/itinerary.js");
const Destination = require("../models/destination.js");
const { generateSmartItinerary } = require("../utils/itineraryAlgorithm.js");
const { getDestinationWeather } = require("../utils/weatherService.js");
const { generateItineraryPdf, sanitizeFilename } = require("../utils/tripPdfGenerator.js");
const mapToken = process.env.MAP_TOKEN;

// Render "Plan Your Trip" Generator Form
module.exports.renderGeneratorForm = async (req, res) => {
    let { destination } = req.query;
    const allDestinations = await Destination.find({}).sort({ name: 1 });
    res.render("itineraries/new.ejs", { allDestinations, prefilledDestination: destination || "" });
};

// Generate and Preview Itinerary
module.exports.generateItinerary = async (req, res) => {
    const { destinationName, durationDays, numTravelers, budgetTier, interests } = req.body;

    if (!destinationName) {
        req.flash("error", "Please select a destination to generate an itinerary.");
        return res.redirect("/itinerary/new");
    }

    let interestsArray = [];
    if (interests) {
        interestsArray = Array.isArray(interests) ? interests : [interests];
    }

    const generatedPlan = await generateSmartItinerary({
        destinationName,
        durationDays: parseInt(durationDays) || 3,
        numTravelers: parseInt(numTravelers) || 2,
        budgetTier: budgetTier || "MEDIUM",
        interests: interestsArray
    });

    res.render("itineraries/preview.ejs", { plan: generatedPlan, mapToken });
};

// Save Generated Itinerary to Authenticated User's Account
module.exports.saveItinerary = async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "Please login to save your customized itinerary!");
        return res.redirect("/login");
    }

    const { planData, customNotes } = req.body;
    let parsedPlan;
    try {
        parsedPlan = typeof planData === "string" ? JSON.parse(planData) : planData;
    } catch (err) {
        req.flash("error", "Failed to parse itinerary data.");
        return res.redirect("/itinerary/new");
    }

    parsedPlan.user = req.user._id;
    if (customNotes) parsedPlan.customNotes = customNotes;

    const newItinerary = new Itinerary(parsedPlan);
    await newItinerary.save();

    req.flash("success", `Trip "${newItinerary.title}" saved successfully to My Trips!`);
    res.redirect(`/itinerary/${newItinerary._id}`);
};

// "My Trips" Dashboard
module.exports.myTrips = async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "Please login to view your saved trips!");
        return res.redirect("/login");
    }

    const userTrips = await Itinerary.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.render("itineraries/index.ejs", { userTrips });
};

// Show Saved Itinerary
module.exports.showItinerary = async (req, res) => {
    const { id } = req.params;
    const itinerary = await Itinerary.findById(id).populate("user").populate("destination");

    if (!itinerary) {
        req.flash("error", "Trip itinerary not found!");
        return res.redirect("/itinerary/my-trips");
    }

    let weather = { available: false, message: "Weather information is currently unavailable." };
    try {
        const destName = itinerary.destinationName || (itinerary.destination ? itinerary.destination.name : null);
        const coordinates = itinerary.destination?.geometry?.coordinates;
        if (destName || coordinates) {
            weather = await getDestinationWeather({ destinationName: destName, coordinates });
        }
    } catch (e) {
        console.error("Error fetching weather in showItinerary:", e.message);
    }

    res.render("itineraries/show.ejs", { itinerary, weather, mapToken });
};

// Render Edit Saved Itinerary Form
module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const itinerary = await Itinerary.findById(id);

    if (!itinerary) {
        req.flash("error", "Trip not found!");
        return res.redirect("/itinerary/my-trips");
    }

    if (!itinerary.user.equals(req.user._id)) {
        req.flash("error", "You do not have permission to edit this trip!");
        return res.redirect(`/itinerary/${id}`);
    }

    res.render("itineraries/edit.ejs", { itinerary });
};

// Update Saved Itinerary
module.exports.updateItinerary = async (req, res) => {
    const { id } = req.params;
    const { title, customNotes, status } = req.body;

    const itinerary = await Itinerary.findById(id);
    if (!itinerary || !itinerary.user.equals(req.user._id)) {
        req.flash("error", "Unauthorized or trip not found!");
        return res.redirect("/itinerary/my-trips");
    }

    if (title) itinerary.title = title;
    if (customNotes !== undefined) itinerary.customNotes = customNotes;
    if (status) itinerary.status = status;

    await itinerary.save();
    req.flash("success", "Trip itinerary updated successfully!");
    res.redirect(`/itinerary/${id}`);
};

// Delete Saved Itinerary
module.exports.destroyItinerary = async (req, res) => {
    const { id } = req.params;
    const itinerary = await Itinerary.findById(id);

    if (!itinerary || !itinerary.user.equals(req.user._id)) {
        req.flash("error", "Unauthorized or trip not found!");
        return res.redirect("/itinerary/my-trips");
    }

    await Itinerary.findByIdAndDelete(id);
    req.flash("success", "Trip deleted successfully.");
    res.redirect("/itinerary/my-trips");
};

// Download Saved Itinerary as a Complete PDF Document
module.exports.downloadItineraryPdf = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash("error", "Invalid trip ID!");
        return res.redirect("/itinerary/my-trips");
    }

    const itinerary = await Itinerary.findById(id).populate("user").populate("destination");

    if (!itinerary) {
        req.flash("error", "Trip itinerary not found!");
        return res.redirect("/itinerary/my-trips");
    }

    // Authorization: User must be the owner of this trip
    if (itinerary.user && (!req.user || !itinerary.user._id.equals(req.user._id))) {
        req.flash("error", "You do not have permission to download this trip!");
        return res.redirect("/itinerary/my-trips");
    }

    try {
        const pdfBuffer = await generateItineraryPdf(itinerary);

        const sanitizedDest = sanitizeFilename(itinerary.destinationName || "Trip");
        const filename = `Wanderlust-${sanitizedDest}-${itinerary.durationDays}-Day-Trip.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (err) {
        console.error("PDF generation failed:", err);
        req.flash("error", "Failed to generate trip PDF. Please try again or use the Print option.");
        res.redirect(`/itinerary/${id}`);
    }
};
