import { promises as fs } from "node:fs";
import path from "node:path";
import type { GmailTokens, JobApplication, JobOpportunity, SyncRun } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const applicationsPath = path.join(dataDir, "applications.json");
const opportunitiesPath = path.join(dataDir, "opportunities.json");
const syncRunsPath = path.join(dataDir, "sync-runs.json");
const tokensPath = path.join(dataDir, "gmail-tokens.json");

const demoApplications: JobApplication[] = [
  {
    id: "demo-1",
    company: "Acme Labs",
    role: "Frontend Engineer Intern",
    status: "APPLIED",
    source: "demo",
    summary:
      "Applied for Frontend Engineer Intern at Acme Labs. The email confirms the application was received and includes a job post link for follow-up research.",
    details:
      "This demo card shows how application confirmations appear after Gmail sync. Real cards include the subject, sender, extracted links, and a direct Gmail link when available.",
    subject: "Thank you for applying to Acme Labs",
    from: "Acme Labs Careers",
    links: ["https://example.com/jobs/frontend-engineer-intern"],
    lastSeenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    company: "Northstar AI",
    role: "Software Engineer",
    status: "WAITING",
    source: "demo",
    summary:
      "Waiting on Northstar AI for the Software Engineer process. The recruiter asked for availability, so the next action is to reply or track interview scheduling.",
    details:
      "This demo card represents an active conversation where the next move is waiting on scheduling or recruiter follow-up.",
    subject: "Next steps for Software Engineer",
    from: "Northstar AI Talent",
    links: ["https://example.com/interview-schedule"],
    lastSeenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-3",
    company: "Bright Systems",
    role: "Full Stack Developer",
    status: "REJECTED",
    source: "demo",
    summary:
      "Bright Systems moved the Full Stack Developer application to rejected. Keep the role notes for future keyword matching and follow-up pattern review.",
    details:
      "This demo card shows how rejection emails move into the rejected column automatically after a Gmail scan.",
    subject: "Update on your Full Stack Developer application",
    from: "Bright Systems Recruiting",
    lastSeenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function readApplications() {
  const applications = normalizeApplications(await readJson<JobApplication[]>(applicationsPath, []));
  return applications.length > 0 ? applications : demoApplications;
}

export async function readStoredApplications() {
  return normalizeApplications(await readJson<JobApplication[]>(applicationsPath, []));
}

export async function writeApplications(applications: JobApplication[]) {
  await writeJson(applicationsPath, applications);
}

export async function readOpportunities() {
  return normalizeOpportunities(await readJson<JobOpportunity[]>(opportunitiesPath, []));
}

export async function writeOpportunities(opportunities: JobOpportunity[]) {
  await writeJson(opportunitiesPath, opportunities);
}

export async function readSyncRuns() {
  return readJson<SyncRun[]>(syncRunsPath, []);
}

export async function addSyncRun(run: Omit<SyncRun, "id" | "createdAt">) {
  const runs = await readSyncRuns();
  const nextRun: SyncRun = {
    ...run,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  await writeJson(syncRunsPath, [nextRun, ...runs].slice(0, 20));
  return nextRun;
}

export async function readGmailTokens() {
  return readJson<GmailTokens | null>(tokensPath, null);
}

export async function writeGmailTokens(tokens: GmailTokens) {
  await writeJson(tokensPath, tokens);
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function writeJson<T>(filePath: string, value: T) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeApplications(applications: JobApplication[]) {
  return applications
    .filter((application) => !isLikelyOpportunity(application))
    .map((application) => ({
      ...application,
      summary: decodeHtmlEntities(application.summary),
      details: application.details ? decodeHtmlEntities(application.details) : undefined,
      from:
        application.from && application.from !== "Manual entry"
          ? decodeHtmlEntities(application.from)
          : undefined,
      subject:
        application.subject && application.subject !== "No email subject"
          ? decodeHtmlEntities(application.subject)
          : undefined,
    }));
}

function normalizeOpportunities(opportunities: JobOpportunity[]) {
  return opportunities.map((opportunity) => ({
    ...opportunity,
    summary: cleanOpportunityText(decodeHtmlEntities(opportunity.summary)),
    from: opportunity.from ? decodeHtmlEntities(opportunity.from) : undefined,
    subject: opportunity.subject ? decodeHtmlEntities(opportunity.subject) : undefined,
  }));
}

function isLikelyOpportunity(application: JobApplication) {
  const text = `${application.from ?? ""} ${application.subject ?? ""} ${application.summary ?? ""}`.toLowerCase();

  return (
    /linkedin|naukri campus|naukri|substack|job alert|jobs alert|recommended jobs|recommendations|new jobs|weekly digest|newsletter|career advice/.test(text) &&
    !/thank you for applying|application received|interview invitation|unfortunately|not moving forward/.test(text)
  );
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function cleanOpportunityText(value: string) {
  return value
    .replace(/<https?:\/\/[^>]+>/gi, " ")
    .replace(/https?:\/\/[^\s)>"']+/gi, " ")
    .replace(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, " ")
    .replace(/[-_]{4,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
