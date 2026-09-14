| Ime prezime  | Broj indeksa |
| ------------ | ------------ |
| _(popuniti)_ | _(popuniti)_ |
| _(popuniti)_ | _(popuniti)_ |

**Link ka GitHubu:** https://github.com/nevidojevic/pametna_kuca

---

## 1. Korišćeni senzori

### 1.1 Opis problema

Potrebno je kreirati veb servis koji u JSON formatu prikazuje informacije prikupljene iz pametnog okruženja doma. Sistem simulira pametnu kuću i koristi više senzora za praćenje uslova u okruženju i kontrolu pristupa.

Raspberry Pi prikuplja podatke sa DHT11 senzora (temperatura i vlažnost vazduha), PIR senzora (detekcija pokreta), senzora plamena i RFID čitača (kontrola pristupa ulaznim vratima).

Raspberry Pi šalje očitane podatke FastAPI serveru putem HTTP zahteva, a ne putem serijske veze — backend radi na istom Raspberry Pi-ju kao i senzori, dok se veb aplikacija (front) otvara sa drugog uređaja na mreži. Server podatke čuva u SQLite bazi i izlaže ih putem REST API-ja u JSON formatu. Veb aplikacija (React) prikazuje trenutno stanje svih uređaja uživo (osvežavanje na 3 sekunde), uključujući grafik temperature i vlažnosti u realnom vremenu, i istoriju prošlih očitavanja.

Sistem registruje: temperaturu i vlažnost (sa live grafikom), prisustvo pokreta (sa tačnim vremenom poslednje detekcije), prisustvo plamena, i dozvoljen ili odbijen pristup putem RFID kartice (sa automatskim zaključavanjem vrata 5 sekundi nakon očitavanja).

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
| Senzor plamena | DO | GPIO6 |
| Senzor plamena | VCC | 5V |
| Senzor plamena | GND | GND |
| RFID MFRC522 | SDA (SS) | GPIO8 |
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
| Raspberry Pi mikroračunar | 3/4/5 Model B | 1 |
| DHT11 | Senzor temperature i vlažnosti vazduha | 1 |
| PIR senzor | Senzor pokreta | 1 |
| Senzor plamena | Digitalni izlaz, detekcija IR zračenja plamena | 1 |
| RFID čitač MFRC522 | Čitač kartica na 13.56 MHz, kontrola pristupa | 1 |
| RFID kartica/privezak | Za prislanjanje na čitač | 1+ |
| Proto ploča | Za povezivanje elektronskih elemenata | 1 |
| Kablovi | Muško-Ženski | 5 |
| Kablovi | Muško-Muški | 3 |

*Tabela 1: Prikaz pametnih uređaja za realizaciju rešenja*

### 1.3 Scenario

Svi senzori (DHT11, PIR, plamen, RFID) povezani su na isti Raspberry Pi i rade paralelno unutar jedne skripte, [`rpi/all_sensors.py`](../rpi/all_sensors.py), svaki u svom `threading` nitu — PIR i RFID koriste blokirajuće pozive (čekaju na pokret, odnosno na karticu), pa bi bez odvojenih niti zaustavili čitanje ostalih senzora dok čekaju.

**Stanja uređaja koja se prikazuju na dashboard-u:**

| Uređaj (id) | Tip | Prikazano stanje |
|-------------|-----|-------------------|
| `env_sensor_1` | `temperature_humidity` | Temperatura (°C) i vlažnost (%), sa live grafikom |
| `motion_sensor_1` | `motion` | "Mirno" / "Detektovan pokret" + tačno vreme poslednje detekcije |
| `flame_sensor_1` | `flame` | "Nema plamena" / "Opasnost — detektovan plamen" |
| `rfid_reader_1` | `rfid` | "Otključano" / "Zaključano" + poslednji očitani tag |

Svaka nit u skripti šalje očitane vrednosti FastAPI serveru putem HTTP `PUT` zahteva na adresu:

