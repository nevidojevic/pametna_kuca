import time
import threading
import queue
import requests
import adafruit_dht
import board
from gpiozero import MotionSensor, DigitalInputDevice
import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522


# ==========================================
# FASTAPI SERVER
# ==========================================

ENV_API_URL = "http://127.0.0.1:8000/devices/env_sensor_1"
MOTION_API_URL = "http://127.0.0.1:8000/devices/motion_sensor_1"
FLAME_API_URL = "http://127.0.0.1:8000/devices/flame_sensor_1"
RFID_API_URL = "http://127.0.0.1:8000/devices/rfid_reader_1"


# ==========================================
# DHT11 SENZOR
# DATA -> GPIO17
# ==========================================

dht_device = adafruit_dht.DHT11(board.D17)


def read_dht():
    while True:
        try:
            temperature = dht_device.temperature
            humidity = dht_device.humidity

            if temperature is not None and humidity is not None:
                response = requests.put(
                    ENV_API_URL,
                    json={"temperature": temperature, "humidity": humidity},
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
# DATA -> GPIO22
# ==========================================

pir = MotionSensor(22)

MOTION_TIMEOUT = 5  # sekundi bez pokreta pre nego što se javi "nema pokreta"


def send_motion(detected):
    try:
        response = requests.put(
            MOTION_API_URL,
            json={"motion_detected": detected},
            timeout=5
        )
        print(f"PIR -> Pokret detektovan: {detected} (HTTP {response.status_code})")
    except requests.RequestException as error:
        print(f"Greška ka MOTION serveru: {error}")


def monitor_pir():
    last_motion_time = None
    motion_sent = False

    while True:
        try:
            if pir.is_active:
                last_motion_time = time.time()
                if not motion_sent:
                    send_motion(True)
                    motion_sent = True
            elif motion_sent and time.time() - last_motion_time >= MOTION_TIMEOUT:
                send_motion(False)
                motion_sent = False
        except Exception as error:
            print(f"Greška PIR senzora: {error}")

        time.sleep(0.5)


# ==========================================
# SENZOR PLAMENA
# DO -> GPIO6
# ==========================================

flame_sensor = DigitalInputDevice(6, pull_up=True)


def send_flame_status(detected):
    try:
        response = requests.put(
            FLAME_API_URL,
            json={"flame_detected": detected},
            timeout=5
        )
        print(f"Plamen detektovan: {detected} (HTTP {response.status_code})")
    except requests.RequestException as error:
        print(f"Greška ka serveru: {error}")


def monitor_flame():
    while True:
        try:
            flame_sensor.wait_for_active()
            send_flame_status(True)

            flame_sensor.wait_for_inactive()
            send_flame_status(False)
        except Exception as error:
            print(f"Greška senzora plamena: {error}")
            time.sleep(1)


# ==========================================
# RFID ČITAČ (MFRC522, SPI, RST -> GPIO25)
# ==========================================

rfid_reader = SimpleMFRC522()

RFID_UNLOCK_DURATION = 5  # sekundi koliko vrata ostaju "otključana" pre auto-zaključavanja
RFID_READ_TIMEOUT = 15  # sekundi - ako reader.read() ne vrati ništa za ovo vreme, odustaje se od tog pokušaja


def _blocking_read(result_queue):
    # Ovo se izvršava u pomoćnoj niti jer reader.read() ume da se
    # zaglavi zauvek u internoj petlji biblioteke (bez izuzetka, bez
    # povratka) - tada glavna nit napusti join() po timeout-u i ova
    # nit ostaje "obešena" u pozadini kao daemon, bezopasno.
    try:
        result_queue.put(rfid_reader.read())
    except Exception as error:
        result_queue.put(error)


def monitor_rfid():
    print("Prislonite RFID karticu...")
    while True:
        try:
            # Resetuje registre/antenu čitača preko VEĆ otvorene SPI veze
            # (ne otvara novu - to je ono što je ranije pokvarilo čitanje).
            rfid_reader.READER.MFRC522_Init()

            result_queue = queue.Queue(maxsize=1)
            read_thread = threading.Thread(
                target=_blocking_read,
                args=(result_queue,),
                daemon=True
            )
            read_thread.start()
            read_thread.join(timeout=RFID_READ_TIMEOUT)

            if read_thread.is_alive():
                print(f"RFID čitanje predugo traje (>{RFID_READ_TIMEOUT}s) - odustajem i pokušavam ponovo.")
                continue

            result = result_queue.get()
            if isinstance(result, Exception):
                raise result
            id, text = result

            tag_id = str(id)
            print(f"Očitana RFID kartica ID: {tag_id}")

            requests.put(RFID_API_URL, json={"tag_id": tag_id}, timeout=5)

            time.sleep(RFID_UNLOCK_DURATION)

            requests.put(RFID_API_URL, json={"access_granted": False}, timeout=5)
            print("RFID -> Vrata automatski zaključana")
            print("Prislonite RFID karticu...")

        except requests.RequestException as error:
            print(f"Greška ka serveru: {error}")

        except Exception as error:
            print(f"Greška RFID čitača: {error}")


# ==========================================
# POKRETANJE SVIH SENZORA
# ==========================================

threads = [
    threading.Thread(target=read_dht, daemon=True),
    threading.Thread(target=monitor_pir, daemon=True),
    threading.Thread(target=monitor_flame, daemon=True),
    threading.Thread(target=monitor_rfid, daemon=True),
]

for t in threads:
    t.start()


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
    flame_sensor.close()
    GPIO.cleanup()
