export type ApplicationStatus = "APPLIED" | "WAITING" | "REJECTED";

export type JobApplication = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  source: "gmail" | "manual" | "demo";
  summary: string;
  details?: string;
  subject?: string;
  from?: string;
  emailId?: string;
  emailUrl?: string;
  links?: string[];
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type JobOpportunity = {
  id: string;
  title: string;
  source: string;
  summary: string;
  subject?: string;
  from?: string;
  emailId?: string;
  emailUrl?: string;
  links: string[];
  receivedAt: string;
  createdAt: string;
};

export type SyncRun = {
  id: string;
  status: "success" | "error";
  scanned: number;
  imported: number;
  message?: string;
  createdAt: string;
};

export type GmailTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  token_type?: string | null;
  scope?: string;
  accountEmail?: string | null;
};
