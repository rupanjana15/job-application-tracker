# JobTrack

A cozy job application tracker that reads your Gmail, finds recruiting updates, and keeps the job hunt a little less chaotic.

![JobTrack dashboard](public/screenshots/dashboard.png)

## What It Does

- Tracks applications across Applied, Waiting, and Rejected
- Connects to Gmail with read-only access
- Pulls out recruiting emails and useful links
- Separates job alerts and recommendations into Opportunities
- Lets you add jobs manually
- Includes quick links to startup and job sites

## Screenshots

### Application Tracker

![Application tracker](public/screenshots/dashboard.png)

### Opportunities

![Opportunities](public/screenshots/opportunities.png)

## Run Locally

Clone the repo:

```bash
git clone YOUR_REPO_URL
cd job_application_tracker
```

Install dependencies:

```bash
npm install
```

Create your env file:

```bash
cp .env.example .env.local
```

Add your Google OAuth values:

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
SYNC_CRON_SECRET="any-random-secret"
```

Start the app:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Gmail Setup



In Google Cloud Console:

1. Enable the Gmail API.
2. Create an OAuth web client.
3. Add this redirect URL:

```txt
http://localhost:3000/api/google/callback
```

Then connect Gmail from the app and scan your inbox.

## Tech Stack

- Next.js
- TypeScript
- Gmail API
- Local JSON storage
- CSS theme system

## Note

This is built as a personal/local project. Gmail access is read-only, and local app data is stored in `data/`.


<img width="1061" height="641" alt="image" src="https://github.com/user-attachments/assets/3a3d144e-4034-4042-9b22-41836f1d5109" />
<img width="894" height="485" alt="image" src="https://github.com/user-attachments/assets/b62d6300-0621-45d2-b1aa-56ed6ea6b16f" />
