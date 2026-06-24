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
  const applications = await db.applications.orderBy("updatedAt").reverse().toArray();
  const hasRealApplications = applications.some((application) => application.source !== "demo");

  return hasRealApplications
    ? applications.filter((application) => application.source !== "demo")
    : applications;
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
    const incomingApplications = data.applications ?? [];
    const incomingOpportunities = data.opportunities ?? [];
    const hasIncomingGmailData =
      incomingApplications.some((application) => application.source === "gmail") ||
      incomingOpportunities.some((opportunity) => Boolean(opportunity.emailId));

    if (hasIncomingGmailData) {
      const existingApplications = await db.applications.toArray();
      const withoutDemoApplications = existingApplications.filter((application) => application.source !== "demo");

      if (withoutDemoApplications.length !== existingApplications.length) {
        await db.applications.clear();
        if (withoutDemoApplications.length > 0) {
          await db.applications.bulkPut(withoutDemoApplications);
        }
      }
    }

    if (incomingApplications.length > 0) {
      const existingApplications = await db.applications.toArray();
      const mergedApplications = dedupeApplications([
        ...existingApplications,
        ...incomingApplications,
      ]);
      const hasRealApplications = mergedApplications.some((application) => application.source !== "demo");
      const visibleApplications = hasRealApplications
        ? mergedApplications.filter((application) => application.source !== "demo")
        : mergedApplications;

      await db.applications.clear();
      await db.applications.bulkPut(visibleApplications);

      const applicationEmailIds = new Set(
        visibleApplications.map((application) => application.emailId).filter(Boolean),
      );
      if (applicationEmailIds.size > 0) {
        const opportunities = await db.opportunities.toArray();
        await db.opportunities.clear();
        await db.opportunities.bulkPut(
          opportunities.filter((opportunity) => !opportunity.emailId || !applicationEmailIds.has(opportunity.emailId)),
        );
      }
    }

    if (incomingOpportunities.length > 0) {
      const applicationEmailIds = new Set(
        (await db.applications.toArray()).map((application) => application.emailId).filter(Boolean),
      );
      const existingOpportunities = await db.opportunities.toArray();
      const mergedOpportunities = dedupeOpportunities([
        ...existingOpportunities,
        ...incomingOpportunities.filter((opportunity) => !opportunity.emailId || !applicationEmailIds.has(opportunity.emailId)),
      ]);

      await db.opportunities.clear();
      await db.opportunities.bulkPut(mergedOpportunities);
    }
  });
}

function dedupeApplications(applications: JobApplication[]) {
  const byKey = new Map<string, JobApplication>();

  for (const application of applications) {
    const key = application.emailId
      ? `email:${application.emailId}`
      : `job:${normalizeKey(application.company)}:${normalizeKey(application.role)}:${application.status}`;
    const existing = byKey.get(key);

    if (!existing || new Date(application.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
      byKey.set(key, application);
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function dedupeOpportunities(opportunities: JobOpportunity[]) {
  const byKey = new Map<string, JobOpportunity>();

  for (const opportunity of opportunities) {
    const key = opportunity.emailId
      ? `email:${opportunity.emailId}`
      : `opportunity:${normalizeKey(opportunity.source)}:${normalizeKey(opportunity.title)}:${normalizeKey(opportunity.summary).slice(0, 80)}`;
    const existing = byKey.get(key);

    if (!existing || new Date(opportunity.receivedAt).getTime() >= new Date(existing.receivedAt).getTime()) {
      byKey.set(key, opportunity);
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
