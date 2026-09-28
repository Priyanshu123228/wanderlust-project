const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, validateAttraction } = require("../middleware.js");
const attractionController = require("../controllers/attractions.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

router.route("/")
    .get(wrapAsync(attractionController.index))
    .post(isLoggedIn, upload.single("attraction[image]"), validateAttraction, wrapAsync(attractionController.createAttraction));

router.get("/new", isLoggedIn, wrapAsync(attractionController.renderNewForm));

router.route("/:id")
    .get(wrapAsync(attractionController.showAttraction))
    .put(isLoggedIn, upload.single("attraction[image]"), validateAttraction, wrapAsync(attractionController.updateAttraction))
    .delete(isLoggedIn, wrapAsync(attractionController.destroyAttraction));

router.get("/:id/edit", isLoggedIn, wrapAsync(attractionController.renderEditForm));

module.exports = router;
