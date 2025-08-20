// mongoModel.js

"use strict";

const { BaseModel } = require("zyx-base");

/**
 * Abstract base class for tenant-scoped Mongoose models.
 *
 * Designed for multi-tenant applications where each tenant has its own database connection.
 * Subclasses must override the `schema()` method to define the model structure.
 *
 * Automatically registers and retrieves the Mongoose model using the tenant's database service.
 *
 * @abstract
 * @class
 * @extends BaseModel
 */
class MongooseModel extends BaseModel {
  /**
   * The compiled Mongoose model instance.
   * @type {import("mongoose").Model}
   * @private
   */
  #underlyingModel;

  /**
   * Constructs a new tenant-scoped Mongoose model instance.
   *
   * @param {object} tenant - The tenant object containing a valid MongoDatabase instance.
   * @throws {Error} If the schema is not defined or invalid.
   */
  constructor(tenant) {
    super(tenant);

    const schema = this.schema();

    if (!schema || typeof schema !== "object") {
      throw new Error(
        `Missing or invalid schema in "${this.constructor.name}". ` +
          `Subclasses must override the schema() method.`
      );
    }

    const db = this.db;
    const modelName = this.name;

    // Register the model only if not already registered
    if (!db.models[modelName]) {
      db.registerModel(modelName, schema);
    }

    this.#underlyingModel = db.getModel(modelName);
  }

  /**
   * Subclasses must override this method to provide a Mongoose schema definition.
   *
   * @abstract
   * @returns {import("mongoose").Schema} The Mongoose schema object.
   * @throws {Error} If not implemented.
   */
  schema() {
    throw new Error(
      `Model schema() not implemented for class "${this.constructor.name}"`
    );
  }

  /**
   * Returns the underlying Mongoose model instance.
   *
   * @returns {import("mongoose").Model}
   */
  get underlyingModel() {
    return this.#underlyingModel;
  }

  /**
   * Finds documents matching the specified query.
   *
   * @param {object} [query={}] - MongoDB query object.
   * @param {object} [projection={}] - Fields to include or exclude.
   * @returns {Promise<Array<object>>} Array of matching documents.
   */
  async find(query = {}, projection = {}) {
    return this.#underlyingModel.find(query, projection).exec();
  }

  /**
   * Finds a single document matching the specified query.
   *
   * @param {object} [query={}] - MongoDB query object.
   * @returns {Promise<object|null>} The first matching document, or null.
   */
  async findOne(query = {}) {
    return this.#underlyingModel.findOne(query).exec();
  }

  /**
   * Finds a document by its unique MongoDB ObjectId.
   *
   * @param {string} id - Document ID to search for.
   * @returns {Promise<object|null>} The document if found, otherwise null.
   */
  async findById(id) {
    return this.#underlyingModel.findById(id).exec();
  }

  /**
   * Creates and saves a new document in the collection.
   *
   * @param {object} data - Document data to create.
   * @returns {Promise<object>} The created document.
   */
  async create(data) {
    return this.#underlyingModel.create(data);
  }

  /**
   * Updates an existing document by its ID.
   *
   * @param {string} id - Document ID to update.
   * @param {object} updates - Fields to update.
   * @returns {Promise<object|null>} The updated document, or null if not found.
   */
  async updateById(id, updates) {
    return this.#underlyingModel
      .findByIdAndUpdate(id, updates, { new: true })
      .exec();
  }

  /**
   * Deletes a document by its ID.
   *
   * @param {string} id - Document ID to delete.
   * @returns {Promise<object|null>} The deleted document, or null if not found.
   */
  async deleteById(id) {
    return this.#underlyingModel.findByIdAndDelete(id).exec();
  }
}

module.exports = MongooseModel;
