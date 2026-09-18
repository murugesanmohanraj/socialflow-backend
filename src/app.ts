import cors from "cors";
import express from "express";
import path from "path";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import accountRouter from "./routes/accountRoutes";
import authRouter from "./routes/authRoutes";
import actionRouter from "./routes/actionRoutes";
import executionRouter from "./routes/executionRoutes";
import healthRouter from "./routes/healthRoutes";
import userRouter from "./routes/userRoutes";
import oauthRouter from "./routes/oauthRoutes";
import activityRouter from "./routes/activityRoutes";
import reviewRouter from "./routes/reviewRoutes";
import dashboardRouter from "./routes/dashboardRoutes";
import facebookBrowserRouter from "./routes/facebookBrowserRoutes";
import instagramBrowserRouter from "./routes/instagramBrowserRoutes";
import tiktokBrowserRouter from "./routes/tiktokBrowserRoutes";

const app = express();

const allowedOrigins = [
  env.clientUrl,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://socialflow-backend-1.onrender.com",
];

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Social Media Manager API is running",
  });
});

app.get("/terms-of-service", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Terms of Service - Social Media Manager</title></head>
  <body>
    <h1>Terms of Service</h1>
    <p>Last updated: September 10, 2026</p>
    <p>Social Media Manager provides a dashboard for users to connect and manage authorized social media accounts.</p>
    <p>Users are responsible for the accounts they connect and for complying with the terms, policies, and laws applicable to each connected platform.</p>
    <p>The service must not be used to access accounts without authorization, bypass platform restrictions, or create artificial engagement.</p>
    <p>We may suspend access when necessary to protect users, connected platforms, or the service.</p>
    <p>Contact: support@example.com</p>
  </body>
</html>`);
});

app.get("/privacy-policy", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Privacy Policy - Social Media Manager</title></head>
  <body>
    <h1>Privacy Policy</h1>
    <p>Last updated: September 10, 2026</p>
    <p>Social Media Manager collects account details needed to provide authenticated access to the service.</p>
    <p>When you connect a social media account, we receive information permitted by the authorization scopes you approve. OAuth tokens are encrypted before storage and are not used to access accounts beyond the requested service features.</p>
    <p>We do not sell personal information. We use information to authenticate users, display connected accounts, provide requested workflows, maintain security, and improve the service.</p>
    <p>You may request account information deletion by contacting us.</p>
    <p>Contact: privacy@example.com</p>
  </body>
</html>`);
});

app.get("/tiktoknnfB1NaV7HnsUOMBIZQlIYV2MS1vy9bu.txt", (_req, res) => {
  res.sendFile(
    path.resolve(__dirname, "..", "tiktoknnfB1NaV7HnsUOMBIZQlIYV2MS1vy9bu.txt"),
  );
});

app.get("/tiktokHKOmfLt7yiCLytAWTILPZhIvhvpn913q.txt", (_req, res) => {
  res.sendFile(
    path.resolve(__dirname, "..", "tiktokHKOmfLt7yiCLytAWTILPZhIvhvpn913q.txt"),
  );
});

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/actions", actionRouter);
app.use("/api/executions", executionRouter);
app.use("/api/oauth", oauthRouter);
app.use("/api/activity", activityRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/facebook-browser", facebookBrowserRouter);
app.use("/api/instagram-browser", instagramBrowserRouter);
app.use("/api/tiktok-browser", tiktokBrowserRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
