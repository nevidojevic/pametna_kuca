from gpiozero import MotionSensor
import requests
import time

API_URL = "http://127.0.0.1:8000/devices/motion_sensor_1"
pir = MotionSensor(17)  # PIR senzor povezan na GPIO 17


def send_motion(detected):
    try:
        requests.put(API_URL, json={"motion_detected": detected})
        print(f"Pokret detektovan: {detected}")
    except Exception as e:
        print("Greška ka serveru:", e)


while True:
    pir.wait_for_motion()
    send_motion(True)

    pir.wait_for_no_motion()
    send_motion(False)