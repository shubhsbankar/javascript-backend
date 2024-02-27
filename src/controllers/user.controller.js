import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const gererateAccessAndRefreshTokens = async (user) => {
  try {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({
      validateBeforeSave: false,
    });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Failed to generate access token and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const { userName, email, fullName, password } = req.body;
  console.log("email : ", email);
  if (
    [userName, email, fullName, password].some((item) => item?.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existedUser) {
    throw new apiError(409, "User already existed with username or email");
  }

  const avatarLoacalPath = req.files?.avatar[0]?.path;

  //const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLoacalPath) {
    throw new apiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLoacalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new apiError(400, "Avatar file is required");
  }
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new apiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registered successfully"));
});

const loggedInUser = asyncHandler(async (req, res) => {
  const { userName, email, password } = req.body;

  if (!userName && !email) {
    throw new apiError(400, "email or usename is required");
  }
  const user = await User.findOne({
    $or: [{ email }, { userName }],
  });

  if (!user) {
    throw new apiError(404, "User is not existed");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new apiError(401, "Invalid credentials");
  }
  console.log("before :", user);
  const { accessToken, refreshToken } =
    await gererateAccessAndRefreshTokens(user);
  console.log("after :", user);
  const loggedInUser = await User.findOne(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: "" },
    },
    {
      new: true,
    }
  );

  const options = {
    httponly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRegreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRegreshToken) {
    throw new apiError(400, "Invalid Refresh token");
  }

  const decodedToken = jwt.verify(
    incomingRegreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );
  if (!decodedToken) {
    throw new apiError(400, "Invalid Refresh token");
  }
  const user = await User.findById(decodedToken._id);
  if (!user) {
    throw new apiError(404, "User not found");
  }
  if (user.refreshToken !== incomingRegreshToken) {
    throw new apiError(400, "Invalid Refresh token");
  }
  const { accessToken, refreshToken } =
    await gererateAccessAndRefreshTokens(user);
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          accessToken,
          refreshToken,
        },
        "Access token refreshed successfully"
      )
    );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new apiError(400, "Current password and new password are required");
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new apiError(404, "User not found");
  }
  const isPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) {
    throw new apiError(401, "Invalid current password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new apiResponse(200, req.user, "User details fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new apiError(400, "Full name or email is required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      fullName,
      email,
    },
    {
      new: true,
    }
  ).select("-password");
  if (!user) {
    throw new apiError(500, "Failed to update user details");
  }

  return res
    .status(200)
    .json(new apiResponse(200, user, "user details updated successfully"));
});

const updateAvatarFile = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new apiError(500, "Failed to upload avatar file");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      avatar: avatar.url,
    },
    {
      new: true,
    }
  ).select("-password");
  if (!user) {
    throw new apiError(500, "Failed to update user details");
  }
  return res
    .status(200)
    .json(new apiResponse(200, user, "Avatar file updated successfully"));
});

const updateCoverImageFile = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
  
    if (!coverImageLocalPath) {
      throw new apiError(400, "Cover Image file missing");
    }
  
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage) {
      throw new apiError(500, "Failed to upload Cover Image file");
    }
  
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        coverImage: coverImage.url,
      },
      {
        new: true,
      }
    ).select("-password");
    if (!user) {
      throw new apiError(500, "Failed to update user details");
    }
    return res
      .status(200)
      .json(new apiResponse(200, user, "Avatar file updated successfully"));
  });

  const getUserChannelProfile = asyncHandler(async(req, res) => {
      const userName = req.param;
      if (!userName) {
            throw new apiError(400, "Invalid username param");
      }
      
      const channel = await User.aggregate([
            {
                $match:
                {
                    userName : userName
                }
            },
            {
                $lookup:
                {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup:
                {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscriptions"          
                }
            },
            {
                $addFields:
                {
                    subscriberCount: {$size: "$subscribers"},
                    subscriptionCount: {$size: "$subscriptions"},
                    isSubscribed: {
                        $in: [req.user?._id, "$subscribers.subscriber"]
                    }
                }
            },
            {
                $project:{
                    fullName,
                    userName,
                    email,
                    avatar,
                    coverImage,
                    subscriberCount,
                    subscriptionCount,
                    isSubscribed
                }
            }

      ]);
        if (!channel) {
                throw new apiError(404, "Channel not found");
        }
        return res
        .status(200)
        .json(new apiResponse(200, channel[0], "Channel details fetched successfully"));
    });

export {
  loggedInUser,
  registerUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateCoverImageFile,
  updateAvatarFile,
  getUserChannelProfile
};
