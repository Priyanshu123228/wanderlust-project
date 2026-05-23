const User=require("../models/user");

module.exports.renderSignupForm=(req,res)=>{
    res.render("users/signup.ejs");
};

// module.exports.signup=async(req,res)=>{
//     try {
//          let {username,email,password}=req.body;
//         const newUser=new User({email,username});
//         const registerdUser=await User.register(newUser,password);
//         console.log(registerdUser);
//         //auto login
//         req.login(registerdUser,(err)=>{
//             if(err){
//                 return next(err);
//             }
//             req.flash("success","Welcome to wanderlust");
//             res.redirect("/listings");
//         });
        
//     } catch (error) {
//         req.flash("error",error.message);
//         res.redirect("signup");
//     }
// };
module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, password } = req.body;

        const newUser = new User({ email, username });

        const registeredUser = await User.register(newUser, password);

        console.log(registeredUser);

        // auto login
        req.login(registeredUser, (err) => {

            if (err) {
                return next(err);
            }

            req.flash("success", "Welcome to wanderlust");

            return res.redirect("/listings");
        });

    } catch (error) {

        req.flash("error", error.message);

        return res.redirect("/signup");
    }
};


module.exports.renderLoginForm=(req,res)=>{
    res.render("users/login.ejs");
};

module.exports.login=async(req,res)=>{
    req.flash("success","Welcome back to wanderlust");

    let redirectUrl=res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
    // res.redirect(res.locals.redirectUrl);
};

module.exports.logout=(req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }

        req.flash("success", "Logged out successfully!");
        res.redirect("/listings");
    });
};