import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import { classifyJobEmail, classifyOpportunityEmail } from "@/lib/job-email-classifier";
import {
  readGmailTokens,
  readOpportunities,
  readStoredApplications,
  writeApplications,
  writeGmailTokens,
  writeOpportunities,
} from "@/lib/store";

type GmailHeader = {
  name?: string | null;
  value?: string | null;
};

const gmailQuery = [
  "newer_than:90d",
  "(",
  "subject:(application OR interview OR recruiter OR applied OR rejection OR offer OR jobs OR hiring)",
  "OR",
  "from:(greenhouse.io OR lever.co OR ashbyhq.com OR workday.com OR smartrecruiters.com OR linkedin.com OR naukri.com OR substack.com OR instahyre.com OR cutshort.io)",
  ")",
].join(" ");

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${baseUrl}/api/google/callback`,
  );
}

export function getGoogleAuthUrl() {
  return getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  });
}

export async function saveGoogleCode(code: string) {
  const oauth = getOAuthClient();
  const { tokens } = await oauth.getToken(code);
  oauth.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth });
  const profile = await oauth2.userinfo.get();

  await writeGmailTokens({
    ...tokens,
    accountEmail: profile.data.email ?? null,
  });
}

export async function syncGmail() {
  const tokens = await readGmailTokens();

  if (!tokens?.refresh_token && !tokens?.access_token) {
    throw new Error("Gmail is not connected yet.");
  }

  const oauth = getOAuthClient();
  oauth.setCredentials(tokens);
  oauth.on("tokens", async (nextTokens) => {
    await writeGmailTokens({ ...tokens, ...nextTokens });
  });

  const gmail = google.gmail({ version: "v1", auth: oauth });
  const list = await gmail.users.messages.list({
    userId: "me",
    q: gmailQuery,
    maxResults: 30,
  });

  const messages = list.data.messages ?? [];
  const applications = await readStoredApplications();
  const opportunities = await readOpportunities();
  let imported = 0;
  let opportunityImported = 0;

  for (const message of messages) {
    if (
      !message.id ||
      applications.some((app) => app.emailId === message.id) ||
      opportunities.some((opportunity) => opportunity.emailId === message.id)
    ) {
      continue;
    }

    const raw = await readGmailMessage(gmail, message.id);
    const classification = classifyJobEmail(raw);

    if (!classification) {
      const opportunity = classifyOpportunityEmail(raw);

      if (opportunity) {
        opportunities.unshift({
          id: crypto.randomUUID(),
          title: opportunity.title,
          source: opportunity.source,
          summary: opportunity.summary,
          subject: raw.subject,
          from: raw.from,
          emailId: message.id,
          emailUrl: raw.emailUrl,
          links: raw.links,
          receivedAt: raw.date.toISOString(),
          createdAt: new Date().toISOString(),
        });
        opportunityImported += 1;
      }

      continue;
    }

    const existingIndex = applications.findIndex(
      (app) =>
        normalize(app.company) === normalize(classification.company) &&
        normalize(app.role) === normalize(classification.role),
    );
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      applications[existingIndex] = {
        ...applications[existingIndex],
        status: classification.status,
        summary: buildJobSummary(classification, raw),
        details: raw.details,
        subject: raw.subject,
        from: raw.from,
        emailId: message.id,
        emailUrl: raw.emailUrl,
        links: raw.links,
        lastSeenAt: raw.date.toISOString(),
        updatedAt: now,
      };
    } else {
      applications.unshift({
        id: crypto.randomUUID(),
        company: classification.company,
        role: classification.role,
        status: classification.status,
        source: "gmail",
        summary: buildJobSummary(classification, raw),
        details: raw.details,
        subject: raw.subject,
        from: raw.from,
        emailId: message.id,
        emailUrl: raw.emailUrl,
        links: raw.links,
        lastSeenAt: raw.date.toISOString(),
        createdAt: now,
        updatedAt: now,
      });
    }

    imported += 1;
  }

  await writeApplications(applications);
  await writeOpportunities(opportunities.slice(0, 80));

  return {
    scanned: messages.length,
    imported: imported + opportunityImported,
  };
}

async function readGmailMessage(gmail: gmail_v1.Gmail, id: string) {
  const message = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "full",
    metadataHeaders: ["From", "Subject", "Date"],
  });
  const headers = message.data.payload?.headers as GmailHeader[] | undefined;
  const internalDate = message.data.internalDate
    ? Number(message.data.internalDate)
    : Date.now();
  const body = extractBody(message.data.payload);
  const details = cleanEmailText(body.text || message.data.snippet || "");
  const links = Array.from(new Set([...body.links, ...extractLinks(details)])).slice(0, 8);

  return {
    from: getHeader(headers, "From"),
    subject: getHeader(headers, "Subject"),
    snippet: message.data.snippet ?? "",
    details,
    links,
    emailUrl: `https://mail.google.com/mail/u/0/#all/${message.data.threadId ?? id}`,
    date: new Date(getHeader(headers, "Date") || internalDate),
  };
}

function getHeader(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildJobSummary(
  classification: { company: string; role: string; status: string; summary: string },
  raw: { details: string; snippet: string; subject: string; from: string; links: string[] },
) {
  const statusLead =
    classification.status === "APPLIED"
      ? `Applied for ${classification.role} at ${classification.company}.`
      : classification.status === "WAITING"
        ? `Waiting on ${classification.company} for the ${classification.role} process.`
        : `${classification.company} moved the ${classification.role} application to rejected.`;
  const emailContext = summarizeEmail(raw.details || raw.snippet || raw.subject || classification.summary);
  const linkContext =
    raw.links.length > 0
      ? `Found ${raw.links.length} useful link${raw.links.length === 1 ? "" : "s"} in the email.`
      : "No useful links were found in the email, so use the research links to investigate the company.";

  return `${statusLead} ${emailContext} ${linkContext}`.slice(0, 520);
}

function summarizeEmail(value: string) {
  const text = decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter(
      (sentence) =>
        sentence.length > 24 &&
        !/unsubscribe|privacy policy|manage preferences|view in browser/i.test(sentence),
    );
  const summary = sentences.slice(0, 2).join(" ");

  return summary || text.slice(0, 220) || "The email had limited text, so the original Gmail thread is linked for review.";
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined) {
  const textParts: string[] = [];
  const links: string[] = [];

  function walk(part: gmail_v1.Schema$MessagePart | undefined) {
    if (!part) {
      return;
    }

    const mimeType = part.mimeType ?? "";
    const data = part.body?.data;

    if (data && (mimeType.includes("text/plain") || mimeType.includes("text/html"))) {
      const decoded = decodeBase64Url(data);
      textParts.push(mimeType.includes("text/html") ? stripHtml(decoded) : decoded);
      links.push(...extractHtmlLinks(decoded));
    }

    part.parts?.forEach(walk);
  }

  walk(payload);

  return {
    text: textParts.join("\n"),
    links,
  };
}

function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

function cleanEmailText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1800);
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

function extractHtmlLinks(value: string) {
  return Array.from(value.matchAll(/href=["']([^"']+)["']/gi))
    .map((match) => match[1])
    .filter(isUsefulLink);
}

function extractLinks(value: string) {
  return Array.from(value.matchAll(/https?:\/\/[^\s)>"']+/gi))
    .map((match) => match[0])
    .filter(isUsefulLink);
}

function isUsefulLink(value: string) {
  return (
    value.startsWith("http") &&
    !value.includes("unsubscribe") &&
    !value.includes("google.com/url?q=")
  );
}
