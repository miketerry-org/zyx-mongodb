// mongoDatabase.js

"use strict";

const { BaseDatabase } = require("zyx-base");
const mongoose = require("mongoose");

/**
 * MongoDatabase is a per-tenant database service using Mongoose.
 * Each tenant gets its own MongoDB connection and isolated model set.
 *
 * @extends BaseDatabase
 */
class MongoDatabase extends BaseDatabase {
  #mongooseConnection;

  constructor(config = undefined, tenant = undefined) {
    super(config, tenant);
    this.#mongooseConnection = undefined;
  }

  /**
   * Establishes a connection to the MongoDB database for this tenant.
   * @returns {Promise<void>}
   */
  async connect() {
    const uri = this.config.db_url;
    if (!uri) {
      throw new Error("Missing 'mongo_uri' in tenant database config.");
    }

    this.#mongooseConnection = await mongoose.createConnection(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    this.setConnection(this.#mongooseConnection);
  }

  /**
   * Disconnects from the MongoDB database.
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.#mongooseConnection) {
      await this.#mongooseConnection.close();
      this.setConnection(null);
    }
  }

  /**
   * Registers a Mongoose model for this tenant’s DB connection.
   * @param {string} name - The name of the model (e.g., "user").
   * @param {mongoose.Schema} schema - The Mongoose schema.
   * @throws {Error} If model already exists.
   */
  registerModel(name, schema) {
    if (this.models[name]) {
      throw new Error(`Model "${name}" already registered for tenant.`);
    }

    const model = this.#mongooseConnection.model(name, schema);
    this.models[name] = model;
  }

  /**
   * Gets a registered model by name.
   * @param {string} name
   * @returns {mongoose.Model}
   */
  getModel(name) {
    return super.getModel(name);
  }

  /**
   * Gets the raw mongoose.Connection object.
   * @returns {mongoose.Connection}
   */
  get connection() {
    return this.#mongooseConnection;
  }
}

module.exports = MongoDatabase;
