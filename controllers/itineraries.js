const mongoose = require("mongoose");
const Itinerary = require("../models/itinerary.js");
const Destination = require("../models/destination.js");
const Attraction = require("../models/attraction.js");
const Activity = require("../models/activity.js");
const Restaurant = require("../models/restaurant.js");
const Listing = require("../models/listing.js");
const { generateSmartItinerary } = require("../utils/itineraryAlgorithm.js");
const { getDestinationWeather } = require("../utils/weatherService.js");
const { generateItineraryPdf, sanitizeFilename } = require("../utils/tripPdfGenerator.js");
const mapToken = process.env.MAP_TOKEN;

const { reverseGeocode, forwardGeocode } = require("../utils/routeService.js");

// Render "Plan Your Trip" Generator Form
module.exports.renderGeneratorForm = async (req, res) => {
    let { destination } = req.query;
    const allDestinations = await Destination.find({}).sort({ name: 1 });
    res.render("itineraries/new.ejs", { allDestinations, prefilledDestination: destination || "" });
};

// API: Reverse Geocode coordinates to place name
module.exports.reverseGeocodeApi = async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ success: false, message: "Latitude and Longitude are required." });
    }
    try {
        const result = await reverseGeocode(parseFloat(lng), parseFloat(lat));
        return res.json({ success: true, location: result });
    } catch (err) {
        console.error("Reverse geocoding API error:", err);
        return res.status(500).json({ success: false, message: "Failed to reverse geocode coordinates." });
    }
};

