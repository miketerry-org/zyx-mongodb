// createDB.js:
//
"use strict";

const mongoose = require("mongoose");
const system = require("zyx-system");
const Schema = require("zyx-schema");

// Destructure schema types needed by validation
const { stringType } = Schema.types;

/**
 * Drops all collections in the given Mongoose connection.
 * Used during testing to ensure a clean database state.
 * @param {mongoose.Connection} connection
 */
async function dropAllCollections(connection) {
  const collections = await connection.db.collections();
  for (const collection of collections) {
    try {
      await collection.drop();
      system.log.info(`Dropped collection: ${collection.collectionName}`);
    } catch (err) {
      // Ignore "ns not found" and other benign errors
      if (
        err.message !== "ns not found" &&
        !/a background operation is currently running/.test(err.message)
      ) {
        system.log.warn(
          `Failed to drop collection ${collection.collectionName}: ${err.message}`
        );
      }
    }
  }
}

/**
 * Asynchronously creates a MongoDB connection using Mongoose.
 * @param {Object} tenant - A tenant object containing a `db_url`.
 * @returns {Promise<mongoose.Connection>} - Resolves with the connection object.
 * @throws {Error} - Throws if validation fails or connection cannot be established.
 */
async function createDB(tenant) {
  const { validated, errors } = new Schema({
    db_url: stringType({ min: 1, max: 255, required: true }),
  }).validate(tenant);

  if (errors.length > 0) {
    throw new Error(errors.map(e => e.message).join(", "));
  }

  try {
    const connection = await mongoose
      .createConnection(validated.db_url, {
        serverSelectionTimeoutMS: 10000,
      })
      .asPromise();

    if (system.isDebugging) {
      system.log.info(`Database connected to "${validated.db_url}"`);
    }

    connection.on("disconnected", () => {
      if (system.isDebugging) {
        system.log.info(`Database disconnected from "${connection.name}"`);
      }
    });

    if (system.isTesting) {
      await dropAllCollections(connection);
    }

    return connection;
  } catch (err) {
    if (system.isDebugging) {
      system.log.error(
        `Database connection error: (${validated.db_url}) ${err.message}`
      );
    }
    throw new Error(`Failed to connect to database: ${err.message}`);
  }
}

module.exports = createDB;
