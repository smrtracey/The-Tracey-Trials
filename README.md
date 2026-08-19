# The Tracey Trials

Mobile-first competition app architecture with:

- React + Vite frontend
- Express + MongoDB backend
- JWT-based login for seeded contestants
- First-login password change requirement
- Private photo and video storage in Cloudflare R2

## Architecture

### Frontend

- `src/pages/LoginPage.jsx` handles contestant login
- `src/pages/HomePage.jsx` shows status, recent submissions, and the upload form
- `src/context/AuthContext.jsx` manages token persistence and session refresh
- `src/lib/api.js` centralizes API calls

### Backend

- `server/src/server.js` boots the API
- `server/src/routes/authRoutes.js` supports login and session lookup
- `server/src/routes/submissionRoutes.js` handles photo submissions and recent feed data
- `server/src/models/User.js` stores contestant accounts
- `server/src/models/Submission.js` stores uploaded photo metadata

## Environment variables

Copy `.env.example` to `.env` and fill in your values.

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/tracey-trials
JWT_SECRET=replace-with-a-long-random-secret
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
SUBMISSION_UPLOAD_LIMIT_MB=2048
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=tracey-trials-submissions
R2_KEY_PREFIX=submissions
R2_SIGNED_URL_TTL_SECONDS=3600
SEED_FIRST_NAMES=alex,blake,casey,devon,ellis,frankie,georgia,harper,indie,jordan,sean
SEED_DEFAULT_PASSWORD=TraceyTrials2026!
SEED_JUDGE_PASSWORD=Judge12345
SEED_DEFAULT_PINNED_TASK_NUMBERS=1,2,3,11,20
```

## Run locally

```bash
npm install
npm run seed:users
npm run dev:full
```

Frontend runs on `http://localhost:5173` and the API runs on `http://localhost:4000`.

## Deploy on Render

This repository includes a Render Blueprint file at `render.yaml` that creates:

- `tracey-trials-api` (Node web service)
- `tracey-trials-web` (static site for the Vite frontend)

### 1. Prepare production dependencies

- Create a MongoDB Atlas database (Render does not provide managed MongoDB).
- Create a private Cloudflare R2 bucket and an Object Read & Write API token scoped to that bucket.
- Decide your frontend URL (Render static site URL or your custom domain).

### 2. Create services from Blueprint

1. Push this repository to GitHub.
2. In Render, choose **New +** -> **Blueprint**.
3. Select the repo and apply `render.yaml`.
4. Fill the required env vars for both services.

### 3. Required env vars

Set these on the API service (`tracey-trials-api`):

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN` (must exactly match your frontend URL, e.g. `https://tracey-trials-web.onrender.com`)
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_KEY_PREFIX` (optional; defaults to `submissions`)
- `R2_SIGNED_URL_TTL_SECONDS` (optional; defaults to `3600`)
- `SUBMISSION_UPLOAD_LIMIT_MB` (optional, per-file upload limit in MB for submission media; defaults to `2048`)
- `SEED_FIRST_NAMES`
- `SEED_DEFAULT_PASSWORD`
- `SEED_JUDGE_PASSWORD`

Set this on the frontend static site (`tracey-trials-web`):

- `VITE_API_BASE_URL` (example: `https://tracey-trials-api.onrender.com`)

### 4. Seed production data

After the API is live, open a Render Shell on `tracey-trials-api` and run:

```bash
npm run seed:users
npm run seed:tasks
```

Optional realistic demo data:

```bash
npm run seed:late-stage
```

### 5. Verify R2

With the local API running against the production-equivalent R2 configuration, run:

```bash
npm run test:r2
```

Set `R2_TEST_USERNAME` and `R2_TEST_PASSWORD` to a non-production contestant before running it. You can optionally set `R2_TEST_API_BASE_URL`; otherwise the script uses the local API. The smoke test creates a real submission containing a tiny PNG, verifies that the API returns a signed R2 URL, and downloads it successfully.

If legacy files still exist under `server/uploads`, copy them to R2 and update their MongoDB records with:

```bash
npm run migrate:uploads-to-r2
```

The migration is repeatable: it skips media already carrying an R2 object key and reports legacy files that are no longer present.

### 6. PWA install for users

- Share the frontend HTTPS URL with users.
- iPhone: open in Safari -> Share -> Add to Home Screen.
- Android: open in Chrome -> Install app / Add to Home Screen.

## Seeded users

The seed script creates contestant users from `SEED_FIRST_NAMES` and a judge user:

- usernames: first names from `SEED_FIRST_NAMES`
- contestant starter password: shared value from `SEED_DEFAULT_PASSWORD`
- judge user: `mikaela`
- judge starter password: `SEED_JUDGE_PASSWORD` (defaults to `Judge12345`)

After first login, users are required to set a new password before they can access their dashboard.

## Notes

- New media is stored in the private R2 bucket. MongoDB stores object keys, not expiring signed URLs.
- The API returns signed read URLs that expire after `R2_SIGNED_URL_TTL_SECONDS`.
- `server/tmp-uploads` is non-public temporary upload staging and is cleaned after each submission.
- `server/uploads` and the `/uploads` route remain only for legacy local URLs.
- `vite.config.js` proxies `/api` and `/uploads` to the backend in local development.
- This is a clean architecture scaffold; you can add scoring, admin moderation, or judges next.
