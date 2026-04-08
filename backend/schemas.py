from pydantic import BaseModel
from typing import Optional
from datetime import date

class CustomerBase(BaseModel):
    geoareakey: Optional[int] = None
    startdt: Optional[date] = None
    enddt: Optional[date] = None
    continent: Optional[str] = None
    gender: Optional[str] = None
    title: Optional[str] = None
    givenname: Optional[str] = None
    middleinitial: Optional[str] = None
    surname: Optional[str] = None
    streetaddress: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    statefull: Optional[str] = None
    zipcode: Optional[str] = None
    country: Optional[str] = None
    countryfull: Optional[str] = None
    birthday: Optional[date] = None
    age: Optional[int] = None
    occupation: Optional[str] = None
    company: Optional[str] = None
    vehicle: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class CustomerCreate(CustomerBase):
    customerkey: int # Need to provide or let DB auto-increment if modified, but since table does not have serial, we supply or take max+1.

class CustomerUpdate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    customerkey: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str
