from gpiozero import DigitalInputDevice
import requests
import time

API_URL = "http://127.0.0.1:8000/devices/flame_sensor_1"

# DO pin senzora plamena povezan na GPIO6.
# Na većini modula (npr. KY-026) izlaz je aktivan-nizak (LOW = detektovan plamen),
# zato pull_up=True. Ako na tvom modulu radi obrnuto, stavi pull_up=False.
flame_sensor = DigitalInputDevice(6, pull_up=True)


def send_flame_status(detected):
    try:
        response = requests.put(
            API_URL,
            json={"flame_detected": detected},
            timeout=5
        )
        print(f"Plamen detektovan: {detected} (HTTP {response.status_code})")
    except requests.RequestException as e:
        print("Greška ka serveru:", e)


while True:
    flame_sensor.wait_for_active()
    send_flame_status(True)

    flame_sensor.wait_for_inactive()
    send_flame_status(False)
