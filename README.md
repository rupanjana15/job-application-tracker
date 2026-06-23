# Job Application Tracker

JobTrack is a Next.js app that connects to Gmail, scans recent recruiting emails,
and organizes applications into Applied, Waiting, and Rejected.

## Features

- Gmail OAuth connection
- Gmail read-only scanning for job application emails
- Automatic classification into Applied, Waiting, and Rejected
- Local JSON data store for a simple single-user MVP
- Manual scan button and cron-friendly refresh endpoint

## Setup

Install dependencies:

```bash
npm install
```

Create local env:

```bash
cp .env.example .env.local
```

Fill in:

```txt
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
SYNC_CRON_SECRET="replace-with-a-random-secret"
```

Run locally:

```bash
npm run dev
```

## Google OAuth

In Google Cloud Console:

1. Create a project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen.
4. Create a web OAuth client.
5. Add this redirect URI:

```txt
http://localhost:3000/api/google/callback
```

The app stores Gmail tokens in local ignored files under `data/`.

## Scheduled Refresh

For deployed cron, call:

```txt
/api/sync/gmail?secret=YOUR_SYNC_CRON_SECRET
```

Use once or twice per day.
