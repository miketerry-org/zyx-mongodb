// mongoLog.js:

"use strict";

/**
 * @module MongoLog
 *
 * MongoLog logs messages to a MongoDB collection and optionally mirrors them to the console.
 * Useful for server environments requiring persistent or queryable log storage.
 */

const { BaseLog } = require("zyx-base");
const { MongoClient } = require("mongodb");

class MongoLog extends BaseLog {
  #mongoClient = null;
  #db = null;
  #collection = null;
  #ownsConnection = false;
  _logToConsole = true;

  /**
   * Constructs a MongoLog instance.
   *
   * @param {object} [tenant=undefined] - Optional tenant context with shared MongoDB connection.
   */
  constructor(tenant = undefined) {
    super(tenant);

    this._logToConsole = this.config?.log_console !== "false"; // defaults to true
    this._collectionName = this.config?.log_collection_name || "logs";
    this._expirationDays =
      Number.parseInt(this.config?.log_expiration_days, 10) || 0;
  }

  /**
   * Establishes a connection to MongoDB and initializes the logging collection.
   *
   * @returns {Promise<void>}
   */
  async connect() {
    // Use existing shared MongoClient from tenant if available
    if (
      this.tenant?.db?.connection &&
      this.tenant.db.connection instanceof MongoClient
    ) {
      this.#mongoClient = this.tenant.db.connection;
      this.#ownsConnection = false;
    }

    // If not connected, create a new MongoClient
    if (!this.#mongoClient) {
      const url = this.config?.db_url;
      if (!url) {
        throw new Error("Missing MongoDB connection URL (db_url) in config.");
      }

      this.#mongoClient = new MongoClient(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      await this.#mongoClient.connect();
      this.#ownsConnection = true;
    }

    // Derive DB and collection
    const dbName = MongoLog._parseDbName(this.config.db_url) || "default_db";
    this.#db = this.#mongoClient.db(dbName);
    this.#collection = this.#db.collection(this._collectionName);

    // Create TTL index for log expiration
    if (this._expirationDays > 0) {
      try {
        await this.#collection.createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: this._expirationDays * 86400 }
        );
      } catch (err) {
        if (this._logToConsole) {
          console.warn(
            "Failed to create TTL index on logs collection:",
            err.message
          );
        }
      }
    }

    this.setConnection(this.#collection);
  }

  /**
   * Closes the MongoDB connection if this instance owns it.
   *
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.#mongoClient && this.#ownsConnection) {
      await this.#mongoClient.close();
    }

    this.#mongoClient = null;
    this.#db = null;
    this.#collection = null;
  }

  /**
   * Internal method to insert a log entry into MongoDB.
   *
   * @param {string} level - Log level (e.g., "info", "error").
   * @param {string} message - The log message.
   * @param {object} [meta={}] - Additional metadata to store.
   */
  async _insertLog(level, message, meta = {}) {
    if (!this.#collection) {
      throw new Error("MongoLog is not connected to the database.");
    }

    const entry = {
      level,
      message,
      meta,
      createdAt: new Date(),
    };

    await this.#collection.insertOne(entry);
  }

  // ─── Overridden Log Methods ──────────────────────────────────────────────────

  async assert(expression, ...args) {
    if (!expression) {
      const message = args.map(String).join(" ");
      await this._insertLog("assert", message);
      if (this._logToConsole) super.assert(expression, ...args);
    } else if (this._logToConsole) {
      super.assert(expression, ...args);
    }
  }

  async debug(...args) {
    const message = args.map(String).join(" ");
    await this._insertLog("debug", message);
    if (this._logToConsole) super.debug(...args);
  }

  async error(...args) {
    const message = args.map(String).join(" ");
    await this._insertLog("error", message);
    if (this._logToConsole) super.error(...args);
  }

  async info(...args) {
    const message = args.map(String).join(" ");
    await this._insertLog("info", message);
    if (this._logToConsole) super.info(...args);
  }

  async log(...args) {
    const message = args.map(String).join(" ");
    await this._insertLog("log", message);
    if (this._logToConsole) super.log(...args);
  }

  async trace(...args) {
    const message = args.map(String).join(" ");
    await this._insertLog("trace", message);
    if (this._logToConsole) super.trace(...args);
  }

  async warn(...args) {
    const message = args.map(String).join(" ");
    await this._insertLog("warn", message);
    if (this._logToConsole) super.warn(...args);
  }

  async table(...args) {
    // Skipped from Mongo since it's primarily visual
    if (this._logToConsole) super.table(...args);
  }

  // ─── Console-Only Timing Methods ─────────────────────────────────────────────

  time(label) {
    if (this._logToConsole) super.time(label);
  }

  timeEnd(label) {
    if (this._logToConsole) super.timeEnd(label);
  }

  timeLog(label, ...args) {
    if (this._logToConsole) super.timeLog(label, ...args);
  }

  timeStamp(label) {
    if (this._logToConsole) super.timeStamp(label);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Extracts the database name from a MongoDB URI.
   *
   * @param {string} uri - Full MongoDB connection URI.
   * @returns {string|null} The database name, or null if not found.
   */
  static _parseDbName(uri) {
    try {
      const withoutParams = uri.split("?")[0];
      const parts = withoutParams.split("/");
      return parts.length > 3 ? parts[3] : null;
    } catch {
      return null;
    }
  }
}

module.exports = MongoLog;
