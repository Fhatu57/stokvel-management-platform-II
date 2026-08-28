# Stokvel Management Platform — Portfolio Edition

A web platform for South African savings groups to manage contributions, payout schedules, meetings, invitations and financial reporting.

> **Portfolio status:** The application is prepared for a public Render deployment. Live authentication will be enabled when the independently owned Supabase and Google OAuth projects are connected.

## Recruiter demo

The read-only demo requires no account and contains no personal information. It includes switchable member, treasurer and administrator dashboards with representative South African rand data.

Run the application locally and open:

```text
http://localhost:3000/demo.html
```

## Project provenance

This application began as a five-person academic team project created by:

- Boitumelo Nkosi
- Emmanuel Mwandla
- Mashudu Lishivha
- Fhatuwani Masekwa
- Daniel Mosoatsi

This repository preserves the original Git history and contributor attribution. The portfolio relaunch is independently maintained by **Fhatuwani Masekwa (`Fhatu57`)**. Work attributed to this maintainer in the original history includes authentication, analytics and report exports, invitation handling, and dashboard development.

## What the platform demonstrates

- Role-specific experiences for members, treasurers and administrators
- Google OAuth through Supabase Auth
- PostgreSQL data modelling and Row Level Security
- Contribution tracking and compliance reporting
- Payout scheduling and disbursement workflows
- Meeting scheduling, notifications and group invitations
- CSV and printable PDF reports
- South African interest-rate savings projections
- Automated backend and browser-module tests
- GitHub Actions CI and a reproducible two-service Render deployment

## Technology

| Area | Technology |
| --- | --- |
| Frontend | Semantic HTML, CSS and JavaScript modules |
| Server | Node.js and Express |
| Data and authentication | Supabase and PostgreSQL |
| Tests | Jest, jsdom and Supertest |
| Automation | GitHub Actions |
| Hosting | Render Static Site and Render Web Service |

## Run locally

Requirements: Node.js 20–24 and npm.

```bash
npm ci
npm start
```

Open `http://localhost:3000` for the application or `http://localhost:3000/demo.html` for the recruiter demo.

## Connect Supabase

1. Create a new Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor.
3. Copy `frontend/config.example.js` to `frontend/config.js`.
4. Add the project URL and public anonymous key to `frontend/config.js`.
5. Sign in once, then promote the portfolio owner to administrator using the documented bootstrap query in `docs/DEPLOYMENT.md`.

The browser configuration contains only Supabase's public project URL and anonymous key. Database authorization is enforced by Row Level Security. Never place a Supabase service-role key in frontend code.

## Test

```bash
npm test
npm audit
```

The deployment workflow runs both backend and frontend tests. Test failures stop deployment.

## Deploy

The root `render.yaml` Blueprint creates two public services from the same repository:

- `stokvel-platform-web`: the real multipage frontend, hosted as a fast static site.
- `stokvel-platform-api`: the Express backend, hosted as a Node web service with `/api/health` monitoring.

The frontend build generates `frontend/config.js` from the public `SUPABASE_URL` and `SUPABASE_ANON_KEY` deployment settings. These values are not committed to Git.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the complete Supabase, Google OAuth, GitHub and Render checklist.

## Repository layout

```text
backend/                 Express server and API tests
frontend/                Application pages and browser modules
supabase/migrations/     Reproducible PostgreSQL schema and RLS policies
.github/workflows/       CI and deployment automation
docs/                    Deployment and portfolio documentation
render.yaml              Render frontend and backend services
scripts/                 Deployment configuration generator
```

## Current limitations

- The recruiter demo uses safe, static sample data and is intentionally read-only.
- Live Google authentication requires an independently owned Supabase project and OAuth credentials.
- The legacy `/groups` and `/invites` API routes use in-memory storage; authenticated application data is handled through Supabase.

## Licence

Released under the MIT Licence. Original contributor attribution and Git history are retained.
