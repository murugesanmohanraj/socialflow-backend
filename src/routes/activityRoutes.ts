import { Router } from "express";
import { getActivity, listActivity } from "../controllers/activityController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";

const activityRouter = Router();
activityRouter.use(requireAuth);
activityRouter.get("/", asyncHandler(listActivity));
activityRouter.get("/:activityId", asyncHandler(getActivity));

export default activityRouter;
