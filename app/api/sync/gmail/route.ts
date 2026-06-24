import { NextResponse } from "next/server";
import { syncGmail } from "@/lib/google";
import { readGmailTokensCookie } from "@/lib/gmail-token-cookie";
import { addSyncRun } from "@/lib/store";

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
    const result = await syncGmail(await readGmailTokensCookie(), {
      persistToFiles: process.env.NODE_ENV !== "production",
    });

    try {
      await addSyncRun({ status: "success", scanned: result.scanned, imported: result.imported });
    } catch {
      // Sync run history is optional on Vercel because app data is kept in Dexie.
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    try {
      await addSyncRun({ status: "error", scanned: 0, imported: 0, message });
    } catch {
      // Sync run history is optional on Vercel because app data is kept in Dexie.
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
