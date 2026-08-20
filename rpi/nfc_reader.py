import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522
import requests

API_URL = "http://IP_ADRESA_SERVERA:8000/devices/nfc_reader_1"
reader = SimpleMFRC522()

print("Prislonite NFC karticu...")

try:
    while True:
        id, text = reader.read()  # Čeka dok se kartica ne prisloni
        tag_id = str(id)

        print(f"Očitana NFC kartica ID: {tag_id}")

        # Slanje ID-ja kartice na FastAPI server na validaciju
        try:
            requests.put(API_URL, json={"tag_id": tag_id})
        except Exception as e:
            print("Greška pri slanju na server:", e)

        import time

        time.sleep(2)  # Pauza da ne šalje višestruke zahteve za istu karticu

except KeyboardInterrupt:
    GPIO.cleanup()