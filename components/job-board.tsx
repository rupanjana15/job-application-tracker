"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteApplication, putApplication, readLocalApplications, seedLocalData } from "@/lib/local-db";
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
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
    async function loadLocalData() {
      await seedLocalData(initialApplications, []);
      setApplications(await readLocalApplications());
    }

    loadLocalData();
  }, [initialApplications]);

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
    let nextApplication: JobApplication | undefined;

    setApplications((current) => {
      const next = current.map((application) => {
        if (application.id !== id) {
          return application;
        }

        nextApplication = { ...application, status, updatedAt: new Date().toISOString() };
        return nextApplication;
      });

      return next;
    });

    if (nextApplication) {
      await putApplication(nextApplication);
      window.dispatchEvent(new Event("jobtrack:data"));
    }
  }

  async function addApplication(formData: FormData) {
    const now = new Date().toISOString();
    const nextApplication: JobApplication = {
      id: crypto.randomUUID(),
      company: String(formData.get("company") ?? ""),
      role: String(formData.get("role") ?? ""),
      status: formData.get("status") as ApplicationStatus,
      source: "manual",
      summary: String(formData.get("summary") || "Added manually."),
      details: String(formData.get("summary") || ""),
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await putApplication(nextApplication);
    setApplications((current) => [nextApplication, ...current]);
    window.dispatchEvent(new Event("jobtrack:data"));
    setIsAdding(false);
  }

  async function trashApplication(id: string) {
    setApplications((current) => current.filter((application) => application.id !== id));
    setExpandedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setSelectedId((currentId) => (currentId === id ? null : currentId));
    await deleteApplication(id);
    window.dispatchEvent(new Event("jobtrack:data"));
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
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
                      <div className="job-card-head">
                        <button className="card-open" type="button" onClick={() => toggleExpanded(application.id)}>
                          <span className="card-company">{application.company}</span>
                          <span className="card-role">{application.role}</span>
                          <span className="card-row-meta">
                            {application.source} · {formatDate(application.lastSeenAt)}
                          </span>
                        </button>
                        <button
                          className="card-trash"
                          type="button"
                          onClick={() => trashApplication(application.id)}
                          aria-label={`Move ${application.company} to trash`}
                        >
                          ×
                        </button>
                      </div>
                      {expandedIds.has(application.id) ? (
                        <div className="card-expanded">
                          <p className="card-summary">{application.summary}</p>
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
                            <button className="chip" type="button" onClick={() => setSelectedId(application.id)}>
                              Details
                            </button>
                          </div>
                        </div>
                      ) : null}
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
                  className="trash-modal-button"
                  type="button"
                  onClick={() => trashApplication(selected.id)}
                  aria-label="Move job to trash"
                >
                  Trash
                </button>
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
