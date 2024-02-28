import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'          
import { apiError } from './apiErrors.js';
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async(localFilePath) => {
      try{
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
          resource_type: "auto"
        });
        fs.unlinkSync(localFilePath);
        //console.log("File is uploaded on cloudinary!! ", response.url);
        return response;
      }
      catch(error)
      {
        fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
        return null;
      }
}

const deleteFromCloudinary = async(path) =>{
  try{
    if (!path) return null;

       const slashIndex = path.lastIndexOf("/");
       const dotIndex = path.lastIndexOf(".");
       await cloudinary.uploader.destroy(path.substring(slashIndex+1,dotIndex));
  }
  catch(error)
  {
    console.log("Got error while deleting old file : ", error);
  }
}

export { uploadOnCloudinary, deleteFromCloudinary }