const mongoose=require("mongoose");

const reviewSchema=new mongoose.Schema({
    comment:{
        type:String,
    },
    rating:{
        type:Number,
        Min:1,
        Max:5,
    },
    createdAt:{
        type:Date,
        default:Date.now(),
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
});

module.exports=mongoose.model("Review",reviewSchema);