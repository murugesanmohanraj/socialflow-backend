import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";
import { runInstagramBrowserAction } from "../controllers/instagramBrowserController";

const instagramBrowserRouter = Router();

instagramBrowserRouter.use(requireAuth);
instagramBrowserRouter.post("/run", asyncHandler(runInstagramBrowserAction));

export default instagramBrowserRouter;
