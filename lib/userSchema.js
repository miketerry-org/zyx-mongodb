// userSchema.js

"use strict";

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const system = require("zyx-system");

// Constants
const SALT_ROUNDS = 12;
const CODE_EXPIRATION_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;
const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000;

// Utility: Generate ###-### format code
function generateCode() {
  const part1 = Math.floor(100 + Math.random() * 900).toString();
  const part2 = Math.floor(100 + Math.random() * 900).toString();
  return `${part1}-${part2}`;
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Basic email validation
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: system.userRoles,
      default: system.userRoles[0],
      required: true,
    },
    firstname: {
      type: String,
      required: true,
      trim: true,
    },
    lastname: {
      type: String,
      required: true,
      trim: true,
    },

    // Email verification
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifyCode: {
      type: String,
      match: /^\d{3}-\d{3}$/,
    },
    verifyCodeExpiresAt: {
      type: Date,
    },

    // Login tracking
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },

    // Password reset
    resetCode: {
      type: String,
      match: /^\d{3}-\d{3}$/,
    },
    resetCodeExpiresAt: {
      type: Date,
    },

    // Metadata
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// TTL Indexes (automatic expiration)
//!!mikeuserSchema.index({ verifyCodeExpiresAt: 1 }, { expireAfterSeconds: 0 });
//!!mikeuserSchema.index({ resetCodeExpiresAt: 1 }, { expireAfterSeconds: 0 });

// Login-related index
userSchema.index({ lockUntil: 1 });

/**
 * INSTANCE METHODS
 */

// Compare password hashes
userSchema.methods.verifyPassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Check if account is locked
userSchema.methods.isAccountLocked = function () {
  return !!this.lockUntil && this.lockUntil > Date.now();
};

// Reset account lock
userSchema.methods.resetLock = function () {
  this.failedLoginAttempts = 0;
  this.lockUntil = undefined;
};

// Increment login attempts and possibly lock
userSchema.methods.incrementLoginAttempts = function () {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    this.lockUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS);
  }
};

// Generate email verification code
userSchema.methods.generateVerifyCode = function () {
  const code = generateCode();
  this.verifyCode = code;
  this.verifyCodeExpiresAt = new Date(
    Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000
  );
  return code;
};

// Generate password reset code
userSchema.methods.generateResetCode = function () {
  const code = generateCode();
  this.resetCode = code;
  this.resetCodeExpiresAt = new Date(
    Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000
  );
  return code;
};

/**
 * PRE-SAVE HOOK
 * Hash password if modified
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = userSchema;
