# Gold Spin Web

React/Vite site with a local Express API and Neon PostgreSQL storage. The browser never receives the database connection string.

## Run locally

1. Install Node.js 20+ and run `npm ci`.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to your Neon connection string. Keep `.env.local` private; it is ignored by Git.
3. Run `npm run dev` and open `http://127.0.0.1:3000`.

On first startup the server creates its tables, the default prize, two admin accounts, and one member account. Only those accounts can log in. There is no public registration. The account emails and passwords are in `server/accounts.ts`; changing a password there and restarting the server revokes existing sessions for that account. This repository is public, so these credentials are visible to anyone who can read it.

For a built site, run `npm run build` followed by `npm run start`. Run `npm run lint` for TypeScript checks and `npm run smoke` for an API test against the configured database. The smoke test creates and removes temporary records.

## Deploy on Vercel

Import this repository as a Vite project. The `vercel.json` routes `/api/*` to the Express function and the rest to the built React app. Add `DATABASE_URL` as a Vercel environment variable; do not put the Neon URL in the repository. The API initializes tables and fixed accounts on first use.

## Legacy data

If you have a JSON export of the old database, place it outside the repository or in an ignored path and run `npm run import:legacy -- C:\path\to\export.json`. The JSON object must contain arrays named `prizes`, `accessRequests`, and `wins`, each with the same fields previously used by the app. The import is idempotent by record ID/email. Existing Google login credentials cannot be imported. Legacy access requests remain historical records and do not grant login. Legacy win records are visible to admins but not automatically exposed to a member account with the same email.

The importer does not connect to Firebase. An export file or read access to the old project is required to move those records.
