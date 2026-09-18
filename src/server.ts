import app from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";

async function startServer() {
  await connectDatabase(env.mongoUri);
  console.log("Connected to MongoDB");

  app.listen(env.port, () => {
    console.log(
      `Social Media Manager API listening on http://localhost:${env.port}`,
    );
  });
}

startServer().catch((error: unknown) => {
  console.error("Unable to start the server", error);
  process.exit(1);
});
