import * as admin from 'firebase-admin';
import Device from '../models/Device';

interface FirebaseError extends Error {
  code: string;
  message: string;
}

export class NotificationService {
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

  async sendNotification(userId: string, message: { senderName: string; content: string }) {
    try {
      // Find user's devices
      const devices = await Device.find({ userId });
      
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
        } catch (error) {
          const firebaseError = error as FirebaseError;
          if (firebaseError.code === 'messaging/invalid-registration-token' ||
              firebaseError.code === 'messaging/registration-token-not-registered') {
            // Remove invalid token
            await Device.deleteOne({ deviceToken: device.deviceToken });
          } else {
            console.error('Error sending to device:', firebaseError);
          }
        }
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  async registerDevice(userId: string, deviceToken: string) {
    try {
      await Device.findOneAndUpdate(
        { deviceToken },
        { userId, deviceToken },
        { upsert: true, new: true }
      );
      console.log(`Registered device token for user ${userId}`);
    } catch (error) {
      console.error('Error registering device:', error);
    }
  }
}
