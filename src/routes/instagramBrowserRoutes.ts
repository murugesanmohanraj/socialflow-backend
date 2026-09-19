import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";
import {
  requestInstagramBrowserVerificationCode,
  runInstagramBrowserAction,
  submitInstagramBrowserVerification,
} from "../controllers/instagramBrowserController";

const instagramBrowserRouter = Router();

instagramBrowserRouter.use(requireAuth);
instagramBrowserRouter.post("/run", asyncHandler(runInstagramBrowserAction));
instagramBrowserRouter.post(
  "/verify",
  asyncHandler(submitInstagramBrowserVerification),
);
instagramBrowserRouter.post(
  "/new-code",
  asyncHandler(requestInstagramBrowserVerificationCode),
);

export default instagramBrowserRouter;
