import { NextResponse } from "next/server";
import { readOpportunities, writeOpportunities } from "@/lib/store";

export async function DELETE(request: Request) {
  const body = (await request.json()) as { id?: string };

  if (!body.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const opportunities = await readOpportunities();
  await writeOpportunities(opportunities.filter((opportunity) => opportunity.id !== body.id));

  return NextResponse.json({ ok: true });
}
