import { isDemoMode } from "@/lib/store";
import { getBankSubject, getBankTopics } from "@/lib/bank";

export const runtime = "nodejs";

/** إعدادات عامة للعميل: الوضع، رابط الموقع، مواضيع بنك الأسئلة */
export async function GET() {
  return Response.json({
    demo: isDemoMode(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    subject: getBankSubject(),
    topics: getBankTopics(),
  });
}
