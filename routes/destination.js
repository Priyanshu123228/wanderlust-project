const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, validateDestination } = require("../middleware.js");
const destinationController = require("../controllers/destinations.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

router.route("/")
    .get(wrapAsync(destinationController.index))
    .post(isLoggedIn, upload.single("destination[image]"), validateDestination, wrapAsync(destinationController.createDestination));

// New Destination Form
router.get("/new", isLoggedIn, destinationController.renderNewForm);

router.route("/:id")
    .get(wrapAsync(destinationController.showDestination))
    .put(isLoggedIn, upload.single("destination[image]"), validateDestination, wrapAsync(destinationController.updateDestination))
    .delete(isLoggedIn, wrapAsync(destinationController.destroyDestination));

// Edit Destination Form
router.get("/:id/edit", isLoggedIn, wrapAsync(destinationController.renderEditForm));

module.exports = router;
