from sqlalchemy import Column, Integer, String, Date, Float
from database import Base

class Customer(Base):
    __tablename__ = "customer"

    customerkey = Column(Integer, primary_key=True, index=True)
    geoareakey = Column(Integer)
    startdt = Column(Date)
    enddt = Column(Date)
    continent = Column(String(50))
    gender = Column(String(10))
    title = Column(String(20))
    givenname = Column(String(50))
    middleinitial = Column(String(5))
    surname = Column(String(50))
    streetaddress = Column(String(100))
    city = Column(String(50))
    state = Column(String(50))
    statefull = Column(String(100))
    zipcode = Column(String(20))
    country = Column(String(50))
    countryfull = Column(String(100))
    birthday = Column(Date)
    age = Column(Integer)
    occupation = Column(String(100))
    company = Column(String(100))
    vehicle = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
