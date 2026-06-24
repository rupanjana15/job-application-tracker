import { JobBoard } from "@/components/job-board";
import { OpportunityList } from "@/components/opportunity-list";
import { SidebarStats } from "@/components/sidebar-stats";
import { readGmailTokensCookie } from "@/lib/gmail-token-cookie";
import { readApplications, readGmailTokens, readOpportunities, readSyncRuns } from "@/lib/store";

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
  const gmailTokens = (await readGmailTokensCookie()) ?? (await readGmailTokens());
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

          <SidebarStats
            accountEmail={gmailTokens?.accountEmail}
            initialApplications={applications}
            isConnected={isConnected}
            latestSync={latestSync}
          />
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

            <aside className="tester-note" aria-label="Gmail tester note">
              <p className="tester-note-kicker">Tiny app-owner note</p>
              <h2>Gmail sync is invite-only for now.</h2>
              <p>
                I could not open Gmail access to everyone because Google asks for verification
                and security review for public Gmail apps. My wallet said “maybe after the first
                job offer.”
              </p>
              <p>
                You can still run JobTrack locally, use manual entries, and import or export JSON.
                To test Gmail sync, clone the project and add your own Google OAuth credentials
                from the README.
              </p>
            </aside>
          </div>

          <JobBoard initialApplications={applications} />

          <OpportunityList initialOpportunities={opportunities} />

          <section className="panel-row single-panel">
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

          </section>
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
