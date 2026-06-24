import { cookies } from "next/headers";
import type { GmailTokens } from "@/lib/types";

const cookieName = "jobtrack_gmail_tokens";

export async function readGmailTokensCookie() {
  const cookieStore = await cookies();
  const value = cookieStore.get(cookieName)?.value;

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as GmailTokens;
  } catch {
    return null;
  }
}

export async function writeGmailTokensCookie(tokens: GmailTokens) {
  const cookieStore = await cookies();
  const value = Buffer.from(JSON.stringify(tokens), "utf8").toString("base64url");

  cookieStore.set(cookieName, value, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
