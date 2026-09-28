const Listing = require("./models/listing");
const Review =require("./models/review");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema, destinationSchema, restaurantSchema, attractionSchema, activitySchema } = require("./schema.js");

module.exports.isLoggedIn=(req,res,next)=>{
    // console.log(req.originalUrl);
    if(!req.isAuthenticated()){
        // save original URL 
        req.session.redirectUrl = req.originalUrl;

        req.flash("error","You Must Be Logged In");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl=(req,res,next)=>{
    if(req.session.redirectUrl){ //if original url is saved in session then we will store it in locals 
        res.locals.redirectUrl=req.session.redirectUrl;
    }
    next();
};

module.exports.isOwner=async(req,res,next)=>{
    const {id}=req.params;
    const listing=await Listing.findById(id);
    if(!listing.owner.equals(res.locals.currUser._id)){
        req.flash("error","You Don't Have Permission!");
        return res.redirect(`/listings/${id}`);
    }
    next();
};
module.exports.isReviewAuthor=async(req,res,next)=>{
     const {id,reviewId}=req.params;
    const review=await Review.findById(reviewId);
    if(!review.author.equals(res.locals.currUser._id)){
        req.flash("error","You are not the author of  this review!");
        return res.redirect(`/listings/${id}`);
    }
    next();
}

//joi object
module.exports.validateListing = (req, res, next) => {
    const { error } = listingSchema.validate(req.body);

    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }
    next();
};

//joi object
module.exports.validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }
    next();
};

//validate destination
module.exports.validateDestination = (req, res, next) => {
    const { error } = destinationSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }
    next();
};

//validate restaurant
module.exports.validateRestaurant = (req, res, next) => {
    const { error } = restaurantSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }
    next();
};

//validate attraction
module.exports.validateAttraction = (req, res, next) => {
    const { error } = attractionSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }
    next();
};

//validate activity
module.exports.validateActivity = (req, res, next) => {
    const { error } = activitySchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }
    next();
};