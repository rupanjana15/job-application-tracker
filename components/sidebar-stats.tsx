"use client";

import { useEffect, useState } from "react";
import { readLocalApplications, seedLocalData } from "@/lib/local-db";
import type { JobApplication, SyncRun } from "@/lib/types";
import { DataControls } from "@/components/data-controls";

type Counts = {
  applied: number;
  waiting: number;
  rejected: number;
};

export function SidebarStats({
  accountEmail,
  initialApplications,
  isConnected,
  latestSync,
}: {
  accountEmail?: string | null;
  initialApplications: JobApplication[];
  isConnected: boolean;
  latestSync?: SyncRun | null;
}) {
  const [counts, setCounts] = useState<Counts>({ applied: 0, waiting: 0, rejected: 0 });

  useEffect(() => {
    async function refreshCounts() {
      await seedLocalData(initialApplications, []);
      const applications = await readLocalApplications();

      setCounts({
        applied: applications.filter((application) => application.status === "APPLIED").length,
        waiting: applications.filter((application) => application.status === "WAITING").length,
        rejected: applications.filter((application) => application.status === "REJECTED").length,
      });
    }

    refreshCounts();
    window.addEventListener("jobtrack:data", refreshCounts);
    return () => window.removeEventListener("jobtrack:data", refreshCounts);
  }, [initialApplications]);

  return (
    <div className="sidebar-bottom">
      <DataControls isConnected={isConnected} variant="sidebar" />

      <div className="mini-sync-card">
        <span>Sync status</span>
        <strong>
          {latestSync
            ? `${latestSync.status}: ${latestSync.scanned} scanned`
            : "Ready"}
        </strong>
        {latestSync?.message ? <small>{latestSync.message}</small> : null}
      </div>

      <div className="stat-stack">
        <SidebarStat label="Gmail sync" value={isConnected ? "Connected" : "Setup"} />
        <SidebarStat label="Account" value={accountEmail ?? "Not connected"} />
        <SidebarStat label="Refresh" value="2x daily" />
      </div>

      <div className="stat-stack sidebar-counts">
        <SidebarStat label="Applied" value={String(counts.applied)} />
        <SidebarStat label="Waiting" value={String(counts.waiting)} />
        <SidebarStat label="Rejected" value={String(counts.rejected)} />
      </div>
    </div>
  );
}

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sidebar-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
