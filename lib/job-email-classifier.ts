import type { ApplicationStatus } from "@/lib/types";

type RawEmail = {
  from: string;
  subject: string;
  snippet: string;
  details?: string;
  links?: string[];
  date: Date;
};

export type ClassifiedJobEmail = {
  company: string;
  role: string;
  status: ApplicationStatus;
  confidence: number;
  summary: string;
};

export type ClassifiedOpportunityEmail = {
  title: string;
  source: string;
  summary: string;
};

const rejectedSignals = [
  "unfortunately",
  "not moving forward",
  "decided to move forward with other candidates",
  "will not be proceeding",
  "not selected",
  "unable to offer",
  "position has been filled",
];

const appliedSignals = [
  "thank you for applying",
  "application received",
  "received your application",
  "we have received",
  "your application was submitted",
  "thanks for your interest",
  "your application to",
  "you applied",
];

const waitingSignals = [
  "your interview",
  "interview invitation",
  "schedule your interview",
  "schedule a call",
  "next steps",
  "your availability",
  "phone screen",
  "technical screen",
  "assessment",
  "coding assessment",
];

const opportunitySignals = [
  "job alert",
  "recommended jobs",
  "recommendations",
  "your recommendations",
  "new jobs for you",
  "jobs you may be interested in",
  "similar jobs",
  "hiring now",
  "apply now",
  "newsletter",
  "digest",
  "substack",
  "how i extract",
  "career advice",
  "job search tips",
];

export function classifyJobEmail(email: RawEmail): ClassifiedJobEmail | null {
  const text = getEmailText(email);

  if (isOpportunityEmail(email)) {
    return null;
  }

  const rejectedScore = score(text, rejectedSignals);
  const appliedScore = score(text, appliedSignals);
  const waitingScore = score(text, waitingSignals);
  const best = Math.max(rejectedScore, appliedScore, waitingScore);

  if (best === 0) {
    return null;
  }

  const hasApplicationContext =
    /your application|you applied|thank you for applying|application received|received your application|interview|assessment|not selected|unfortunately|not moving forward/.test(
      text,
    );

  if (!hasApplicationContext) {
    return null;
  }

  return {
    company: extractCompany(email.from, email.subject),
    role: extractRole(email.subject),
    status:
      rejectedScore === best ? "REJECTED" : appliedScore === best ? "APPLIED" : "WAITING",
    confidence: Math.min(0.95, 0.55 + best * 0.15),
    summary: email.snippet || email.subject,
  };
}

export function classifyOpportunityEmail(email: RawEmail): ClassifiedOpportunityEmail | null {
  const text = getEmailText(email);

  if (!isOpportunityEmail(email)) {
    return null;
  }

  const links = email.links ?? [];

  if (links.length === 0 && !/apply now|job|role|opening|hiring/.test(text)) {
    return null;
  }

  return {
    title: extractOpportunityTitle(email.subject),
    source: extractOpportunitySource(email.from),
    summary: summarizeOpportunity(email),
  };
}

function score(text: string, signals: string[]) {
  return signals.reduce((total, signal) => total + (text.includes(signal) ? 1 : 0), 0);
}

function getEmailText(email: RawEmail) {
  return `${email.from} ${email.subject} ${email.snippet} ${email.details ?? ""}`.toLowerCase();
}

function isOpportunityEmail(email: RawEmail) {
  const text = getEmailText(email);
  const from = email.from.toLowerCase();

  if (/linkedin|naukri|substack|indeed|wellfound|instahyre|cutshort|internshala/.test(from)) {
    if (/recommendations|newsletter|digest|job alert|recommended jobs|new jobs|career advice|substack/.test(text)) {
      return true;
    }

    return !/thank you for applying|application received|interview invitation|unfortunately/.test(text);
  }

  return opportunitySignals.some((signal) => text.includes(signal));
}

function extractCompany(from: string, subject: string) {
  const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
  if (nameMatch?.[1]) {
    return tidy(nameMatch[1].replace(/recruiting|careers|talent|jobs/gi, ""));
  }

  const domainMatch = from.match(/@([a-z0-9-]+)\./i);
  if (domainMatch?.[1]) {
    return titleCase(domainMatch[1].replace(/-/g, " "));
  }

  const subjectCompany = subject.match(/at\s+([A-Z][A-Za-z0-9 &.-]+)/);
  return subjectCompany?.[1] ? tidy(subjectCompany[1]) : "Unknown Company";
}

function extractRole(subject: string) {
  const patterns = [
    /application for\s+(.+?)(?:\s+at|\s+-|$)/i,
    /your\s+(.+?)\s+application/i,
    /for the\s+(.+?)\s+(?:role|position)/i,
    /regarding\s+(.+?)(?:\s+at|\s+-|$)/i,
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern);
    if (match?.[1]) {
      return tidy(match[1]);
    }
  }

  return "Role to confirm";
}

function extractOpportunitySource(from: string) {
  const source = extractCompany(from, "");
  return source === "Unknown Company" ? "Job alert" : source;
}

function extractOpportunityTitle(subject: string) {
  return tidy(
    subject
      .replace(/^re:\s*/i, "")
      .replace(/\s*\|\s*linkedin.*$/i, "")
      .replace(/\s*-\s*linkedin.*$/i, "")
      .replace(/\s*\|\s*naukri.*$/i, "")
      .replace(/\s*newsletter.*$/i, "")
      .slice(0, 90),
  );
}

function summarizeOpportunity(email: RawEmail) {
  const text = cleanOpportunityText(email.details || email.snippet || email.subject);
  return text.slice(0, 260) || "Job opportunity email with links to roles you may want to apply for.";
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

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function tidy(value: string) {
  return titleCase(value.replace(/\s+/g, " ").replace(/[|:()[\]]/g, "").trim());
}
