from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, customers, analytics
import models
from database import engine

# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="DBMS Analytics Project")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(analytics.router)

@app.on_event("startup")
def startup_event():
    from sqlalchemy import text
    import os
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    view_file = os.path.join(BASE_DIR, "Chohort_analysis.sql")
    if not os.path.exists(view_file):
        return

    with open(view_file, "r") as f:
        sql = f.read().replace("create view", "create materialized view")

    with engine.connect() as conn:
        # Create indexes (safe - IF NOT EXISTS)
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sales_customerkey ON sales(customerkey);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sales_orderdate ON sales(orderdate);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_customer_customerkey ON customer(customerkey);"))
            conn.commit()
        except Exception:
            conn.rollback()

        # Only create materialized view if it does NOT exist yet
        try:
            exists = conn.execute(text(
                "SELECT 1 FROM pg_matviews WHERE matviewname = 'cohort_analysis'"
            )).fetchone()
            if not exists:
                conn.execute(text(sql))
                conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"[startup] Warning: could not create cohort_analysis view: {e}")


@app.get("/")
def root():
    return {"message": "Welcome to DBMS Analytics Project API"}
