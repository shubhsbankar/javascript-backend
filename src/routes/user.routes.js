import { Router } from "express";
import {
  loggedInUser,
  registerUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatarFile,
  getUserChannelProfile,
  updateCoverImageFile,
  getUserWatchHistory,
  updateUserWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {uploadUserVideo} from "../controllers/video.controller.js"

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loggedInUser);

//secured route
router.route("/logout").post(verifyJWT, logOutUser);
router.route("/refresh-token").post(verifyJWT,refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatarFile);
router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImageFile);
router.route("/c/:userName").get(verifyJWT, getUserChannelProfile);
router.route("/watch-history").get(verifyJWT, getUserWatchHistory);
router.route("/update-watch-history").post(verifyJWT,updateUserWatchHistory);


//Video routes
router.route("/video").post(verifyJWT,  upload.fields([
  {
    name: "videoFile",
    maxCount: 1,
  },
  {
    name: "thumbnail",
    maxCount: 1,
  },
]), uploadUserVideo);

export default router;
