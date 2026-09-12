const fs = require("fs");
const createApp = require("./app");
const env = require("./config/env");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const logger = require("./utils/logger");

async function start() {
  fs.mkdirSync(env.uploads.dir, { recursive: true });

  await connectDatabase();
  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(`BhoomiScan API listening on http://localhost:${env.port}${env.apiPrefix}`);
  });

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  ["SIGINT", "SIGTERM"].forEach((signal) => process.on(signal, () => shutdown(signal)));
}

start().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
