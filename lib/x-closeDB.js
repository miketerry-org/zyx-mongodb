// closeDB.js

"use strict";

// load all necessary modules
const system = require("zyx-system");

/**
 * Gracefully closes a Mongoose database connection.
 * @param {mongoose.Connection} connection - The connection instance to close.
 * @returns {Promise<void>}
 */
async function closeDB(connection) {
  if (!connection || typeof connection.close !== "function") {
    system.log.warn("closeDB: Invalid or missing connection instance.");
    return;
  }

  try {
    await connection.close();
    system.log.info(`Database connection "${connection.name}" closed.`);
  } catch (err) {
    system.log.error(
      `Error closing database connection "${connection.name}": ${err.message}`
    );
  }
}

module.exports = closeDB;
