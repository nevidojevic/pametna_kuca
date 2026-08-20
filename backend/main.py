from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI(title="Smart Home Hardware API", version="1.0")

# Centralna baza stanja uređaja i senzora
devices_state: Dict[str, Dict[str, Any]] = {
    "env_sensor_1": {"type": "temperature_humidity", "temperature": 22.0, "humidity": 45.0},
    "motion_sensor_1": {"type": "motion", "motion_detected": False, "last_active": None},
    "nfc_reader_1": {"type": "nfc", "last_tag": None, "access_granted": False},
    "camera_1": {"type": "camera", "status": "IDLE", "last_snapshot": None}
}


class SensorUpdate(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    motion_detected: Optional[bool] = None
    tag_id: Optional[str] = None
    camera_status: Optional[str] = None
    snapshot_url: Optional[str] = None


@app.get("/devices/")
def get_all_devices():
    return devices_state


@app.put("/devices/{device_id}")
def update_device_data(device_id: str, update: SensorUpdate):
    if device_id not in devices_state:
        raise HTTPException(status_code=404, detail="Uređaj nije pronađen")

    device = devices_state[device_id]

    # Ažuriranje senzora temperature i vlažnosti
    if update.temperature is not None:
        device["temperature"] = update.temperature
    if update.humidity is not None:
        device["humidity"] = update.humidity

    # Ažuriranje senzora pokreta (uz automatsku logiku)
    if update.motion_detected is not None:
        device["motion_detected"] = update.motion_detected
        if update.motion_detected:
            print(f"[AUTOMATIZACIJA] Pokret detektovan na {device_id}! Paljenje sigurnosnog svetla...")

    # Ažuriranje NFC čitača za pristup
    if update.tag_id is not None:
        device["last_tag"] = update.tag_id
        # Provera da li je tag dozvoljen (npr. "ADMIN_CARD_123")
        if update.tag_id == "ADMIN_CARD_123":
            device["access_granted"] = True
            print(f"[PRISTUP] NFC Tag {update.tag_id} odobren. Otvaranje brave.")
        else:
            device["access_granted"] = False
            print(f"[PRISTUP] Nepoznat NFC Tag {update.tag_id}. Pristup odbijen!")

    # Ažuriranje kamere
    if update.camera_status is not None:
        device["status"] = update.camera_status
    if update.snapshot_url is not None:
        device["last_snapshot"] = update.snapshot_url
        print(f"[KAMERA] Nova fotografija sa kamere: {update.snapshot_url}")

    return {"message": "Uspesno ažurirano", "device": device}