```text
http://127.0.0.1:8000/devices/{id_uređaja}
```

(Backend radi na istom Raspberry Pi-ju kao i senzori, zato `127.0.0.1`.)

**DHT11 (`rpi/all_sensors.py`):**

```python
import adafruit_dht
import board

dht_device = adafruit_dht.DHT11(board.D17)

def read_dht():
    while True:
        try:
            temperature = dht_device.temperature
            humidity = dht_device.humidity
            if temperature is not None and humidity is not None:
                requests.put(ENV_API_URL, json={"temperature": temperature, "humidity": humidity}, timeout=5)
        except RuntimeError as error:
            print(f"Greška DHT11 senzora: {error.args[0]}")
        time.sleep(5)
```

**PIR sa softverskim timeoutom (`rpi/all_sensors.py`):**

PIR moduli imaju sopstveno hardversko "hold" vreme koje je često dugo i nepredvidivo. Umesto oslanjanja na to, skripta sama prati vreme poslednjeg pokreta i javlja "nema pokreta" tačno 5 sekundi kasnije:

```python
from gpiozero import MotionSensor

pir = MotionSensor(22)
MOTION_TIMEOUT = 5

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
```

Svaka detekcija pokreta upisuje i tačan trenutak (`last_motion_at`) u bazu.

**Senzor plamena (`rpi/all_sensors.py`):**

```python
from gpiozero import DigitalInputDevice

flame_sensor = DigitalInputDevice(6, pull_up=True)

def monitor_flame():
    while True:
        flame_sensor.wait_for_active()
        send_flame_status(True)
        flame_sensor.wait_for_inactive()
        send_flame_status(False)
```

Za razliku od PIR-a, plamen nema veštački timeout — prati hardver uživo, jer bi timeout mogao pogrešno da prikaže "nema plamena" dok vatra i dalje gori.

**RFID čitač sa auto-zaključavanjem (`rpi/all_sensors.py`):**

```python
from mfrc522 import SimpleMFRC522

rfid_reader = SimpleMFRC522()
RFID_UNLOCK_DURATION = 5

def monitor_rfid():
    while True:
        id, text = rfid_reader.read()
        tag_id = str(id)
        requests.put(RFID_API_URL, json={"tag_id": tag_id}, timeout=5)

        time.sleep(RFID_UNLOCK_DURATION)

        requests.put(RFID_API_URL, json={"access_granted": False}, timeout=5)
```

Server, po prijemu `tag_id`, upoređuje ga sa ovlašćenom karticom i određuje da li se vrata otključavaju:

```python
access_allowed = (update.tag_id == "454268117939")
device.access_granted = access_allowed
```

Svako očitavanje kartice se automatski upisuje u istoriju pristupa (`access_logs`), a svako novo očitavanje temperature/vlažnosti u istoriju senzora (`sensor_logs`).

FastAPI aplikacija se pokreće komandom:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

i izlaže podatke u JSON formatu na adresi:

```text
http://IP_ADRESA_RASPBERRY_PIJA:8000/devices/
```

Primer dobijenog JSON rezultata:

```json
{
  "env_sensor_1": { "type": "temperature_humidity", "temperature": 22.4, "humidity": 48.0 },
  "motion_sensor_1": { "type": "motion", "motion_detected": false, "last_motion_at": "2026-09-11 14:32:07" },
  "flame_sensor_1": { "type": "flame", "flame_detected": false },
  "rfid_reader_1": { "type": "rfid", "last_tag": "454268117939", "access_granted": true }
}
```

React veb aplikacija (`pametna-kuca-front`) povlači ove podatke sa `GET /devices/` na svake 3 sekunde i prikazuje ih korisniku na dashboard-u, uz live grafik temperature (izgrađen iz istog redovnog osvežavanja) i posebnu stranicu za istoriju (`GET /history/temperature/`, `GET /history/rfid/`).

---

Fakultet organizacionih nauka
Predmet: Internet inteligentnih uređaja
