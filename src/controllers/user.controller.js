import { asyncHandler } from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiErrors.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"

const registerUser = asyncHandler(async (req,res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const {userName, email, fullName, password} = req.body;
    console.log("email : " , email);
    if ([userName,email,fullName,password].some(
        item => item?.trim() === ""
    ))
    {
        throw new apiError(400,"All fields are required");
    }
    const existedUser = await User.findOne({
        $or: [ { userName }, { email }]
    });
    if (existedUser)
    {
        throw new apiError(409, "User already existed with username or email");
    }

    const avatarLoacalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
    {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLoacalPath)
    {
        throw new apiError(400,"Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLoacalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar)
    {
        throw new apiError(400,"Avatar file is required");
    }
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
        );

    if(!createdUser)
    {
        throw new apiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User registered successfully")
    )

});

export { registerUser };