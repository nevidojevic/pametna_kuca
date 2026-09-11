import time
import threading
import requests
import adafruit_dht
import board
from gpiozero import MotionSensor


# ==========================================
# FASTAPI SERVER
# ==========================================

ENV_API_URL = "http://127.0.0.1:8000/devices/env_sensor_1"
MOTION_API_URL = "http://127.0.0.1:8000/devices/motion_sensor_1"


# ==========================================
# DHT11 SENZOR
# DATA -> GPIO 17
# ==========================================

dht_device = adafruit_dht.DHT11(board.D17)


def read_dht():
    while True:
        try:
            temperature = dht_device.temperature
            humidity = dht_device.humidity

            if temperature is not None and humidity is not None:

                payload = {
                    "temperature": temperature,
                    "humidity": humidity
                }

                response = requests.put(
                    ENV_API_URL,
                    json=payload,
                    timeout=5
                )

                print(
                    f"DHT11 -> Temperatura: {temperature}°C, "
                    f"Vlaga: {humidity}% "
                    f"(HTTP {response.status_code})"
                )

        except RuntimeError as error:
            print(f"Greška DHT11 senzora: {error.args[0]}")

        except requests.RequestException as error:
            print(f"Greška ka ENV serveru: {error}")

        except Exception as error:
            print(f"Neočekivana greška DHT11: {error}")

        time.sleep(5)


# ==========================================
# PIR SENZOR
# DATA -> GPIO 22
# ==========================================

pir = MotionSensor(22)

MOTION_TIMEOUT = 5  # sekundi bez pokreta pre nego što se javi "nema pokreta"


def send_motion(detected):
    try:
        response = requests.put(
            MOTION_API_URL,
            json={
                "motion_detected": detected
            },
            timeout=5
        )

        print(
            f"PIR -> Pokret detektovan: {detected} "
            f"(HTTP {response.status_code})"
        )

    except requests.RequestException as error:
        print(f"Greška ka MOTION serveru: {error}")


def monitor_pir():
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


# ==========================================
# POKRETANJE OBA SENZORA
# ==========================================

dht_thread = threading.Thread(
    target=read_dht,
    daemon=True
)

pir_thread = threading.Thread(
    target=monitor_pir,
    daemon=True
)

dht_thread.start()
pir_thread.start()


# ==========================================
# GLAVNI PROGRAM
# ==========================================

try:
    while True:
        time.sleep(1)

except KeyboardInterrupt:
    print("\nProgram zaustavljen.")

finally:
    dht_device.exit()
    pir.close()
