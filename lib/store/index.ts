import { DemoStore } from "./demo-store";
import { FirebaseStore } from "./firebase-store";
import type { AppStore } from "./types";

export type { AppStore } from "./types";

/**
 * تحديد الوضع:
 * - DEMO_MODE=1 → تجريبي إجباري
 * - DEMO_MODE=0 → Firebase إجباريًا
 * - فارغ → تلقائي: بدون FIREBASE_SERVICE_ACCOUNT_JSON = تجريبي
 */
export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "1") return true;
  if (process.env.DEMO_MODE === "0") return false;
  return !process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
}

let instance: AppStore | null = null;

export function getStore(): AppStore {
  if (!instance) {
    instance = isDemoMode() ? new DemoStore() : new FirebaseStore();
  }
  return instance;
}
