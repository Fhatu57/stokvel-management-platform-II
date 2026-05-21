# Stokvel Management Platform

[![Stokvel CI](https://github.com/Boitumelo-555/Stokvel-Management-Platform/actions/workflows/node.yml/badge.svg)](https://github.com/Boitumelo-555/Stokvel-Management-Platform/actions/workflows/node.yml)
[![codecov](https://codecov.io/gh/Boitumelo-555/Stokvel-Management-Platform/branch/main/graph/badge.svg)](https://codecov.io/gh/Boitumelo-555/Stokvel-Management-Platform)

A web-based stokvel management platform that enables South African savings group members to track contributions, monitor payout schedules, communicate, and gain financial insights into their savings group.

**Live Application:** https://stokvelconnect-c9hjc5fhexfge8hy.southafricanorth-01.azurewebsites.net

---

## Table of Contents

- [Project Overview](#project-overview)
- [Team Members](#team-members)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment](#deployment)
- [Scrum Artefacts](#scrum-artefacts)
- [Additional Documentation](#additional-documentation)

---

## Project Overview

Stokvels are a cornerstone of South African financial culture. This platform aims to digitise stokvel management by providing:

- A secure, role-based web application for Members, Treasurers and Admins
- Real-time contribution tracking and payout scheduling
- Online payments via PayFast
- Live South African interest rate display (SARB data integration)
- Analytics and financial reporting with CSV/PDF export
- Meeting scheduling and notifications

---

## Team Members

* Boitumelo Nkosi 
* Emmanuel Mwandla 
* Mashudu Lishivha 
* Fhatuwani Masekwa 
* Daniel Mosoatsi 

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript (ES Modules), Semantic HTML5, CSS3 |
| Backend | Node.js, Express.js |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (Google OAuth) |
| Payments | PayFast (sandbox) |
| Testing | Jest, Supertest (backend), Jest + jsdom (frontend) |
| Coverage | Codecov |
| CI/CD | GitHub Actions |
| Hosting | Microsoft Azure (South Africa North) |

---

## Features

### Member
- Sign in with Google OAuth
- View personal contribution history
- Pay contributions online via PayFast
- View payout schedule and personal payout position
- View upcoming meetings and agendas
- View profile and personal details
- Receive notifications for payments, meetings and payouts

### Treasurer
- Confirm or flag member contributions
- Record offline/cash contributions on behalf of members
- Initiate payout disbursements
- Schedule meetings and record minutes
- View analytics and export reports as CSV or PDF

### Admin
- Invite members by email and assign roles
- Create and configure stokvel groups (contribution amount, payout order, meeting frequency)
- Manage group membership
- Full access to all treasurer features
- View live SARB prime and repo rates with savings projections

---

## Project Structure

```
Stokvel-Management-Platform/
├── backend/                    # Node.js + Express API
│   ├── routes/
│   │   ├── groups.js           # Group management endpoints
│   │   ├── invites.js          # Invitation endpoints
│   │   ├── auth.js             # Auth routes
│   │   └── contributions.js    # Contribution endpoints
│   ├── db/
│   │   ├── index.js            # Supabase client (backend)
│   │   └── supabase-client.js  # Supabase functions
│   ├── __tests__/
│   │   └── server.test.js      # Backend UATs (Jest + Supertest)
│   ├── server.js               # Express app entry point
│   ├── jest.config.js          # Jest configuration
│   ├── babel.config.js         # Babel configuration
│   └── package.json
├── frontend/                   # Vanilla JS frontend
│   ├── js/
│   │   ├── main.js             # Entry point router
│   │   ├── auth.js             # Authentication logic
│   │   ├── supabase-client.js  # Supabase client (frontend)
│   │   ├── contributions.js    # Contributions + PayFast
│   │   ├── analytics.js        # Analytics + Chart.js
│   │   ├── payouts.js          # Payout schedule
│   │   ├── meetings.js         # Meeting management
│   │   ├── dashboards.js       # Member/Treasurer dashboards
│   │   ├── admin-dashboard.js  # Admin dashboard
│   │   ├── groups.js           # Group creation
│   │   ├── invites.js          # Invite members
│   │   ├── interest-rates.js   # SARB live rates
│   │   ├── notifications.js    # Notifications page
│   │   ├── profile.js          # User profile
│   │   └── utils.js            # Shared utility functions
│   ├── __tests__/              # Frontend Jest tests
│   ├── __mocks__/              # Mock files for testing
│   ├── *.html                  # Page templates
│   ├── *.css                   # Stylesheets
│   ├── babel.config.cjs        # Babel config for frontend tests
│   └── package.json
├── documents                      # Project documentation
├── .github/
│   └── workflows/
│       └── node.yml            # GitHub Actions CI/CD
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- Git

### Clone the repository

```bash
git clone https://github.com/Boitumelo-555/Stokvel-Management-Platform.git
cd Stokvel-Management-Platform
```

### Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder (copy from `.env.example`):

```
PORT=3000
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Start the backend:

```bash
npm start
```

### Frontend setup

The frontend is plain HTML/CSS/JS — no build step required. Open `frontend/index.html` using a Live Server extension in VS Code, or serve it via the backend:

```bash
cd backend
node server.js
```

Then visit `http://localhost:3000` in your browser.

### Demo credentials

The application uses Google OAuth. Sign in with any Google account. Your role will be assigned to Admin after your first login,  then you can use that admin account to create stokvel groups and invite members or treasurers.

use the live website link:
- **URL:** https://stokvelconnect-c9hjc5fhexfge8hy.southafricanorth-01.azurewebsites.net
- **Login:** Click "Sign in with Google" and use a Google account

---

## Running Tests

### Backend tests

```bash
cd backend
npm test
```

Runs 20+ UATs covering group management and invite endpoints using Jest and Supertest. Coverage report is generated in `backend/coverage/`.

### Frontend tests

```bash
cd frontend
npm install
npm test
```

Runs 200+ tests across all frontend JS files using Jest with jsdom. Coverage report is generated in `frontend/coverage/`.

---

## CI/CD Pipeline

Every push to `main`  triggers the GitHub Actions workflow which:

1. Installs backend dependencies
2. Runs backend tests
3. Installs frontend dependencies
4. Runs frontend tests
5. Uploads backend coverage to Codecov (flag: `backend`)
6. Uploads frontend coverage to Codecov (flag: `frontend`)

View the pipeline: https://github.com/Boitumelo-555/Stokvel-Management-Platform/actions

---

## Deployment

The application is deployed on **Microsoft Azure App Service** (South Africa North region).

- **Live URL:** https://stokvelconnect-c9hjc5fhexfge8hy.southafricanorth-01.azurewebsites.net
- **Region:** South Africa North (Johannesburg)
- **Runtime:** Node.js 20 LTS

Deployment is triggered automatically on every push to `main` via the Azure GitHub Actions workflow.

---

## Scrum Artefacts

Some Scrum artefacts are available in the `documents/` folder and on our Taiga board.

| Artefact | Location |
|----------|----------|
| Product Backlog | [Taiga Board](https://tree.taiga.io/project/boitumelo-555-stolvel-management-platform) |
| Sprint Backlogs | [Sprints](https://tree.taiga.io/project/boitumelo-555-stolvel-management-platform/backlog?epic=null)  click Show closed Sprints to see them |
| Sprint Burndown Charts | `documents/` folder |
| Sprint Retrospectives | `documents/individual sprint retrospectives/` folder |
| Meeting Minutes | `meetings/` folder |
| Daily Standup Summaries | `documents/` folder|

---

## Additional Documentation

| Document | Location |
|----------|----------|
| Architecture Diagram | `UML diagram/` |
| UML Diagrams | `UML diagram/` |
| Test Plan and Results | `documents/` |
| SA Data Integration (SARB) | `documents/` |

---

## SA Data Integration

This project satisfies the SA Data Integration requirement by fetching live South African interest rate data from the **South African Reserve Bank (SARB)**. The prime lending rate and repo rate are displayed on the member dashboard and used to calculate projected savings growth for stokvel members.

**Data source:** South African Reserve Bank public data
**Implementation:** `frontend/js/interest-rates.js`
