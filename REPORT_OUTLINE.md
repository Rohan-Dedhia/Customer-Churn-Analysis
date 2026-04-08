# Database Management Systems (DBMS) Project Report Outline

## 1. Executive Summary
- Brief introduction of the application (Customer Analytics Dashboard).
- The transition from static SQL scripts to an interactive, web-based HTAP system.

## 2. System Architecture
- **Frontend (Application Layer)**: Next.js + React. Handles state management and API integration.
- **Backend (Service/API Layer)**: FastAPI (Python). Exposes RESTful endpoints, provides JWT-based API authorization, and routes payload to the DB.
- **Database (Data Layer)**: PostgreSQL. Configured for OLTP (using SQLAlchemy mapped models) and OLAP (using CTEs and raw executing scripts).

## 3. Database Design & Justification
- **Schema Mapping**: Details on how the `contoso` structured DB was modeled using ORMs (`models.Customer`).
- **Why PostgreSQL?**: Justification in terms of ACIDs, MVCC (Multi-Version Concurrency Control) for analytical reads while updates happen, and advanced aggregation functions.

## 4. Implementation Details
### 4.1 Transactional Component (CRUD)
- Discuss the REST endpoints in `/customers` router.
- Emphasize the ORM usage for parameter validation and reducing SQL INJECTION risks.

### 4.2 Analytical Component (OLAP)
- Discuss the complex queries (`Chohort_analysis.sql`, `retention_analysis.sql`, `customer_segmentaition.sql`).
- Address how they use Window functions (`row_number()`, `sum() over()`) effectively.
- How FastAPI runs these as Direct Data manipulations to serve the interactive JSON needed for charting.

## 5. Security & Authentication
- Details regarding OAuth2PasswordBearer implementation.
- How JWT (JSON Web Tokens) are generated, stored in local storage, and secured on the `/dashboard`.

## 6. Conclusion
- A wrap-up noting that the combination establishes a production-like foundation mirroring modern commercial approaches to database interaction, where analytics and record-keeping happen harmoniously.
