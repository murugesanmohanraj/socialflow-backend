import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    service: "Social Media Manager API",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default healthRouter;
