from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
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
    last_motion_at = Column(DateTime, nullable=True)
    flame_detected = Column(Boolean, nullable=True)
    last_tag = Column(String, nullable=True)
    access_granted = Column(Boolean, nullable=True)

class SensorLogModel(Base):
    __tablename__ = "sensor_logs"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class AccessLogModel(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    tag_id = Column(String)
    access_granted = Column(Boolean)
    timestamp = Column(DateTime, default=datetime.utcnow)