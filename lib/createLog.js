// createLog.js:

"use strict";

const system = require("zyx-system");
const Schema = require("zyx-schema");
const winston = require("winston");
require("winston-mongodb");
const { MongoClient } = require("mongodb");

const { booleanType, integerType, stringType } = Schema.types;

/**
 * Creates and configures a Winston logger that logs to MongoDB.
 *
 * @async
 * @param {Object} config - Configuration object.
 * @param {string} config.db_url - MongoDB connection string.
 * @param {string} config.log_collection_name - Collection name for log entries.
 * @param {number} [config.log_expiration_days] - Days to keep logs if TTL is used.
 * @param {boolean} [config.log_capped] - Whether the collection should be capped.
 * @param {number} [config.log_max_size] - Max size in MB for a capped collection.
 * @param {number} [config.log_max_docs] - Max number of documents in a capped collection.
 * @returns {Promise<winston.Logger>} A configured Winston logger instance.
 * @throws Will throw if validation or MongoDB operations fail.
 */
async function createLog(tenant) {
  // Validate config with schema
  const { validated, errors } = new Schema({
    db_url: stringType({ min: 1, max: 255, required: true }),
    log_collection_name: stringType({ min: 1, max: 255, required: true }),
    log_expiration_days: integerType({ min: 1, max: 365, required: false }),
    log_capped: booleanType({ required: false }),
    log_max_size: integerType({ required: false }),
    log_max_docs: integerType({ required: false }),
  }).validate(tenant);

  // Throw if validation fails
  if (errors.length > 0) {
    throw new Error(errors.map(e => e.message).join(", "));
  }

  // Destructure validated config
  const {
    db_url,
    log_collection_name,
    log_expiration_days,
    log_capped,
    log_max_size,
    log_max_docs,
  } = validated;

  // Ensure capped collections and TTL are not used together
  if (log_capped && log_expiration_days) {
    throw new Error(
      "Cannot use both capped and TTL options on the same collection."
    );
  }

  try {
    // Connect to MongoDB (MongoDB 7.x — modern connection behavior)
    const client = await MongoClient.connect(db_url);
    const db = client.db();

    // Check if the target collection already exists
    const collections = await db
      .listCollections({ name: log_collection_name })
      .toArray();

    // Create collection if it does not exist
    if (collections.length === 0) {
      if (log_capped && log_max_size && log_max_docs) {
        await db.createCollection(log_collection_name, {
          capped: true,
          size: log_max_size * 1024 * 1024, // convert MB to bytes
          max: log_max_docs,
        });
        if (system.isDebugging) {
          system.debug(`Created capped collection: ${log_collection_name}`);
        }
      } else {
        await db.createCollection(log_collection_name);
        if (system.isDebugging) {
          system.debug(`Created standard collection: ${log_collection_name}`);
        }
      }
    } else {
      if (system.isDebugging) {
        system.debug(`Collection already exists: ${log_collection_name}`);
      }
    }

    // Setup TTL index if TTL logging is enabled
    if (!log_capped && log_expiration_days) {
      const collection = db.collection(log_collection_name);
      const indexes = await collection.indexes();

      const ttlExists = indexes.some(
        i => i.key?.timestamp === 1 && i.name === "timestamp_ttl"
      );

      if (!ttlExists) {
        await collection.createIndex(
          { timestamp: 1 },
          {
            expireAfterSeconds: log_expiration_days * 86400, // days to seconds
            name: "timestamp_ttl",
          }
        );
        if (system.isDebugging) {
          system.debug(
            `Created TTL index 'timestamp_ttl' for ${log_expiration_days} days`
          );
        }
      } else {
        if (system.isDebugging) {
          system.debug("TTL index 'timestamp_ttl' already exists");
        }
      }
    }

    // Create the Winston logger instance
    const logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        // Console output for dev/debug
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
        // MongoDB log transport
        new winston.transports.MongoDB({
          db: db_url,
          collection: log_collection_name,
          level: "info",
        }),
      ],
    });

    // display message indicating loffer sucessfully created
    if (system.isDebugging) {
      system.log.info(`Logger created for "${validated.db_url}"`);
    }

    // Return the configured logger
    return logger;
  } catch (err) {
    // Log and rethrow any errors
    if (system.isDebugging) {
      system.debug(err.message);
      system.log.error(err.message);
    }
    throw new Error(err.message);
  }
}

module.exports = createLog;
