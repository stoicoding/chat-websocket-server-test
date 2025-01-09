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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const admin = __importStar(require("firebase-admin"));
const Device_1 = __importDefault(require("../models/Device"));
class NotificationService {
    constructor() {
        // Initialize Firebase Admin with your service account
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                // You can also use a service account file:
                // credential: admin.credential.cert(require('path/to/serviceAccountKey.json')),
            });
        }
    }
    async sendNotification(userId, message) {
        try {
            // Find user's devices
            const devices = await Device_1.default.find({ userId });
            if (devices.length === 0) {
                return;
            }
            const notification = {
                notification: {
                    title: message.senderName,
                    body: message.content
                },
                data: {
                    messageFrom: message.senderName
                },
                apns: {
                    payload: {
                        aps: {
                            'mutable-content': 1,
                            sound: 'default'
                        }
                    }
                }
            };
            // Send to all user's devices
            for (const device of devices) {
                try {
                    await admin.messaging().send({
                        ...notification,
                        token: device.deviceToken
                    });
                }
                catch (error) {
                    const firebaseError = error;
                    if (firebaseError.code === 'messaging/invalid-registration-token' ||
                        firebaseError.code === 'messaging/registration-token-not-registered') {
                        // Remove invalid token
                        await Device_1.default.deleteOne({ deviceToken: device.deviceToken });
                    }
                    else {
                        console.error('Error sending to device:', firebaseError);
                    }
                }
            }
        }
        catch (error) {
            console.error('Error sending push notification:', error);
        }
    }
    async registerDevice(userId, deviceToken) {
        try {
            await Device_1.default.findOneAndUpdate({ deviceToken }, { userId, deviceToken }, { upsert: true, new: true });
            console.log(`Registered device token for user ${userId}`);
        }
        catch (error) {
            console.error('Error registering device:', error);
        }
    }
}
exports.NotificationService = NotificationService;
