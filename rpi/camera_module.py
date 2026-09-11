import cv2
import requests
import time

API_URL = "http://127.0.0.1:8000/devices/camera_1"


def take_snapshot():
    # Inicijalizacija kamere (0 je obično USB kamera ili default Pi kamera)
    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()

    if ret:
        filename = f"/tmp/snapshot_{int(time.time())}.jpg"
        cv2.imwrite(filename, frame)
        print(f"Fotografija sačuvana: {filename}")

        # Ovde bi se fajl poslao na server (ili multipart/form-data zahtevom)
        # Za potrebe primera šaljemo putanju ili status
        requests.put(API_URL, json={"camera_status": "MOTION_SNAPSHOT", "snapshot_url": filename})

    cap.release()


# Poziva se npr. kada PIR senzor javi pokret
take_snapshot()