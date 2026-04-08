from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas
from database import get_db

router = APIRouter(prefix="/customers", tags=["customers"])

@router.get("/", response_model=list[schemas.CustomerResponse])
def get_customers(
    skip: int = 0,
    limit: int = 500,
    search: str = None,
    gender: str = None,
    country: str = None,
    occupation: str = None,
    db: Session = Depends(get_db)
):
    q = db.query(models.Customer)

    if search:
        like = f"%{search}%"
        from sqlalchemy import or_
        q = q.filter(or_(
            models.Customer.givenname.ilike(like),
            models.Customer.surname.ilike(like),
            models.Customer.countryfull.ilike(like),
            models.Customer.city.ilike(like),
            models.Customer.occupation.ilike(like),
        ))
    if gender:
        q = q.filter(models.Customer.gender == gender)
    if country:
        q = q.filter(models.Customer.countryfull == country)
    if occupation:
        q = q.filter(models.Customer.occupation == occupation)

    return q.order_by(models.Customer.customerkey).offset(skip).limit(limit).all()

@router.get("/filters")
def get_filter_options(db: Session = Depends(get_db)):
    """Return sorted distinct values for every filterable column — fetched in one query each."""
    from sqlalchemy import distinct

    genders   = [r[0] for r in db.query(distinct(models.Customer.gender)).filter(models.Customer.gender.isnot(None)).order_by(models.Customer.gender).all()]
    countries = [r[0] for r in db.query(distinct(models.Customer.countryfull)).filter(models.Customer.countryfull.isnot(None)).order_by(models.Customer.countryfull).all()]
    occs      = [r[0] for r in db.query(distinct(models.Customer.occupation)).filter(models.Customer.occupation.isnot(None)).order_by(models.Customer.occupation).all()]

    return {"genders": genders, "countries": countries, "occupations": occs}

@router.get("/{customerkey}", response_model=schemas.CustomerResponse)
def get_customer(customerkey: int, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.customerkey == customerkey).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.post("/", response_model=schemas.CustomerResponse)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    db_customer = db.query(models.Customer).filter(models.Customer.customerkey == customer.customerkey).first()
    if db_customer:
        raise HTTPException(status_code=400, detail="Customer key already registered")
    new_customer = models.Customer(**customer.dict())
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

@router.put("/{customerkey}", response_model=schemas.CustomerResponse)
def update_customer(customerkey: int, customer: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    db_customer = db.query(models.Customer).filter(models.Customer.customerkey == customerkey).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for key, value in customer.dict(exclude_unset=True).items():
        setattr(db_customer, key, value)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.delete("/{customerkey}")
def delete_customer(customerkey: int, db: Session = Depends(get_db)):
    db_customer = db.query(models.Customer).filter(models.Customer.customerkey == customerkey).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(db_customer)
    db.commit()
    return {"ok": True}
