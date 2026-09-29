const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const itineraryController = require("../controllers/itineraries.js");

// Step 1: Trip Planner wizard form
router.get("/new", wrapAsync(itineraryController.renderGeneratorForm));

// Step 2: Algorithmic Generation & Live Preview
router.post("/generate", wrapAsync(itineraryController.generateItinerary));

// Step 3: Save Trip to User Account
router.post("/", isLoggedIn, wrapAsync(itineraryController.saveItinerary));

// Dashboard: My Trips
router.get("/my-trips", isLoggedIn, wrapAsync(itineraryController.myTrips));

// Download Complete Trip Itinerary as PDF
router.get("/:id/download", isLoggedIn, wrapAsync(itineraryController.downloadItineraryPdf));

// Single Trip View
router.route("/:id")
    .get(wrapAsync(itineraryController.showItinerary))
    .put(isLoggedIn, wrapAsync(itineraryController.updateItinerary))
    .delete(isLoggedIn, wrapAsync(itineraryController.destroyItinerary));

// Edit Trip
router.get("/:id/edit", isLoggedIn, wrapAsync(itineraryController.renderEditForm));

module.exports = router;
