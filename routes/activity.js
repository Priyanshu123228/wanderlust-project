const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, validateActivity } = require("../middleware.js");
const activityController = require("../controllers/activities.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

router.route("/")
    .get(wrapAsync(activityController.index))
    .post(isLoggedIn, upload.single("activity[image]"), validateActivity, wrapAsync(activityController.createActivity));

router.get("/new", isLoggedIn, wrapAsync(activityController.renderNewForm));

router.route("/:id")
    .get(wrapAsync(activityController.showActivity))
    .put(isLoggedIn, upload.single("activity[image]"), validateActivity, wrapAsync(activityController.updateActivity))
    .delete(isLoggedIn, wrapAsync(activityController.destroyActivity));

router.get("/:id/edit", isLoggedIn, wrapAsync(activityController.renderEditForm));

module.exports = router;
