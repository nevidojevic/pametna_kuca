from sqlalchemy import Column, Integer, String, Float, Boolean
from .database import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)

class DeviceModel(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, index=True)
    type = Column(String)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    motion_detected = Column(Boolean, nullable=True)
    last_tag = Column(String, nullable=True)
    access_granted = Column(Boolean, nullable=True)
    status = Column(String, nullable=True)
    last_snapshot = Column(String, nullable=True)