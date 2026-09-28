const express=require("express");
const router=express.Router();
const User=require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const {saveRedirectUrl}=require("../middleware.js");
const userController=require("../controllers/users.js");


router.route("/signup")
    .get(userController.renderSignupForm)
    .post(wrapAsync(userController.signup));

router.route("/login")
  .get(userController.renderLoginForm)
    .post(saveRedirectUrl,passport.authenticate("local",{failureFlash:true,failureRedirect:"/login"}),userController.login);

router.get("/logout", userController.logout);

const Destination = require("../models/destination.js");

// Home page
router.get("/", wrapAsync(async (req, res) => {
    const featuredDestinations = await Destination.find({}).sort({ featured: -1, name: 1 }).limit(6);
    res.render("home.ejs", { featuredDestinations });
}));

module.exports=router;