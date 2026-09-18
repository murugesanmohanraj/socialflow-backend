import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";
import {
  createReview,
  getReview,
  updateReviewItem,
} from "../controllers/reviewController";

const reviewRouter = Router();
reviewRouter.use(requireAuth);
reviewRouter.post("/", asyncHandler(createReview));
reviewRouter.get("/:reviewId", asyncHandler(getReview));
reviewRouter.patch(
  "/:reviewId/accounts/:accountId",
  asyncHandler(updateReviewItem),
);

export default reviewRouter;
