"use client";

import Dexie, { type Table } from "dexie";
import type { JobApplication, JobOpportunity } from "@/lib/types";

export type JobTrackExport = {
  version: 1;
  exportedAt: string;
  applications: JobApplication[];
  opportunities: JobOpportunity[];
};

class JobTrackDatabase extends Dexie {
  applications!: Table<JobApplication, string>;
  opportunities!: Table<JobOpportunity, string>;

  constructor() {
    super("jobtrack-local");
    this.version(1).stores({
      applications: "id, status, company, role, lastSeenAt, updatedAt, emailId",
      opportunities: "id, source, title, receivedAt, emailId",
    });
  }
}

export const db = new JobTrackDatabase();

export async function seedLocalData(applications: JobApplication[], opportunities: JobOpportunity[]) {
  const [applicationCount, opportunityCount] = await Promise.all([
    db.applications.count(),
    db.opportunities.count(),
  ]);

  if (applicationCount === 0 && applications.length > 0) {
    await db.applications.bulkPut(applications);
  }

  if (opportunityCount === 0 && opportunities.length > 0) {
    await db.opportunities.bulkPut(opportunities);
  }
}

export async function readLocalApplications() {
  return db.applications.orderBy("updatedAt").reverse().toArray();
}

export async function readLocalOpportunities() {
  return db.opportunities.orderBy("receivedAt").reverse().toArray();
}

export async function putApplication(application: JobApplication) {
  await db.applications.put(application);
}

export async function deleteApplication(id: string) {
  await db.applications.delete(id);
}

export async function putApplications(applications: JobApplication[]) {
  if (applications.length > 0) {
    await db.applications.bulkPut(applications);
  }
}

export async function putOpportunities(opportunities: JobOpportunity[]) {
  if (opportunities.length > 0) {
    await db.opportunities.bulkPut(opportunities);
  }
}

export async function deleteOpportunity(id: string) {
  await db.opportunities.delete(id);
}

export async function exportJobTrackData(): Promise<JobTrackExport> {
  const [applications, opportunities] = await Promise.all([
    readLocalApplications(),
    readLocalOpportunities(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    applications,
    opportunities,
  };
}

export async function importJobTrackData(data: JobTrackExport) {
  await db.transaction("rw", db.applications, db.opportunities, async () => {
    await db.applications.clear();
    await db.opportunities.clear();
    await db.applications.bulkPut(data.applications ?? []);
    await db.opportunities.bulkPut(data.opportunities ?? []);
  });
}

export async function mergeJobTrackData(data: Pick<JobTrackExport, "applications" | "opportunities">) {
  await db.transaction("rw", db.applications, db.opportunities, async () => {
    await putApplications(data.applications ?? []);
    await putOpportunities(data.opportunities ?? []);
  });
}
