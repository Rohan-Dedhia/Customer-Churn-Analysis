# DBMS Analytics Project: Next.js & FastAPI HTAP Architecture

## Overview
This project presents a Full-Stack Customer Analytics Dashboard simulating a Hybrid Transactional/Analytical Processing (HTAP) environment. Utilizing **PostgreSQL**, this architecture seamlessly balances OLTP (Online Transaction Processing) operations with OLAP (Online Analytical Processing) workloads over the `contoso` 100k customer dataset.

## Database Justification (Why PostgreSQL?)
PostgreSQL is chosen for this DBMS project because:
1. **HTAP Capabilities**: PostgreSQL efficiently handles standard row-store operations (INSERT, UPDATE, DELETE for customer records). At the same time, its robust query optimizer (handling window functions, CTEs, and JOINs) provides excellent performance for aggregations (our cohort, retention, and segmentation analytics).
2. **ACID Compliance**: Ensures strong consistency during CRUD operations via SQLAlchemy within our backend API.
3. **Extensibility & Compliance**: Supported broadly across drivers and easily handles scaling with partitions.

## Features
- **Frontend**: Next.js App Router, React, Recharts, standard vanilla CSS logic.
- **Backend**: FastAPI, SQLAlchemy, token-based JWT Authentication.
- **Database**: PostgreSQL (handling raw SQL queries for OLAP and SQLAlchemy ORM for OLTP).

## Getting Started

### 1. Database Setup
Ensure PostgreSQL is running locally, containing the `customer`, `sales`, and other tables populated by `contoso_100k.sql`.
Set your DB URI in `.env` inside `backend/` if the default doesn't match: `POSTGRES_URL=postgresql://localhost/postgres`

### 2. Backend (FastAPI) Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # (or venv\Scripts\activate on Windows)
pip install -r requirements.txt
uvicorn main:app --reload
```
API runs on `http://127.0.0.1:8000/docs` (Swagger UI).

### 3. Frontend (Next.js) Setup
```bash
cd frontend
npm install
npm run dev
```
Client runs on `http://localhost:3000`.

Login with mock credentials `admin` / `admin123`.

This application now wraps complex analytic views into a real-time responsive dashboard!
