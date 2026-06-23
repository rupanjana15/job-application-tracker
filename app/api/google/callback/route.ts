import { NextResponse } from "next/server";
import { saveGoogleCode } from "@/lib/google";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing Google authorization code." }, { status: 400 });
  }

  await saveGoogleCode(code);
  return NextResponse.redirect(new URL("/", request.url));
}
