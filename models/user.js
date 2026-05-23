const mongoose = require("mongoose");

const plm = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
});

// 👇 IMPORTANT CHANGE
userSchema.plugin(plm.default || plm);

module.exports = mongoose.model("User", userSchema);