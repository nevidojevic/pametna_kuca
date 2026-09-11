| Ime prezime  | Broj indeksa |
| ------------ | ------------ |
| _(popuniti)_ | _(popuniti)_ |
| _(popuniti)_ | _(popuniti)_ |

**Link ka GitHubu:** _(popuniti)_

---

## 1. Korišćeni senzori

### 1.1 Opis problema

Potrebno je kreirati veb servis koji u JSON formatu prikazuje informacije prikupljene iz pametnog okruženja doma. Sistem simulira pametnu kuću i koristi više senzora za praćenje uslova u okruženju i kontrolu pristupa.

Raspberry Pi prikuplja podatke sa DHT11 senzora (temperatura i vlažnost vazduha), PIR senzora (detekcija pokreta) i RFID čitača (kontrola pristupa ulaznim vratima), a po potrebi aktivira i kameru koja pravi snimak pri detekciji pokreta.

Raspberry Pi šalje očitane podatke FastAPI serveru putem HTTP zahteva (WiFi/LAN), a ne putem serijske veze — svaki senzor ima svoju Python skriptu koja direktno komunicira sa serverom. Server podatke čuva u SQLite bazi i izlaže ih putem REST API-ja u JSON formatu. Veb aplikacija (React) prikazuje trenutno stanje svih uređaja i osvežava ga na svake 3 sekunde.

Sistem može da registruje normalne uslove (temperatura/vlažnost), prisustvo pokreta, dozvoljen ili odbijen pristup putem RFID kartice, kao i status kamere.

### Projektovanje

Fizičko povezivanje senzora i Raspberry Pi uređaja prikazano je na Slici 1.

> _(Ovde ubaciti Fritzing šemu povezivanja — Slika 1: Fizičko povezivanje senzora i uređaja)_

Pinovi na koje su senzori povezani:

| Senzor | Pin senzora | Raspberry Pi |
|--------|-------------|--------------|
| DHT11 | DATA | GPIO17 |
| DHT11 | VCC | 3.3V |
| DHT11 | GND | GND |
| PIR | OUT | GPIO22 |
| PIR | VCC | 5V |
| PIR | GND | GND |
| RFID MFRC522 | SDA (SS) | GPIO8 (CE0) |
| RFID MFRC522 | SCK | GPIO11 |
| RFID MFRC522 | MOSI | GPIO10 |
| RFID MFRC522 | MISO | GPIO9 |
| RFID MFRC522 | RST | GPIO25 |
| RFID MFRC522 | 3.3V | 3.3V |
| RFID MFRC522 | GND | GND |

### 1.2 Pametni uređaji

Pametni uređaji potrebni za realizaciju primera dati su u Tabeli 1.

| Naziv komponente | Opis | Količina |
|-------------------|------|-----------|
| Raspberry Pi mikroračunar | 3/4 Model B | 1 |
| DHT11 | Senzor temperature i vlažnosti vazduha | 1 |
| PIR senzor | Senzor pokreta | 1 |
| RFID čitač MFRC522 | Čitač kartica na 13.56 MHz, kontrola pristupa | 1 |
| RFID kartica/privezak | Za prislanjanje na čitač | 1+ |
| Kamera (USB ili Pi Camera) | Snimanje fotografije pri pokretu | 1 |
| Proto ploča | Za povezivanje elektronskih elemenata | 1 |
| Kablovi | Muško-Ženski | 5 |
| Kablovi | Muško-Muški | 3 |

*Tabela 1: Prikaz pametnih uređaja za realizaciju rešenja*

### 1.3 Scenario

DHT11 senzor i PIR senzor pokreta povezani su na isti Raspberry Pi i rade paralelno (preko Python `threading` modula), jer PIR senzor koristi blokirajući poziv (`wait_for_motion()`) koji bi, bez posebne niti, zaustavio čitanje DHT11 senzora dok se ne detektuje pokret.

RFID čitač i kamera rade kao zasebne skripte koje se pokreću nezavisno.

**Stanja uređaja koja se prikazuju na dashboard-u:**

