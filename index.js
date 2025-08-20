// index.js: // zyx-mongodb

"use strict";

// load all necessary modules
const MongoDatabase = require("./lib/mongoDatabase");
const MongoLog = require("./lib/mongoLog");
const MongoModel = require("./lib/mongoModel");

module.exports = { MongoDatabase, MongoLog, MongoModel };
