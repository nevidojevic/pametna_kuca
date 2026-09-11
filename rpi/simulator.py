import requests
import time
import random

API_URL = "http://127.0.0.1:8000/devices"


def simulate_temperature_humidity():
    # Simulacija senzora temperature i vlažnosti (npr. DHT11)
    temp = round(random.uniform(20.0, 30.0), 1)
    humidity = round(random.uniform(40.0, 70.0), 1)

    payload = {"temperature": temp, "humidity": humidity}
    try:
        res = requests.put(f"{API_URL}/env_sensor_1", json=payload)
        print(f"[Temp/Vlaga] Poslato -> Temp: {temp}°C, Vlaga: {humidity}%")
    except Exception as e:
        print("Greška ka serveru:", e)


def simulate_motion():
    # Simulacija PIR senzora pokreta (povremeno detektuje pokret)
    motion = random.choice([True, False])
    payload = {"motion_detected": motion}
    try:
        requests.put(f"{API_URL}/motion_sensor_1", json=payload)
        print(f"[Pokret] Status detekcije: {motion}")
    except Exception as e:
        print("Greška ka serveru:", e)


def simulate_rfid_access():
    # Simulacija prislanjanja RFID kartice
    tags = ["ADMIN_CARD_123", "GUEST_CARD_999", "UNKNOWN_TAG"]
    tag = random.choice(tags)
    payload = {"tag_id": tag}
    try:
        requests.put(f"{API_URL}/rfid_reader_1", json=payload)
        print(f"[RFID] Očitan tag: {tag}")
    except Exception as e:
        print("Greška ka serveru:", e)


def simulate_camera():
    # Simulacija kamere koja detektuje pristup i pravi snimak
    statuses = ["IDLE", "RECORDING", "MOTION_SNAPSHOT"]
    status = random.choice(statuses)
    snapshot = f"/snapshots/img_{int(time.time())}.jpg" if status == "MOTION_SNAPSHOT" else None

    payload = {"camera_status": status, "snapshot_url": snapshot}
    try:
        requests.put(f"{API_URL}/camera_1", json=payload)
        print(f"[Kamera] Status: {status}")
    except Exception as e:
        print("Greška ka serveru:", e)


if __name__ == "__main__":
    print("Pokretanje simulacije hardvera (Raspberry Pi emulator)... Pritisnite Ctrl+C za izlaz.")
    while True:
        simulate_temperature_humidity()
        simulate_motion()

        # Povremeno simuliraj RFID i kameru (ne u svakom ciklusu)
        if random.random() > 0.6:
            simulate_rfid_access()
        if random.random() > 0.5:
            simulate_camera()

        print("-" * 40)
        time.sleep(5)  # Šalje podatke na svakih 5 sekundi