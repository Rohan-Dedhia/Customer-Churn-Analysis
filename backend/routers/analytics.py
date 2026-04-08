from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, engine

router = APIRouter(prefix="/analytics", tags=["analytics"])


def run_query(db: Session, sql: str):
    try:
        result = db.execute(text(sql))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh")
def refresh_materialized_view():
    """Rebuild the cohort_analysis materialized view to reflect latest DB changes."""
    try:
        with engine.begin() as conn:
            conn.execute(text("REFRESH MATERIALIZED VIEW cohort_analysis"))
        return {"status": "refreshed", "message": "cohort_analysis materialized view rebuilt successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cohort")
def get_cohort_analysis(db: Session = Depends(get_db)):
    """Total lifetime revenue & customer count grouped by first-purchase cohort year."""
    sql = """
        SELECT
            cohort_year,
            SUM(total_net_revenue)                                         AS total_revenue,
            COUNT(DISTINCT customerkey)                                    AS total_customers,
            SUM(total_net_revenue) / NULLIF(COUNT(DISTINCT customerkey), 0) AS customer_revenue
        FROM cohort_analysis
        GROUP BY cohort_year
        ORDER BY cohort_year
    """
    return run_query(db, sql)


@router.get("/retention")
def get_retention_analysis(db: Session = Depends(get_db)):
    """Churned vs Active customer counts per cohort year."""
    sql = """
        WITH latest AS (
            SELECT
                customerkey,
                cohort_year,
                MAX(orderdate) AS last_order_date
            FROM cohort_analysis
            GROUP BY customerkey, cohort_year
        ),
        classified AS (
            SELECT
                customerkey,
                cohort_year,
                CASE
                    WHEN last_order_date < (SELECT MAX(orderdate) FROM cohort_analysis) - INTERVAL '6 months'
                    THEN 'Churned'
                    ELSE 'Active'
                END AS customer_status
            FROM latest
            WHERE cohort_year < EXTRACT(YEAR FROM (SELECT MAX(orderdate) FROM cohort_analysis) - INTERVAL '6 months')
        )
        SELECT
            cohort_year,
            customer_status,
            COUNT(customerkey) AS num_customers
        FROM classified
        GROUP BY cohort_year, customer_status
        ORDER BY cohort_year, customer_status
    """
    return run_query(db, sql)


@router.get("/segmentation")
def get_segmentation_analysis(db: Session = Depends(get_db)):
    """Total lifetime revenue & avg revenue per customer by cohort year."""
    sql = """
        SELECT
            cohort_year,
            SUM(total_net_revenue)                                         AS total_revenue,
            COUNT(DISTINCT customerkey)                                    AS total_customers,
            SUM(total_net_revenue) / NULLIF(COUNT(DISTINCT customerkey), 0) AS customer_revenue
        FROM cohort_analysis
        GROUP BY cohort_year
        ORDER BY cohort_year
    """
    return run_query(db, sql)


@router.get("/geography")
def get_geography_analysis(db: Session = Depends(get_db)):
    """Top 8 countries by distinct customer count."""
    sql = """
        SELECT
            countryfull AS country,
            COUNT(DISTINCT customerkey) AS num_customers
        FROM cohort_analysis
        WHERE countryfull IS NOT NULL
        GROUP BY countryfull
        ORDER BY num_customers DESC
        LIMIT 8
    """
    return run_query(db, sql)


@router.get("/top_customers")
def get_top_customers(limit: int = 10, year: str = "ALL", status: str = "ALL", db: Session = Depends(get_db)):
    """Get top customers by lifetime revenue, applying cohort year & status filters."""
    sql = f"""
        WITH latest AS (
            SELECT
                customerkey,
                cohort_year,
                MAX(orderdate) AS last_order_date,
                SUM(total_net_revenue) AS total_revenue,
                MAX(givenname) AS givenname,
                MAX(surname) AS surname,
                MAX(countryfull) AS countryfull
            FROM cohort_analysis
            GROUP BY customerkey, cohort_year
        ),
        classified AS (
            SELECT
                customerkey,
                cohort_year,
                total_revenue,
                givenname,
                surname,
                countryfull AS country,
                CASE
                    WHEN cohort_year >= EXTRACT(YEAR FROM (SELECT MAX(orderdate) FROM cohort_analysis) - INTERVAL '6 months')
                    THEN 'Active'
                    WHEN last_order_date < (SELECT MAX(orderdate) FROM cohort_analysis) - INTERVAL '6 months'
                    THEN 'Churned'
                    ELSE 'Active'
                END AS customer_status
            FROM latest
        )
        SELECT 
            customerkey, 
            givenname, 
            surname, 
            country,
            cohort_year,
            customer_status,
            total_revenue
        FROM classified
        WHERE ('{year}' = 'ALL' OR CAST(cohort_year AS VARCHAR) = '{year}')
          AND ('{status}' = 'ALL' OR customer_status = '{status}')
        ORDER BY total_revenue DESC
        LIMIT {limit}
    """
    return run_query(db, sql)
