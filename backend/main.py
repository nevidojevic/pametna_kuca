from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, SessionLocal, Base
from .models import UserModel, DeviceModel

# Inicijalizacija tabela u bazi
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Home API with SQLite", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency za dobijanje sesije baze
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Pydantic šeme
class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class SensorUpdate(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    motion_detected: Optional[bool] = None
    tag_id: Optional[str] = None
    camera_status: Optional[str] = None
    snapshot_url: Optional[str] = None


# Automatsko kreiranje inicijalnih uređaja u bazi ako ne postoje
@app.on_event("startup")
def startup_db():
    db = SessionLocal()
    initial_devices = [
        {"id": "env_sensor_1", "type": "temperature_humidity", "temperature": 22.0, "humidity": 45.0},
        {"id": "motion_sensor_1", "type": "motion", "motion_detected": False},
        {"id": "nfc_reader_1", "type": "nfc", "last_tag": None, "access_granted": False},
        {"id": "camera_1", "type": "camera", "status": "IDLE", "last_snapshot": None}
    ]
    for dev in initial_devices:
        exists = db.query(DeviceModel).filter(DeviceModel.id == dev["id"]).first()
        if not exists:
            db_dev = DeviceModel(**dev)
            db.add(db_dev)
    db.commit()
    db.close()


# --- KORISNICI (REGISTRACIJA I LOGIN) ---

@app.post("/users/")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(UserModel).filter(UserModel.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Korisničko ime već postoji.")

    new_user = UserModel(username=user.username, email=user.email, password=user.password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Korisnik uspešno registrovan", "username": new_user.username}


@app.post("/login/")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(UserModel).filter(UserModel.username == user.username,
                                         UserModel.password == user.password).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Pogrešno korisničko ime ili lozinka.")
    return {"message": "Uspešna prijava", "username": db_user.username}


# --- UREĐAJI I SENZORI ---

@app.get("/devices/")
def get_all_devices(db: Session = Depends(get_db)):
    devices = db.query(DeviceModel).all()
    devices_dict = {}
    for dev in devices:
        devices_dict[dev.id] = {
            "type": dev.type,
            "temperature": dev.temperature,
            "humidity": dev.humidity,
            "motion_detected": dev.motion_detected,
            "last_tag": dev.last_tag,
            "access_granted": dev.access_granted,
            "status": dev.status,
            "last_snapshot": dev.last_snapshot
        }
    return devices_dict


@app.put("/devices/{device_id}")
def update_device_data(device_id: str, update: SensorUpdate, db: Session = Depends(get_db)):
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Uređaj nije pronađen")

    if update.temperature is not None:
        device.temperature = update.temperature
    if update.humidity is not None:
        device.humidity = update.humidity
    if update.motion_detected is not None:
        device.motion_detected = update.motion_detected
    if update.tag_id is not None:
        device.last_tag = update.tag_id
        device.access_granted = (update.tag_id == "ADMIN_CARD_123")
    if update.camera_status is not None:
        device.status = update.camera_status
    if update.snapshot_url is not None:
        device.last_snapshot = update.snapshot_url

    db.commit()
    db.refresh(device)
    return {"message": "Uspešno ažurirano u bazi", "device_id": device.id}