import { NextResponse } from "next/server";
import { readStoredApplications, writeApplications } from "@/lib/store";
import type { ApplicationStatus, JobApplication } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    company?: string;
    role?: string;
    status?: ApplicationStatus;
    summary?: string;
  };

  if (!body.company || !body.role || !body.status) {
    return NextResponse.json({ error: "company, role, and status are required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const application: JobApplication = {
    id: crypto.randomUUID(),
    company: body.company,
    role: body.role,
    status: body.status,
    source: "manual",
    summary: body.summary ?? "Added manually.",
    details: body.summary,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const applications = await readStoredApplications();
  await writeApplications([application, ...applications]);

  return NextResponse.json(application);
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    status?: ApplicationStatus;
  };

  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id and status are required." }, { status: 400 });
  }

  const applications = await readStoredApplications();
  const nextApplications = applications.map((application) =>
    application.id === body.id
      ? { ...application, status: body.status as ApplicationStatus, updatedAt: new Date().toISOString() }
      : application,
  );

  await writeApplications(nextApplications);

  return NextResponse.json({ ok: true });
}
