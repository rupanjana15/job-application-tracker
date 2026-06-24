import { NextResponse } from "next/server";
import { syncGmail } from "@/lib/google";
import { addSyncRun, readOpportunities, readStoredApplications } from "@/lib/store";

export async function POST() {
  return runSync();
}

export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");

  if (!process.env.SYNC_CRON_SECRET || secret !== process.env.SYNC_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runSync();
}

async function runSync() {
  try {
    const result = await syncGmail();
    await addSyncRun({ status: "success", ...result });

    return NextResponse.json({
      ...result,
      applications: await readStoredApplications(),
      opportunities: await readOpportunities(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await addSyncRun({ status: "error", scanned: 0, imported: 0, message });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
