from gpiozero import MotionSensor
import requests
import time

API_URL = "http://127.0.0.1:8000/devices/motion_sensor_1"
pir = MotionSensor(17)  # PIR senzor povezan na GPIO 17

MOTION_TIMEOUT = 5  # sekundi bez pokreta pre nego što se javi "nema pokreta"


def send_motion(detected):
    try:
        requests.put(API_URL, json={"motion_detected": detected}, timeout=5)
        print(f"Pokret detektovan: {detected}")
    except Exception as e:
        print("Greška ka serveru:", e)


last_motion_time = None
motion_sent = False

while True:
    if pir.is_active:
        last_motion_time = time.time()
        if not motion_sent:
            send_motion(True)
            motion_sent = True
    elif motion_sent and time.time() - last_motion_time >= MOTION_TIMEOUT:
        send_motion(False)
        motion_sent = False

    time.sleep(0.5)