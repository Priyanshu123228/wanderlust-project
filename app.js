require("dotenv").config();


const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const User=require("./models/user.js");


const session=require("express-session");
const MongoStore = require("connect-mongo");
const flash=require("connect-flash");

const listingRouter=require("./routes/listing.js");//express router
const reviewRouter=require("./routes/review.js");
const userRouter=require("./routes/user.js");



app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");


app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dbUrl=process.env.ATLASDB_URL;



async function main() {
    await mongoose.connect(dbUrl);
}
main().then(() => {
    console.log("connected to DB");
}).catch((err) => {
    console.log(err);
});

const store = MongoStore.create({
   mongoUrl: process.env.ATLASDB_URL,
   touchAfter: 24 * 3600
});

 store.on("error",(err)=>{
    console.log("Error in mongo session store" , err);
 });

const sessionOptions={
    store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:false,
    cookie:{
        expires:Date.now()+ 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly:true,
    },
};

// app.get("/", (req, res) => {
//     res.send("Hi i am root");
// });

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
    next();
});

//listing routes
app.use("/listings" ,listingRouter);

//reviews routes
app.use("/listings/:id/reviews",reviewRouter); 

//user routes
app.use("/" , userRouter);


// app.get("/demouser",async(req,res)=>{
//     let fakeUser=new User({
//         email:"student@gmail.com",
//         username:"delta-student",
//     });
//     let registeredUser=await User.register(fakeUser,"password");
//     res.send(registeredUser);
// });

// 404 handler (modern way)
app.use((req, res, next) => {
    next(new ExpressError(404, "Page not found"));
});

// Error handler
// app.use((err, req, res, next) => {
//     let { statusCode = 500, message = "Internal Server Error" } = err;
//     res.status(statusCode).render("error.ejs",{message})
//     // res.status(statusCode).send(message);
// });
app.use((err, req, res, next) => {

    console.error(err.stack);

    const { statusCode = 500 } = err;

    if (res.headersSent) {
        return next(err);
    }

    res.status(statusCode).render("error.ejs", {
        message: err.message || "Something went wrong!"
    });
});
app.listen(8080, () => {
    console.log("Server is listening to the port 8000");
});