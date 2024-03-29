import mongoose, {Schema} from "mongoose";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        userName: {
            type: String,
            unique: true,
            required: true,
            lowercase: true,
            trim:true,
            index:true
        },
        email: {
            type: String,
            unique: true,
            required: true,
            lowercase: true,
            trim:true
        },
        fullName: {
            type: String,
            required: true,
            trim:true,
            index: true
        },
        avatar: {
            type: String, // Cloudnary url
            required: true,
        },
        coverImage: {
            type: String // Cloudnary url
        },
        watchHistory:[
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password:{
            type: String,
            required: [true, "Password is required"]
        },
        refreshToken:{
            type: String
        }

    },
    {timestamps:true});

    userSchema.pre("save", async function (next) {

        //if (this.password) console.log("password is : ", this.password);

        if (!this.isModified("password")) return next();

        this.password = await bcrypt.hash(this.password, 10);
        next();
    });

    userSchema.methods.isPasswordCorrect = async function (password) {
            return await bcrypt.compare(password,this.password);
    }

    userSchema.methods.generateAccessToken = function () {
       return jwt.sign({
        _id : this._id,
        email: this.email,
        fullName: this.fullName,
        userName: this.userName
       },
       process.env.ACCESS_TOKEN_SECRET,
       {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
       });
}


userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({
     _id : this._id,
     email: this.email,
     fullName: this.fullName,
     userName: this.userName
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
     expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    });

}
export const User = mongoose.model("User", userSchema);