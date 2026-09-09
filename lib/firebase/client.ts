/**
 * Firebase Client SDK — للمصادقة (Auth) فقط في المتصفح.
 * لا نستخدم Firestore من العميل إطلاقًا: كل البيانات عبر API
 * (Admin SDK) حتى لا تصل الإجابات الصحيحة لواجهة الطالب.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

function clientConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function isFirebaseClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
}

export function getClientApp(): FirebaseApp {
  if (getApps().length) return getApp();
  const cfg = clientConfig();
  if (!cfg.apiKey) {
    throw new Error("إعدادات Firebase غير موجودة (NEXT_PUBLIC_FIREBASE_*)");
  }
  return initializeApp(cfg);
}

export function getClientAuth(): Auth {
  return getAuth(getClientApp());
}

export async function signInClient(
  email: string,
  password: string
): Promise<void> {
  const auth = getClientAuth();
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpClient(
  email: string,
  password: string,
  name?: string
): Promise<void> {
  const auth = getClientAuth();
  await createUserWithEmailAndPassword(auth, email, password);
  if (name?.trim()) {
    const user = auth.currentUser;
    if (user) {
      const { updateProfile } = await import("firebase/auth");
      await updateProfile(user, { displayName: name.trim() });
    }
  }
}

export async function signOutClient(): Promise<void> {
  const auth = getClientAuth();
  await signOut(auth);
}
