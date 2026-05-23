const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });



module.exports.index = async (req, res) => {
    const allListing = await Listing.find({});
    res.render("listings/index.ejs", { allListing });
};

module.exports.renderNewForm = (req, res) => {
    // console.log(req.user);
    // if(!req.isAuthenticated()){
    //     req.flash("error","You Must Be Logged In For Creating Listings");
    //     return res.redirect("/login");
    // }
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            },
        })
        .populate("owner");

    if (!listing) {
        req.flash("error", "Listing you requested does not exist");
        return res.redirect("/listings");
    }
    // console.log(listing);
    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
    // let {title ,description,image,location,price ,country}=req.body;
    // if(!req.body.listing){
    //     throw new ExpressError(400,"Send valid data for listing");
    // }
    let response = await geocodingClient.forwardGeocode({   // gives coordinate of addresses //calling geocoding api
        query: req.body.listing.location,
        limit: 1,  //many coordinates are there for new delhi it returns closest 1 coordinate
    })
    .send()
   
    let url = req.file.path;
    let filename = req.file.filename;
    const newListings = new Listing(req.body.listing);
    newListings.owner = req.user._id;
    newListings.image = { url, filename };
    newListings.geometry=response.body.features[0].geometry;

   let savedListing= await newListings.save();
   console.log(savedListing);
    // console.log(newListings);
    req.flash("success", "New Listing created");
    return res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested does not exist");
        return res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.upadateListing = async (req, res) => {
    // if(!req.body.listing){
    //     throw new ExpressError(400,"Send valid data for listing");
    // }
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }

    req.flash("success", "Listing is updated ");
    return res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    if (!deletedListing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }
    console.log(deletedListing);
    req.flash("success", "Listing Deleted");
    return res.redirect("/listings");
};