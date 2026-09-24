import { getDb } from "@/lib/db";

export function GET() {
  getDb().prepare("SELECT 1").get();
  return Response.json({ status: "ok" });
}
