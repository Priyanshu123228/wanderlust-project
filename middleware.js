const Listing = require("./models/listing");
const Review =require("./models/review");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema } = require("./schema.js");

const {reviewSchema}=require("./schema.js");

module.exports.isLoggedIn=(req,res,next)=>{
    // console.log(req.originalUrl);
    if(!req.isAuthenticated()){
        // save original URL 
        req.session.redirectUrl = req.originalUrl;

        req.flash("error","You Must Be Logged In For Creating Listings");
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