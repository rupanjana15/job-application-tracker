import { JobBoard } from "@/components/job-board";
import { OpportunityList } from "@/components/opportunity-list";
import { ThemeToggle } from "@/components/theme-toggle";
import { readApplications, readGmailTokens, readOpportunities, readSyncRuns } from "@/lib/store";

const columns = [
  { status: "APPLIED", label: "Applied" },
  { status: "WAITING", label: "Waiting" },
  { status: "REJECTED", label: "Rejected" },
] as const;

const jobSites = [
  { label: "Wellfound", href: "https://wellfound.com/jobs" },
  { label: "Naukri Campus", href: "https://www.naukri.com/campus" },
  { label: "TrueUp Jobs", href: "https://www.trueup.io/jobs" },
  { label: "Cutshort", href: "https://cutshort.io/jobs" },
  { label: "Instahyre", href: "https://www.instahyre.com/jobs/" },
  { label: "Internshala Jobs", href: "https://internshala.com/jobs" },
  { label: "LinkedIn Startups", href: "https://www.linkedin.com/jobs/search/?keywords=startup&location=India" },
  { label: "Y Combinator Jobs", href: "https://www.ycombinator.com/jobs" },
  { label: "Himalayas", href: "https://himalayas.app/jobs" },
];

export default async function Home() {
  const applications = await readApplications();
  const opportunities = await readOpportunities();
  const syncRuns = await readSyncRuns();
  const gmailTokens = await readGmailTokens();
  const latestSync = syncRuns[0];
  const isConnected = Boolean(gmailTokens?.access_token || gmailTokens?.refresh_token);

  return (
    <main className="page-shell">
      <div className="app-frame">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">JT</div>
            <span>JobTrack</span>
          </div>

          <nav className="job-links" aria-label="Job application sites">
            <h2>Apply elsewhere</h2>
            <div className="job-link-stack">
              {jobSites.map((site) => (
                <a className="job-link-card" href={site.href} target="_blank" rel="noreferrer" key={site.href}>
                  <span>{site.label}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </nav>

          <div className="sidebar-bottom">
            <div className="stat-stack">
              <SidebarStat label="Gmail sync" value={isConnected ? "Connected" : "Setup"} />
              <SidebarStat label="Account" value={gmailTokens?.accountEmail ?? "Not connected"} />
              <SidebarStat label="Refresh" value="2x daily" />
            </div>

            <div className="stat-stack sidebar-counts">
              {columns.map((column) => (
                <SidebarStat
                  key={column.status}
                  label={column.label}
                  value={String(applications.filter((app) => app.status === column.status).length)}
                />
              ))}
            </div>
          </div>
        </aside>

        <section className="main-panel">
          <div className="topbar">
            <div>
              <p className="eyebrow">Email-powered application pipeline</p>
              <h1>Track every job update from Gmail.</h1>
              <p className="intro">
                JobTrack scans recent recruiting emails, extracts job details and links,
                and keeps your pipeline organized across applied, waiting, and rejected.
              </p>
              {isConnected ? (
                <p className="connected-copy">
                  Signed in with {gmailTokens?.accountEmail ?? "Gmail"}. Gmail scans use read-only access.
                </p>
              ) : null}
            </div>

            <div className="actions">
              <ThemeToggle />
              <a className={isConnected ? "button button-secondary" : "button"} href="/api/google/connect">
                {isConnected ? "Reconnect Gmail" : "Connect Gmail"}
              </a>
              <form action="/api/sync/gmail" method="post">
                <button className="button button-secondary" type="submit">
                  Scan Gmail
                </button>
              </form>
            </div>
          </div>

          <JobBoard initialApplications={applications} />

          <OpportunityList initialOpportunities={opportunities} />

          <section className="panel-row">
            <div className="panel">
              <h2>Latest email events</h2>
              <div className="timeline">
                {applications.slice(0, 6).map((app) => (
                  <div key={app.id} className="timeline-item">
                    <strong>{app.company}</strong>
                    <p>
                      {app.role} · {app.status.toLowerCase()} · {formatDate(app.lastSeenAt)}
                    </p>
                  </div>
                ))}
                {applications.length === 0 ? (
                  <p className="muted">Connect Gmail and run a scan to build an application timeline from your inbox.</p>
                ) : null}
              </div>
            </div>

            <div className="panel">
              <h2>Sync status</h2>
              <p className="muted">
                {latestSync
                  ? `${latestSync.status}: scanned ${latestSync.scanned}, imported ${latestSync.imported}.`
                  : "Manual scan is ready. Use the cron endpoint to refresh once or twice a day."}
              </p>
              {latestSync?.message ? <p className="muted error-copy">{latestSync.message}</p> : null}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sidebar-stat">
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
