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
const MessageSchema = new mongoose_1.Schema({
    roomId: { type: String, required: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    messageType: { type: String, enum: ['text', 'system'], default: 'text' }
}, {
    timestamps: true
});
// Compound index for efficient room message queries with timestamp
// This index is used when we want to fetch the latest messages in a room
// It allows us to quickly find the latest messages in a room, and
// then fetch the messages in the correct order
MessageSchema.index({ roomId: 1, timestamp: -1 }, { name: 'roomId_1_timestamp_-1' });
// Index for user message history queries
// This index is used when we want to fetch the message history of a user
// It allows us to quickly find all the messages sent by a user
MessageSchema.index({ senderId: 1, timestamp: -1 }, { name: 'senderId_1_timestamp_-1' });
// Create a compound index that includes messageType for filtering system messages
// This index is used when we want to fetch all the messages in a room
// that are not system messages
// It allows us to quickly find all non-system messages in a room, and
// then fetch the messages in the correct order
MessageSchema.index({ roomId: 1, messageType: 1, timestamp: -1 }, { name: 'roomId_1_messageType_1_timestamp_-1' });
exports.default = mongoose_1.default.model('Message', MessageSchema);
