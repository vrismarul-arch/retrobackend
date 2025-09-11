import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();
/* jkj */
// Initialize Firebase only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "")
        : undefined,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}
/*  */

/**
 * Send push notification to a device token
 * @param {string} token - FCM device token
 * @param {object} payload - { title, body, data }
 */
export const sendPushNotification = async (token, payload) => {
  if (!token) return;
  try {
    await admin.messaging().send({
      token,
      notification: {
        title: payload.title || "Notification",
        body: payload.body || "",
      },
      data: payload.data || {},
    });
    console.log("✅ Push notification sent");
  } catch (err) {
    console.error("❌ Push notification error:", err);
  }
};
