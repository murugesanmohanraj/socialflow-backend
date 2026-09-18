import app from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";

async function startServer() {
  console.log("DISPLAY from Node:", process.env.DISPLAY);
  console.log("PORT from Node:", process.env.PORT);

  await connectDatabase(env.mongoUri);
  console.log("Connected to MongoDB");

  app.listen(env.port, "0.0.0.0", () => {
    console.log(
      `Social Media Manager API listening on http://0.0.0.0:${env.port}`,
    );
  });
}

startServer().catch((error: unknown) => {
  console.error("Unable to start the server", error);
  process.exit(1);
});
