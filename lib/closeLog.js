// closeLog.js:

"use strict";

// load all necessary modules
const system = require("zyx-system");
const winstonMongo = require("winston-mongodb");

/**
 * Gracefully closes a Winston logger connected to MongoDB.
 *
 * @param {winston.Logger} logger - The logger instance returned by createLog.
 * @returns {Promise<void>}
 */
async function closeLog(logger) {
  if (!logger || typeof logger.close !== "function") {
    system.log.warn("closeLog: Invalid or missing logger instance.");
    return;
  }

  try {
    const closePromises = [];

    for (const transport of logger.transports) {
      if (transport instanceof winstonMongo.MongoDB) {
        // Gracefully close MongoDB transport if supported
        if (typeof transport.close === "function") {
          closePromises.push(
            new Promise((resolve, reject) => {
              transport.close(err => (err ? reject(err) : resolve()));
            })
          );
        }
      }
    }

    await Promise.all(closePromises);

    system.log.info("MongoDB logger transport(s) closed.");
  } catch (err) {
    system.log.error(`Error closing MongoDB logger: ${err.message}`);
  }
}

module.exports = closeLog;
