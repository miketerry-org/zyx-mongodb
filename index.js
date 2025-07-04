// index.js: // zyx-mongodb

"use strict";

// load all necessary modules
const createDB = require("./lib/createDB");
const closeDB = require("./lib/closeDB");
const createLog = require("./lib/createLog");
const closeLog = require("./lib/closeLog");
const UserModel = require("./lib/userModel");

module.exports = { createDB, closeDB, createLog, closeLog, UserModel };
