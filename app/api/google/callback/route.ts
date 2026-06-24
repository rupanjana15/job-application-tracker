import { NextResponse } from "next/server";
import { saveGoogleCode } from "@/lib/google";
import { writeGmailTokensCookie } from "@/lib/gmail-token-cookie";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing Google authorization code." }, { status: 400 });
  }

  const tokens = await saveGoogleCode(code);
  const response = NextResponse.redirect(new URL("/", request.url));

  await writeGmailTokensCookie(tokens);

  return response;
}