| Uređaj (id) | Tip | Prikazano stanje |
|-------------|-----|-------------------|
| `env_sensor_1` | `temperature_humidity` | Temperatura (°C) i vlažnost (%) |
| `motion_sensor_1` | `motion` | "Sve mirno" / "Detektovan pokret" |
| `rfid_reader_1` | `rfid` | "Otključano" / "Zaključano" + poslednji očitani tag |
| `camera_1` | `camera` | `IDLE` / `RECORDING` / `MOTION_SNAPSHOT` |

Svaka skripta na Raspberry Pi-ju šalje očitane vrednosti FastAPI serveru putem HTTP `PUT` zahteva na adresu:

```text
http://IP_ADRESA_SERVERA:8000/devices/{id_uređaja}
```

**DHT11 + PIR (`rpi/dht_sensor.py`):**

```python
import time
import threading
import requests
import adafruit_dht
import board
from gpiozero import MotionSensor

ENV_API_URL = "http://IP_ADRESA_SERVERA:8000/devices/env_sensor_1"
MOTION_API_URL = "http://IP_ADRESA_SERVERA:8000/devices/motion_sensor_1"

dht_device = adafruit_dht.DHT11(board.D17)


def read_dht():
    while True:
        try:
            temperature = dht_device.temperature
            humidity = dht_device.humidity

            if temperature is not None and humidity is not None:
                payload = {"temperature": temperature, "humidity": humidity}
                response = requests.put(ENV_API_URL, json=payload, timeout=5)
                print(f"DHT11 -> Temperatura: {temperature}°C, Vlaga: {humidity}% (HTTP {response.status_code})")

        except RuntimeError as error:
            print(f"Greška DHT11 senzora: {error.args[0]}")
        except requests.RequestException as error:
            print(f"Greška ka ENV serveru: {error}")

        time.sleep(5)


pir = MotionSensor(22)


def send_motion(detected):
    response = requests.put(MOTION_API_URL, json={"motion_detected": detected}, timeout=5)
    print(f"PIR -> Pokret detektovan: {detected} (HTTP {response.status_code})")


def monitor_pir():
    while True:
        pir.wait_for_motion()
        send_motion(True)
        pir.wait_for_no_motion()
        send_motion(False)


threading.Thread(target=read_dht, daemon=True).start()
threading.Thread(target=monitor_pir, daemon=True).start()

while True:
    time.sleep(1)
```

**RFID čitač (`rpi/rfid_reader.py`):**

```python
import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522
import requests
import time

API_URL = "http://IP_ADRESA_SERVERA:8000/devices/rfid_reader_1"
reader = SimpleMFRC522()

try:
    while True:
        id, text = reader.read()
        tag_id = str(id)
        requests.put(API_URL, json={"tag_id": tag_id}, timeout=5)
        print(f"Očitana RFID kartica ID: {tag_id}")
        time.sleep(2)
except KeyboardInterrupt:
    GPIO.cleanup()
```

Server, po prijemu `tag_id`, upoređuje ga sa ovlašćenom karticom i određuje da li se vrata otključavaju:

```python
access_allowed = (update.tag_id == "ADMIN_CARD_123")
device.access_granted = access_allowed
```

Svako očitavanje kartice se automatski upisuje u istoriju pristupa (`access_logs`), a svako novo očitavanje temperature/vlažnosti u istoriju senzora (`sensor_logs`).

FastAPI aplikacija se pokreće komandom:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

i izlaže podatke u JSON formatu na adresi:

```text
http://IP_ADRESA_SERVERA:8000/devices/
```

Primer dobijenog JSON rezultata:

```json
{
  "env_sensor_1": { "type": "temperature_humidity", "temperature": 22.4, "humidity": 48.0 },
  "motion_sensor_1": { "type": "motion", "motion_detected": false },
  "rfid_reader_1": { "type": "rfid", "last_tag": "123456789", "access_granted": true },
  "camera_1": { "type": "camera", "status": "IDLE", "last_snapshot": null }
}
```

React veb aplikacija (`pametna-kuca-front`) povlači ove podatke sa `GET /devices/` na svake 3 sekunde i prikazuje ih korisniku na dashboard-u.

---

Fakultet organizacionih nauka
Predmet: Internet inteligentnih uređaja
