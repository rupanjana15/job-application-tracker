"use client";

import { useRef, useState } from "react";
import { exportJobTrackData, importJobTrackData, mergeJobTrackData, type JobTrackExport } from "@/lib/local-db";
import { ThemeToggle } from "@/components/theme-toggle";
import type { JobApplication, JobOpportunity } from "@/lib/types";

type SyncResponse = {
  applications: JobApplication[];
  opportunities: JobOpportunity[];
};

export function DataControls({ isConnected, variant = "topbar" }: { isConnected: boolean; variant?: "topbar" | "sidebar" }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);

  async function exportJson() {
    const data = await exportJobTrackData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `jobtrack-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File | undefined) {
    if (!file) {
      return;
    }

    const text = await file.text();
    const data = JSON.parse(text) as JobTrackExport;

    await importJobTrackData(data);
    window.location.reload();
  }

  async function scanGmail() {
    setIsScanning(true);

    try {
      const response = await fetch("/api/sync/gmail", { method: "POST" });

      if (!response.ok) {
        throw new Error("Gmail scan failed.");
      }

      const data = (await response.json()) as SyncResponse;
      await mergeJobTrackData(data);
      window.location.reload();
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className={variant === "sidebar" ? "sidebar-controls" : "actions"}>
      <ThemeToggle />
      <a className={isConnected ? "button button-secondary" : "button"} href="/api/google/connect">
        {isConnected ? "Reconnect Gmail" : "Connect Gmail"}
      </a>
      <button className="button button-secondary" type="button" onClick={scanGmail} disabled={isScanning}>
        {isScanning ? "Scanning..." : "Scan Gmail"}
      </button>
      <button className="button button-secondary" type="button" onClick={exportJson}>
        Export JSON
      </button>
      <button className="button button-secondary" type="button" onClick={() => fileInputRef.current?.click()}>
        Import JSON
      </button>
      <input
        ref={fileInputRef}
        className="hidden-file"
        type="file"
        accept="application/json,.json"
        onChange={(event) => importJson(event.target.files?.[0])}
      />
    </div>
  );
}
