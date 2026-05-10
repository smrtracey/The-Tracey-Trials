# The Tracey Trials

Mobile-first competition app architecture with:

- React + Vite frontend
- Express + MongoDB backend
- JWT-based login for seeded contestants
- First-login password change requirement
- Photo uploads stored locally during development

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
SEED_FIRST_NAMES=alex,blake,casey,devon,ellis,frankie,georgia,harper,indie,jordan,sean
SEED_DEFAULT_PASSWORD=TraceyTrials2026!
SEED_JUDGE_PASSWORD=Judge12345
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

### 5. PWA install for users

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

- Uploaded files are saved to `server/uploads` for development.
- `vite.config.js` proxies `/api` and `/uploads` to the backend in local development.
- This is a clean architecture scaffold; you can add scoring, admin moderation, or judges next.
