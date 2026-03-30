import { NextResponse } from "next/server";
import { buildEventPlaybook } from "@/services/event-playbook";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventTitle = searchParams.get("event") ?? "";
  const months = parseInt(searchParams.get("months") ?? "24");

  if (!eventTitle) return NextResponse.json({ error: "event param required" }, { status: 400 });

  try {
    const playbook = await buildEventPlaybook(eventTitle, months);
    if (!playbook) return NextResponse.json({ error: "No playbook available for this event type" }, { status: 404 });
    return NextResponse.json(playbook, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (error) {
    console.error("[api/event-playbook]", error);
    return NextResponse.json({ error: "Playbook failed" }, { status: 500 });
  }
}
