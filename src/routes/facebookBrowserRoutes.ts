import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";
import { runFacebookBrowserAction } from "../controllers/facebookBrowserController";

const facebookBrowserRouter = Router();

facebookBrowserRouter.use(requireAuth);
facebookBrowserRouter.post("/run", asyncHandler(runFacebookBrowserAction));

export default facebookBrowserRouter;
