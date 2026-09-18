import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 5000);
const mongoUri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;
const emailProvider = process.env.EMAIL_PROVIDER ?? "none";
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI;
const tiktokClientKey = process.env.TIKTOK_CLIENT_KEY;
const tiktokClientSecret = process.env.TIKTOK_CLIENT_SECRET;
const tiktokRedirectUri = process.env.TIKTOK_REDIRECT_URI;

const proxyHost = process.env.PROXY_HOST;
const proxyPort = process.env.PROXY_PORT ? Number(process.env.PROXY_PORT) : undefined;
const proxyUsername = process.env.PROXY_USERNAME;
const proxyPassword = process.env.PROXY_PASSWORD;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid number between 1 and 65535");
}

if (!mongoUri) {
  throw new Error("MONGO_URI is required. Add it to your .env file.");
}

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long.");
}

if (emailProvider === "resend" && (!resendApiKey || !emailFrom)) {
  throw new Error(
    "RESEND_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=resend.",
  );
}

let proxyConfig: { server: string; username?: string; password?: string } | undefined;
if (proxyHost && proxyPort) {
  proxyConfig = {
    server: `http://${proxyHost}:${proxyPort}`,
    ...(proxyUsername && { username: proxyUsername }),
    ...(proxyPassword && { password: proxyPassword }),
  };
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port,
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:3000",
  mongoUri,
  jwtSecret,
  emailProvider,
  resendApiKey,
  emailFrom,
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
  tiktokClientKey,
  tiktokClientSecret,
  tiktokRedirectUri,
  proxyConfig,
};
