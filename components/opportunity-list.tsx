"use client";

import { useState } from "react";
import type { JobOpportunity } from "@/lib/types";

export function OpportunityList({ initialOpportunities }: { initialOpportunities: JobOpportunity[] }) {
  const [opportunities, setOpportunities] = useState(initialOpportunities);

  async function removeOpportunity(id: string) {
    const previous = opportunities;
    setOpportunities((current) => current.filter((opportunity) => opportunity.id !== id));

    const response = await fetch("/api/opportunities", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      setOpportunities(previous);
    }
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
                <div className="opportunity-meta">
                  <span className="source-pill">{opportunity.source}</span>
                  <span className="muted-small">{formatDate(opportunity.receivedAt)}</span>
                </div>
                <button
                  className="opportunity-remove"
                  type="button"
                  onClick={() => removeOpportunity(opportunity.id)}
                  aria-label={`Remove ${opportunity.title}`}
                >
                  ×
                </button>
              </div>
              <div className="opportunity-body">
                <h3>{opportunity.title}</h3>
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