// Generate and Preview Itinerary
module.exports.generateItinerary = async (req, res) => {
    const {
        fromName,
        fromCoordinates,
        fromLat,
        fromLng,
        destinationName,
        durationDays,
        numTravelers,
        budgetTier,
        interests,
        transportMode,
        startDate,
        endDate
    } = req.body;

    if (!destinationName) {
        req.flash("error", "Please select a destination to generate an itinerary.");
        return res.redirect("/itinerary/new");
    }

    let interestsArray = [];
    if (interests) {
        interestsArray = Array.isArray(interests) ? interests : [interests];
    }

    // Determine starting coordinates if provided via lat/lng or fromCoordinates
    let resolvedFromCoords = null;
    if (fromLat && fromLng && !isNaN(parseFloat(fromLat)) && !isNaN(parseFloat(fromLng))) {
        resolvedFromCoords = [parseFloat(fromLng), parseFloat(fromLat)];
    } else if (fromCoordinates) {
        resolvedFromCoords = fromCoordinates;
    }

    const generatedPlan = await generateSmartItinerary({
        fromName: fromName || "",
        fromCoordinates: resolvedFromCoords,
        destinationName,
        durationDays: parseInt(durationDays) || 3,
        numTravelers: parseInt(numTravelers) || 2,
        budgetTier: budgetTier || "MEDIUM",
        interests: interestsArray,
        transportMode: transportMode || "Car",
        startDate: startDate || "",
        endDate: endDate || ""
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
    let parsedPlan = null;

    if (!planData) {
        req.flash("error", "No itinerary data provided to save.");
        return res.redirect("/itinerary/new");
    }

    if (typeof planData === "object" && planData !== null) {
        parsedPlan = planData;
    } else if (typeof planData === "string") {
        const raw = planData.trim();
        
        // 1. Try Base64 Decoding (Preferred for safe HTML form transmission)
        try {
            const decoded = Buffer.from(raw, "base64").toString("utf-8");
            if (decoded.startsWith("{") && decoded.endsWith("}")) {
                parsedPlan = JSON.parse(decoded);
            }
        } catch (e) {
            // Not Base64, fallback to direct JSON parsing
        }

        // 2. Try Direct JSON.parse
        if (!parsedPlan) {
            try {
                parsedPlan = JSON.parse(raw);
            } catch (e) {
                // 3. Try URI Decoded parse
                try {
                    parsedPlan = JSON.parse(decodeURIComponent(raw));
                } catch (e2) {
                    console.error("Failed to parse planData JSON:", e.message, "Raw snippet:", raw.substring(0, 100));
                }
            }
        }
    }

    if (!parsedPlan || typeof parsedPlan !== "object") {
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

// Public Read-Only Shareable Trip View
module.exports.shareItinerary = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash("error", "Invalid trip link!");
        return res.redirect("/destinations");
    }

    const itinerary = await Itinerary.findById(id).populate("destination");
    if (!itinerary) {
        req.flash("error", "Trip itinerary not found!");
        return res.redirect("/destinations");
    }

    let weather = { available: false, message: "Weather information is currently unavailable." };
    try {
        const destName = itinerary.destinationName || (itinerary.destination ? itinerary.destination.name : null);
        const coordinates = itinerary.destination?.geometry?.coordinates;
        if (destName || coordinates) {
            weather = await getDestinationWeather({ destinationName: destName, coordinates });
        }
    } catch (e) {
        console.error("Error fetching weather for shared itinerary:", e.message);
    }

    res.render("itineraries/show.ejs", { 
        itinerary, 
        weather, 
        mapToken,
        isSharedView: true 
    });
};

// Add Item (Stay, Restaurant, Activity, Attraction) to Itinerary
module.exports.addItemToTrip = async (req, res) => {
    const { id } = req.params;
    const { itemType, itemId, dayNumber, slot } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(itemId)) {
        req.flash("error", "Invalid trip or item ID.");
        return res.redirect("/itinerary/my-trips");
    }

    const itinerary = await Itinerary.findById(id);
    if (!itinerary || !itinerary.user.equals(req.user._id)) {
        req.flash("error", "Trip not found or unauthorized.");
        return res.redirect("/itinerary/my-trips");
    }

    const targetDayIndex = (parseInt(dayNumber) || 1) - 1;
    if (targetDayIndex < 0 || targetDayIndex >= itinerary.dailyPlan.length) {
        req.flash("error", "Selected day is outside trip duration.");
        return res.redirect(`/itinerary/${id}`);
    }

    const targetDay = itinerary.dailyPlan[targetDayIndex];
    let itemName = "Item";

    if (itemType === "Listing") {
        const stay = await Listing.findById(itemId);
        if (stay) {
            itemName = stay.title;
            targetDay.nightStay = {
                listing: stay._id,
                title: stay.title,
                location: stay.location,
                pricePerNight: stay.price || 3500
            };
        }
    } else if (itemType === "Restaurant") {
        const rest = await Restaurant.findById(itemId);
        if (rest) {
            itemName = rest.name;
            const targetSlot = slot === "dinner" ? "dinner" : "lunch";
            targetDay[targetSlot] = {
                restaurant: rest._id,
                title: rest.name,
                cuisine: rest.cuisine ? rest.cuisine.join(", ") : "Local Dining",
                location: rest.location,
                coordinates: rest.geometry?.coordinates || [77.1892, 32.2432],
                time: targetSlot === "dinner" ? "08:30 PM - 10:00 PM" : "01:00 PM - 02:30 PM",
                estimatedCost: rest.averagePrice || 450
            };
        }
    } else if (itemType === "Activity") {
        const act = await Activity.findById(itemId);
        if (act) {
            itemName = act.name;
            targetDay.afternoon = {
                type: "Activity",
                activity: act._id,
                title: act.name,
                description: act.description,
                location: act.location,
                coordinates: act.geometry?.coordinates || [77.1892, 32.2432],
                time: "03:00 PM - 05:30 PM",
                estimatedCost: act.estimatedCost || 1000
            };
        }
    } else if (itemType === "Attraction") {
        const attr = await Attraction.findById(itemId);
        if (attr) {
            itemName = attr.name;
            const targetSlot = slot === "evening" ? "evening" : "morning";
            targetDay[targetSlot] = {
                type: "Attraction",
                attraction: attr._id,
                title: attr.name,
                description: attr.description,
                location: attr.location,
                coordinates: attr.geometry?.coordinates || [77.1892, 32.2432],
                time: targetSlot === "evening" ? "06:00 PM - 08:00 PM" : "09:00 AM - 12:30 PM",
                estimatedCost: attr.entryFee || 0
            };
        }
    }

    // Recalculate cost breakdown
    let totalStay = 0;
    let totalFood = 0;
    let totalAct = 0;
    let totalEntry = 0;

    for (let day of itinerary.dailyPlan) {
        if (day.nightStay?.pricePerNight) totalStay += day.nightStay.pricePerNight;
        if (day.lunch?.estimatedCost) totalFood += day.lunch.estimatedCost * itinerary.numTravelers;
        if (day.dinner?.estimatedCost) totalFood += day.dinner.estimatedCost * itinerary.numTravelers;
        if (day.afternoon?.estimatedCost) totalAct += day.afternoon.estimatedCost * itinerary.numTravelers;
        if (day.morning?.estimatedCost) totalEntry += day.morning.estimatedCost * itinerary.numTravelers;
        if (day.evening?.estimatedCost) totalEntry += day.evening.estimatedCost * itinerary.numTravelers;
    }

    const dailyTransit = itinerary.budgetTier === "LOW" ? 400 : (itinerary.budgetTier === "MEDIUM" ? 900 : 2000);
    const totalTransit = dailyTransit * itinerary.durationDays;

    itinerary.costBreakdown = {
        stayTotal: totalStay,
        foodTotal: totalFood,
        activitiesTotal: totalAct,
        entryFeesTotal: totalEntry,
        estimatedTransportation: totalTransit,
        grandTotal: totalStay + totalFood + totalAct + totalEntry + totalTransit
    };

    await itinerary.save();
    req.flash("success", `Added "${itemName}" to Day ${dayNumber} of your trip!`);
    res.redirect(`/itinerary/${id}`);
};

// Remove Item Slot from an Itinerary Day
module.exports.removeItemFromTrip = async (req, res) => {
    const { id } = req.params;
    const { dayNumber, slot } = req.body;

    const itinerary = await Itinerary.findById(id);
    if (!itinerary || !itinerary.user.equals(req.user._id)) {
        req.flash("error", "Unauthorized or trip not found!");
        return res.redirect("/itinerary/my-trips");
    }

    const dayIndex = (parseInt(dayNumber) || 1) - 1;
    if (dayIndex >= 0 && dayIndex < itinerary.dailyPlan.length) {
        const day = itinerary.dailyPlan[dayIndex];
        if (slot === "afternoon") {
            day.afternoon = {
                type: "Activity",
                title: "Free Leisure Time / Relaxation",
                description: "Flexible time for personal exploration, photography, or cafe hopping.",
                location: itinerary.destinationName,
                time: "03:00 PM - 05:30 PM",
                estimatedCost: 0
            };
        } else if (slot === "morning" || slot === "evening") {
            day[slot] = {
                type: "Attraction",
                title: `${slot === "morning" ? "Morning" : "Evening"} Scenic Walk`,
                description: "Scenic walk around local streets and viewpoints.",
                location: itinerary.destinationName,
                time: slot === "morning" ? "09:00 AM - 12:30 PM" : "06:00 PM - 08:00 PM",
                estimatedCost: 0
            };
        }

        await itinerary.save();
        req.flash("success", `Updated Day ${dayNumber} schedule.`);
    }

    res.redirect(`/itinerary/${id}`);
};

// API: Get User Trips for Add-to-Trip Modals
module.exports.getUserTripsJson = async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.json({ success: false, trips: [], loggedIn: false });
    }
    const trips = await Itinerary.find({ user: req.user._id }, "title destinationName durationDays dailyPlan createdAt").sort({ createdAt: -1 });
    return res.json({ success: true, trips, loggedIn: true });
};

