import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
try {
        const token = req.cookies?.accessToken || req.headers["authorization"]?.replace("Bearer ", "");
        if (!token)
        {
            throw new apiError(401, "Unauthorized request");
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if (!decodedToken)
        {
            throw new apiError(401, "Invalid access token");
        }
        const user = await User.findById(decodedToken._id);
        req.user = user;
        next();
} catch (error) {
    throw new apiError(401, error?.message || "Invalid access token");
}
});

