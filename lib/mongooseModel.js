// mongooseModel.js:

"use strict";

const { BaseModel } = require("zyx-base");

/**
 * A base model for Mongoose documents integrated with tenant-aware databases.
 * Wraps core Mongoose operations (CRUD) in a consistent API.
 *
 * Subclasses must override the `schema()` method to return a Mongoose schema.
 *
 * @abstract
 * @class
 * @extends BaseModel
 */
class MongooseModel extends BaseModel {
  /** @type {import('mongoose').Model} */
  #underlyingModel;

  /**
   * Constructs a new tenant-scoped Mongoose model.
   *
   * @param {object} tenant - The tenant object containing a connected Mongoose `db` instance.
   * @throws {Error} If the schema is not implemented in the subclass.
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

    const modelName = this.name;

    this.#underlyingModel =
      tenant.db.models[modelName] || tenant.db.model(modelName, schema);
  }

  /**
   * Subclasses must override this to provide a Mongoose schema.
   *
   * @abstract
   * @returns {import('mongoose').Schema}
   * @throws {Error} If not overridden by subclass.
   */
  schema() {
    throw new Error(
      `Model schema() not implemented for class "${this.constructor.name}"`
    );
  }

  /**
   * Returns the raw underlying Mongoose model.
   *
   * @returns {import('mongoose').Model}
   */
  get underlyingModel() {
    return this.#underlyingModel;
  }

  /**
   * Finds documents matching a query.
   *
   * @param {object} [query={}] - MongoDB query object.
   * @param {object} [projection={}] - Fields to include or exclude.
   * @returns {Promise<Array<object>>}
   */
  async find(query = {}, projection = {}) {
    return this.#underlyingModel.find(query, projection).exec();
  }

  /**
   * Finds a single document matching a query.
   *
   * @param {object} [query={}] - MongoDB query object.
   * @returns {Promise<object|null>}
   */
  async findOne(query = {}) {
    return this.#underlyingModel.findOne(query).exec();
  }

  /**
   * Finds a document by its ID.
   *
   * @param {string} id - The document ID.
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    return this.#underlyingModel.findById(id).exec();
  }

  /**
   * Creates a new document.
   *
   * @param {object} data - The data to create the document with.
   * @returns {Promise<object>}
   */
  async create(data) {
    return this.#underlyingModel.create(data);
  }

  /**
   * Updates a document by its ID.
   *
   * @param {string} id - The document ID.
   * @param {object} updates - The update operations.
   * @returns {Promise<object|null>} - The updated document.
   */
  async updateById(id, updates) {
    return this.#underlyingModel
      .findByIdAndUpdate(id, updates, { new: true })
      .exec();
  }

  /**
   * Deletes a document by its ID.
   *
   * @param {string} id - The document ID.
   * @returns {Promise<object|null>} - The deleted document.
   */
  async deleteById(id) {
    return this.#underlyingModel.findByIdAndDelete(id).exec();
  }
}

module.exports = MongooseModel;
