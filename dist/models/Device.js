"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const DeviceSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    deviceToken: { type: String, required: true, unique: true },
    lastActive: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});
// Add compound index for user devices to quickly find the most recently active devices per user
// The index is ordered by userId and lastActive (in descending order)
// This is useful for finding the most recently active devices for a user
DeviceSchema.index({ userId: 1, lastActive: -1 });
// Add TTL index for inactive devices (90 days)
DeviceSchema.index({ lastActive: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
// Update lastActive timestamp when device is used
DeviceSchema.methods.updateActivity = function () {
    this.lastActive = new Date();
    return this.save();
};
exports.default = mongoose_1.default.model('Device', DeviceSchema);
