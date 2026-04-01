import { NextResponse } from "next/server";
import { getPolicyDashboard } from "@/services/policy-feed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getPolicyDashboard();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/policy-feed]", error);
    return NextResponse.json({ error: "Policy feed failed" }, { status: 500 });
  }
}
