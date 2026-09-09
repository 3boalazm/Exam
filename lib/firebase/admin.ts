/**
 * Firebase Admin (Server-side فقط).
 * كل قراءة/كتابة للبيانات الحساسة (الإجابات الصحيحة، التصحيح، النتائج)
 * تمر عبر Admin SDK — لا يصل أي شيء منها لواجهة الطالب.
 *
 * يعمل على Vercel (Serverless): بدون قاعدة اتصال محفوظة،
 * كل عملية stateless.
 */
import * as admin from "firebase-admin";

function getAdminApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0] as admin.app.App;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON غير محدد — استخدم الوضع التجريبي أو فعّل Firebase"
    );
  }
  return admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(json)),
  });
}

export function getAdminDb(): admin.firestore.Firestore {
  return admin.firestore(getAdminApp());
}

export function getAdminAuth(): admin.auth.Auth {
  return admin.auth(getAdminApp());
}
