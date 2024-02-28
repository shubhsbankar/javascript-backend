import {Video} from "../models/video.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiErrors.js";
import { apiResponse } from "../utils/apiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const uploadUserVideo = asyncHandler(async (req,res) => {
    const {title,description,duration,views,isPublished} = req.body
    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    
    console.log(req.body)
    if (!videoFileLocalPath)
    {
      throw new apiError(404,"Video file missing")
    }
    else if (!thumbnailLocalPath)
    {
     throw new apiError(400,"thumbnail is missing");
    }
    else if (!title)
    {
     throw new apiError(400,"title is missing");
    }
    else if (!description)
    {
     throw new apiError(400,"description is missing");
    }
    else if (!Boolean(isUpload)){
     throw new apiError(400,"isUploaded is missing "+ isUpload);
    }
    let video;
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

     video = await Video.create({
     videoFile: videoFile.url,
     thumbnail: thumbnail.url,
     title,
     description,
     duration :  duration? duration : 0,
     views: views? views:0,
     isPublish: Boolean(isPublished)?Boolean(isPublished): false,
     owner: req.user?._id
    });
    console.log("created video " ,video)
    if(!video)
    {
     throw new apiError(500,"Failed to update the video details in database");
    }
//    req.user?.watchHistory.push(video._id);
//    req.user?.save({ validateBeforeSave: false});
   return res
   .status(200)
   .json(
     new apiResponse(200,video,"Video uploaded successfully")
     );


});


export  { uploadUserVideo };