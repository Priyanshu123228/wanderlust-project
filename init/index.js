const mongoose=require("mongoose");
const initData=require("./data.js");
const Listing=require("../models/listing.js");

const MONGO_URL="mongodb://127.0.0.1:27017/wanderlust";
async function main(){
    await mongoose.connect(MONGO_URL);
}
main().then(()=>{
    console.log("connected to DB");
}).catch((err)=>{
    console.log(err);
});


//initialize logic
const initDb=async ()=>{
    await Listing.deleteMany({});
    initData.data=initData.data.map((obj)=>({...obj,owner: "69d74c8b090cf1e801f55002"}));
    await Listing.insertMany(initData.data);
    console.log("Data was initialized");
};
initDb();