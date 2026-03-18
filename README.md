# SocietyOS - Society Management Application

A full-stack web application for managing residential societies. Built with React + TypeScript + Vite on the frontend and Node.js + Express + SQLite on the backend.

## Features

- **Dashboard**: Overview stats (total residents, active residents, pending fees, open complaints) and recent notices
- **Residents**: Full CRUD for resident management with flat number, contact info, move-in date, and status
- **Maintenance Fees**: Track monthly maintenance fee records with paid/pending/overdue statuses and filters
- **Notice Board**: Post and manage society notices categorized as general, urgent, or event
- **Complaints**: Submit and track complaints with category tagging and status management (open → in progress → resolved)

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, better-sqlite3
- **Database**: SQLite (file-based, no external DB required)

## Prerequisites

- Node.js 18+
- npm 9+

## Setup & Run

### 1. Install all dependencies
```bash
npm run install:all
```

### 2. Start development servers

Start both frontend and backend simultaneously:
```bash
npm run dev
```

Or start them separately:
```bash
# Backend (port 3001)
npm run dev --prefix backend

# Frontend (port 3000)
npm run dev --prefix frontend
```

### 3. Open the app
Navigate to [http://localhost:3000](http://localhost:3000)

The backend API runs on [http://localhost:3001](http://localhost:3001). Vite proxies `/api` requests to the backend automatically.

## Build for Production

```bash
npm run build
```

This compiles both TypeScript projects. To run the production backend:
```bash
npm start
```

## Project Structure

```
SocietyOS/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server entry point
│   │   ├── database.ts       # SQLite setup + seed data
│   │   └── routes/
│   │       ├── residents.ts  # CRUD for residents
│   │       ├── maintenance.ts # CRUD for maintenance fees
│   │       ├── notices.ts    # CRUD for notices
│   │       ├── complaints.ts # CRUD for complaints
│   │       └── stats.ts      # Dashboard statistics
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main app with navigation
│   │   ├── api.ts            # API client functions
│   │   ├── types.ts          # TypeScript interfaces
│   │   └── components/
│   │       ├── Sidebar.tsx   # Navigation sidebar
│   │       ├── Dashboard.tsx # Stats and recent notices
│   │       ├── Residents.tsx # Resident management
│   │       ├── Maintenance.tsx # Fee tracking
│   │       ├── Notices.tsx   # Notice board
│   │       └── Complaints.tsx # Complaint management
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── package.json              # Root scripts
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Dashboard statistics |
| GET/POST | `/api/residents` | List/Create residents |
| GET/PUT/DELETE | `/api/residents/:id` | Get/Update/Delete resident |
| GET/POST | `/api/maintenance` | List/Create maintenance records |
| PUT/DELETE | `/api/maintenance/:id` | Update/Delete maintenance record |
| GET/POST | `/api/notices` | List/Create notices |
| PUT/DELETE | `/api/notices/:id` | Update/Delete notice |
| GET/POST | `/api/complaints` | List/Create complaints |
| PUT/DELETE | `/api/complaints/:id` | Update/Delete complaint |

## Database

The SQLite database is automatically created at `backend/society.db` when the server first starts. It is pre-seeded with:
- 8 residents across Blocks A, B, and C
- 12 maintenance fee records
- 5 notices
- 5 complaints

The database file is excluded from version control via `.gitignore`.
