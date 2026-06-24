"use client";

import { useState } from "react";
import { deleteOpportunity, readLocalOpportunities, seedLocalData } from "@/lib/local-db";
import { useEffect } from "react";
import type { JobOpportunity } from "@/lib/types";

export function OpportunityList({ initialOpportunities }: { initialOpportunities: JobOpportunity[] }) {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadLocalData() {
      await seedLocalData([], initialOpportunities);
      setOpportunities(await readLocalOpportunities());
    }

    loadLocalData();
  }, [initialOpportunities]);

  async function removeOpportunity(id: string) {
    const previous = opportunities;
    setOpportunities((current) => current.filter((opportunity) => opportunity.id !== id));
    setExpandedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });

    try {
      await deleteOpportunity(id);
    } catch {
      setOpportunities(previous);
    }
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
    <section className="opportunity-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Job alerts and newsletters</p>
          <h2>Opportunities to apply for</h2>
        </div>
        <span className="count-pill">{opportunities.length}</span>
      </div>

      {opportunities.length === 0 ? (
        <p className="empty">Job alert emails from LinkedIn, Naukri, Substack, and similar sites will appear here.</p>
      ) : (
        <div className="opportunity-grid">
          {opportunities.slice(0, 8).map((opportunity) => (
            <article className="opportunity-card" key={opportunity.id}>
              <div className="opportunity-card-head">
                <button className="opportunity-toggle" type="button" onClick={() => toggleExpanded(opportunity.id)}>
                  <span className="opportunity-meta">
                  <span className="source-pill">{opportunity.source}</span>
                  <span className="muted-small">{formatDate(opportunity.receivedAt)}</span>
                  </span>
                  <strong>{opportunity.title}</strong>
                </button>
                <button
                  className="opportunity-remove"
                  type="button"
                  onClick={() => removeOpportunity(opportunity.id)}
                  aria-label={`Remove ${opportunity.title}`}
                >
                  ×
                </button>
              </div>
              {expandedIds.has(opportunity.id) ? (
                <>
                  <div className="opportunity-body">
                    <p>{opportunity.summary}</p>
                  </div>
                  <div className="opportunity-actions">
                    {opportunity.emailUrl ? (
                      <a href={opportunity.emailUrl} target="_blank" rel="noreferrer">
                        Open email
                      </a>
                    ) : null}
                    {opportunity.links[0] ? (
                      <a className="primary-action" href={opportunity.links[0]} target="_blank" rel="noreferrer">
                        Open opportunity
                      </a>
                    ) : null}
                  </div>
                </>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
