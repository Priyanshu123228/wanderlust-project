const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, validateRestaurant } = require("../middleware.js");
const restaurantController = require("../controllers/restaurants.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

router.route("/")
    .get(wrapAsync(restaurantController.index))
    .post(isLoggedIn, upload.single("restaurant[image]"), validateRestaurant, wrapAsync(restaurantController.createRestaurant));

router.get("/new", isLoggedIn, wrapAsync(restaurantController.renderNewForm));

router.route("/:id")
    .get(wrapAsync(restaurantController.showRestaurant))
    .put(isLoggedIn, upload.single("restaurant[image]"), validateRestaurant, wrapAsync(restaurantController.updateRestaurant))
    .delete(isLoggedIn, wrapAsync(restaurantController.destroyRestaurant));

router.get("/:id/edit", isLoggedIn, wrapAsync(restaurantController.renderEditForm));

module.exports = router;
