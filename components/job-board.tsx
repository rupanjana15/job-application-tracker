"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApplicationStatus, JobApplication } from "@/lib/types";

const columns: Array<{ status: ApplicationStatus; label: string; dot: string }> = [
  { status: "APPLIED", label: "Applied", dot: "dot-blue" },
  { status: "WAITING", label: "Waiting", dot: "dot-gold" },
  { status: "REJECTED", label: "Rejected", dot: "dot-red" },
];

export function JobBoard({ initialApplications }: { initialApplications: JobApplication[] }) {
  const [applications, setApplications] = useState(initialApplications);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const selected = useMemo(
    () => applications.find((application) => application.id === selectedId) ?? null,
    [applications, selectedId],
  );
  const selectedIndex = selectedId
    ? applications.findIndex((application) => application.id === selectedId)
    : -1;
  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex >= 0 && selectedIndex < applications.length - 1;

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedId(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedId((currentId) => getNeighborId(applications, currentId, -1));
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedId((currentId) => getNeighborId(applications, currentId, 1));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [applications, selectedId]);

  async function updateStatus(id: string, status: ApplicationStatus) {
    setApplications((current) =>
      current.map((application) =>
        application.id === id ? { ...application, status, updatedAt: new Date().toISOString() } : application,
      ),
    );

    await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  }

  async function addApplication(formData: FormData) {
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: formData.get("company"),
        role: formData.get("role"),
        status: formData.get("status"),
        summary: formData.get("summary"),
      }),
    });

    if (!response.ok) {
      return;
    }

    const nextApplication = (await response.json()) as JobApplication;
    setApplications((current) => [nextApplication, ...current]);
    setIsAdding(false);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-between gap-3">
        <button className="button button-secondary" type="button" onClick={() => setIsAdding(true)}>
          Add job
        </button>
      </div>

      <section className="board-grid" aria-label="Application board">
        {columns.map((column) => {
          const items = applications.filter((app) => app.status === column.status);

          return (
            <div key={column.status} className="column">
              <div className="column-header">
                <div className="column-title">
                  <span className={`status-dot ${column.dot}`} />
                  {column.label}
                </div>
                <span className="muted-small">{items.length}</span>
              </div>

              <div className="cards">
                {items.length === 0 ? (
                  <p className="empty">No applications here yet.</p>
                ) : (
                  items.map((application) => (
                    <article key={application.id} className="job-card">
                      <button className="card-open" type="button" onClick={() => setSelectedId(application.id)}>
                        <span className="card-company">{application.company}</span>
                        <span className="card-role">{application.role}</span>
                        <span className="card-summary">{application.summary}</span>
                      </button>
                      <div className="status-actions" aria-label={`Move ${application.company}`}>
                        {columns.map((target) => (
                          <button
                            key={target.status}
                            className={application.status === target.status ? "chip active" : "chip"}
                            type="button"
                            onClick={() => updateStatus(application.id, target.status)}
                          >
                            {target.label}
                          </button>
                        ))}
                      </div>
                      <div className="card-meta">
                        <span>{application.source}</span>
                        <span>{formatDate(application.lastSeenAt)}</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </section>

      {selected ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedId(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-label={`${selected.company} details`} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{selected.status.toLowerCase()}</p>
                <h2>{selected.company}</h2>
                <p className="muted">{selected.role}</p>
              </div>
              <div className="modal-controls">
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setSelectedId(getNeighborId(applications, selected.id, -1))}
                  disabled={!canGoPrevious}
                  aria-label="Previous job"
                >
                  ←
                </button>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setSelectedId(getNeighborId(applications, selected.id, 1))}
                  disabled={!canGoNext}
                  aria-label="Next job"
                >
                  →
                </button>
                <button className="icon-button" type="button" onClick={() => setSelectedId(null)} aria-label="Close details">
                  x
                </button>
              </div>
            </div>

            <div className="detail-grid">
              {selected.from ? <Detail label="From" value={selected.from} /> : null}
              {selected.subject ? <Detail label="Subject" value={selected.subject} /> : null}
              <Detail label="Last seen" value={formatDate(selected.lastSeenAt)} />
              <Detail label="Source" value={selected.source} />
            </div>

            <div className="detail-section">
              <h3>Summary</h3>
              <p>{selected.summary}</p>
            </div>

            {selected.details ? (
              <div className="detail-section">
                <h3>Email details</h3>
                <p>{selected.details}</p>
              </div>
            ) : null}

            <div className="detail-section">
              <h3>Links</h3>
              <div className="link-stack">
                {selected.emailUrl ? (
                  <a className="resource-link primary-resource" href={selected.emailUrl} target="_blank" rel="noreferrer">
                    <span className="resource-icon" aria-hidden="true">
                      @
                    </span>
                    <span>
                      <strong>Open Gmail thread</strong>
                      <small>Review the original email conversation</small>
                    </span>
                  </a>
                ) : null}
                {selected.links?.map((link, index) => (
                  <a className="resource-link" href={link} target="_blank" rel="noreferrer" key={link}>
                    <span className="resource-icon" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span>
                      <strong>{formatLinkLabel(link)}</strong>
                      <small>{link}</small>
                    </span>
                  </a>
                ))}
                {!selected.emailUrl && !selected.links?.length ? <p className="muted">No links found.</p> : null}
              </div>
            </div>

            <div className="detail-section">
              <h3>Company research</h3>
              <div className="research-grid">
                {companyResearchLinks(selected.company).map((link) => (
                  <a className="research-card" href={link.href} target="_blank" rel="noreferrer" key={link.label}>
                    <span className="research-icon" aria-hidden="true">
                      {link.icon}
                    </span>
                    <span>
                      <strong>{link.label}</strong>
                      <small>{link.description}</small>
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="status-actions">
              {columns.map((target) => (
                <button
                  key={target.status}
                  className={selected.status === target.status ? "chip active" : "chip"}
                  type="button"
                  onClick={() => updateStatus(selected.id, target.status)}
                >
                  Move to {target.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {isAdding ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsAdding(false)}>
          <section className="modal narrow" role="dialog" aria-modal="true" aria-label="Add job" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Add job</h2>
              <button className="icon-button" type="button" onClick={() => setIsAdding(false)} aria-label="Close add job">
                x
              </button>
            </div>

            <form action={addApplication} className="manual-form">
              <label>
                Company
                <input name="company" required />
              </label>
              <label>
                Role
                <input name="role" required />
              </label>
              <label>
                Status
                <select name="status" defaultValue="APPLIED">
                  {columns.map((column) => (
                    <option key={column.status} value={column.status}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notes
                <textarea name="summary" rows={4} placeholder="Recruiter name, job link, deadline, or anything useful." />
              </label>
              <button className="button" type="submit">
                Save job
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function companyResearchLinks(company: string) {
  const query = encodeURIComponent(company);

  return [
    {
      label: "Website",
      description: "Official site",
      icon: "W",
      href: `https://www.google.com/search?q=${query}+official+website`,
    },
    {
      label: "LinkedIn",
      description: "People and hiring",
      icon: "in",
      href: `https://www.google.com/search?q=${query}+LinkedIn+company`,
    },
    {
      label: "Crunchbase",
      description: "Funding and founders",
      icon: "C",
      href: `https://www.google.com/search?q=${query}+Crunchbase`,
    },
    {
      label: "Glassdoor",
      description: "Reviews and salary",
      icon: "G",
      href: `https://www.google.com/search?q=${query}+Glassdoor+reviews`,
    },
    {
      label: "News",
      description: "Recent funding",
      icon: "N",
      href: `https://www.google.com/search?q=${query}+startup+funding+news`,
    },
  ];
}

function formatLinkLabel(link: string) {
  try {
    const url = new URL(link);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "Email link";
  }
}

function getNeighborId(applications: JobApplication[], currentId: string | null, direction: -1 | 1) {
  const currentIndex = applications.findIndex((application) => application.id === currentId);
  const nextApplication = applications[currentIndex + direction];

  return nextApplication?.id ?? currentId;
}
