# pametna_kuca

# 🏠 Pametna Kuća – IoT sistem za nadzor i upravljanje domom

## Opis projekta

Pametna Kuća predstavlja IoT sistem za nadzor stanja u domu korišćenjem Raspberry Pi mikroračunara.

Sistem prikuplja podatke sa više senzora (temperatura, vlažnost, pokret, RFID kartica, kamera) i šalje ih na centralni FastAPI server koji ih čuva u SQLite bazi. Podaci su dostupni preko REST API-ja u JSON formatu i prikazuju se uživo na React web dashboard-u.

---

## Funkcionalnosti

- Očitavanje temperature i vlažnosti vazduha (DHT11)
- Detekcija pokreta u prostoriji (PIR senzor)
- Kontrola pristupa ulaznim vratima putem RFID kartice
- Snimanje fotografije pri detekciji pokreta (kamera)
- Automatsko čuvanje istorije temperature/vlažnosti i pristupa u bazi
- Registracija i prijava korisnika
- Prikaz stanja svih uređaja uživo na web dashboard-u (osvežavanje na 3s)

---

## Korišćene komponente

| Komponenta | Opis | Količina |
|------------|------|-----------|
| Raspberry Pi | 3/4 Model B | 1 |
| DHT11 | Senzor temperature i vlažnosti | 1 |
| PIR senzor pokreta | Detekcija kretanja u prostoriji | 1 |
| RFID čitač MFRC522 | Kontrola pristupa (13.56 MHz, Mifare kartice) | 1 |
| RFID kartica/privezak | Za prislanjanje na čitač | 1+ |
| Kamera (USB ili Pi Camera) | Snimanje fotografije pri pokretu | 1 |
| Proto ploča | Za povezivanje elektronskih elemenata | 1 |
| Kablovi | Muško-Ženski | 5+ |
| Kablovi | Muško-Muški | 3+ |

---

## Arhitektura sistema

```
DHT11 senzor     PIR senzor     RFID čitač (MFRC522)     Kamera
      │               │                  │                  │
      └───────┬───────┘                  │                  │
              ▼                          ▼                  ▼
        Raspberry Pi (Python skripte: dht_sensor.py, rfid_reader.py, camera_module.py)
                              │
                     HTTP PUT (JSON) preko LAN/WiFi
                              ▼
                 FastAPI backend (SQLite baza)
                              │
                     HTTP GET (JSON, poll na 3s)
                              ▼
                  React web dashboard (frontend)
```

RPi ne komunicira direktno sa frontendom — svaka skripta gura svoje podatke na backend preko `PUT /devices/{id}`, a frontend ih povlači sa backenda preko `GET /devices/`.

---

## Povezivanje senzora

### DHT11 (temperatura i vlažnost)

| Pin senzora | Raspberry Pi |
|------------|--------------|
| DATA | GPIO17 |
| VCC | 3.3V |
| GND | GND |

### PIR senzor pokreta

| Pin senzora | Raspberry Pi |
|------------|--------------|
| OUT | GPIO22 |
| VCC | 5V |
| GND | GND |

### RFID čitač (MFRC522, SPI)

| Pin čitača | Raspberry Pi |
|------------|--------------|
| SDA (SS) | GPIO8 (CE0) |
| SCK | GPIO11 |
| MOSI | GPIO10 |
| MISO | GPIO9 |
| RST | GPIO25 |
| 3.3V | 3.3V |
| GND | GND |

### Kamera

USB kamera preko USB porta, ili Pi Camera modul preko CSI konektora.

---

## Prikaz uređaja i njihovih stanja

| Uređaj (id) | Tip | Prikazano stanje |
|-------------|-----|-------------------|
| `env_sensor_1` | `temperature_humidity` | Temperatura (°C) i vlažnost (%) |
| `motion_sensor_1` | `motion` | "Sve mirno 🟢" / "Detektovan pokret 🚨" |
| `rfid_reader_1` | `rfid` | "Otključano 🔓" / "Zaključano 🔒" + poslednji očitani tag |
| `camera_1` | `camera` | `IDLE` / `RECORDING` / `MOTION_SNAPSHOT` + putanja poslednjeg snimka |

---

## Logika sistema

### Kontrola pristupa (RFID)

Kada RFID čitač pošalje `tag_id` backendu, server upoređuje ga sa ovlašćenom karticom:

```python
access_allowed = (update.tag_id == "ADMIN_CARD_123")
```

Rezultat (`access_granted`) se upisuje na uređaj i u `access_logs` istoriju, tako da se svako prislanjanje kartice može naknadno proveriti kroz `GET /history/rfid/`.

### Istorija temperature i vlažnosti

Svaki put kad DHT11 pošalje nove vrednosti, backend ih upisuje i u trenutno stanje uređaja i u `sensor_logs` tabelu, tako da `GET /history/temperature/` može da vrati podatke za poslednjih 7 dana.

### Pokret i kamera

PIR senzor javlja početak/kraj pokreta (`motion_detected: true/false`). Kamera može da se pozove pri detekciji pokreta (`camera_module.py`) i sačuva snimak, a status se prikazuje na dashboard-u.

---

## Raspberry Pi aplikacije

Raspberry Pi ne prima podatke od servera — on ih **šalje**. Svaka skripta iz `rpi/` foldera je zadužena za jedan ili više senzora i šalje HTTP `PUT` zahtev ka odgovarajućem uređaju:

| Skripta | Senzor(i) | Endpoint |
|---------|-----------|----------|
| `rpi/dht_sensor.py` | DHT11 + PIR (paralelno, preko `threading`) | `/devices/env_sensor_1`, `/devices/motion_sensor_1` |
| `rpi/rfid_reader.py` | RFID čitač (MFRC522) | `/devices/rfid_reader_1` |
| `rpi/camera_module.py` | Kamera | `/devices/camera_1` |
| `rpi/simulator.py` | Simulacija svih senzora (bez hardvera, za testiranje) | svi navedeni |

Pre pokretanja bilo koje skripte na pravom RPi-ju, potrebno je zameniti `IP_ADRESA_SERVERA` u fajlu stvarnom LAN IP adresom računara na kom radi backend (detaljno opisano u [docs/rpi-povezivanje.md](docs/rpi-povezivanje.md)).

---

## Pokretanje projekta

### Backend (FastAPI)

```bash
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (React)

```bash
cd pametna-kuca-front
npm install
npm run dev
```

### Raspberry Pi (svaka skripta u svom virtuelnom okruženju)

```bash
python3 -m venv --system-site-packages .
source bin/activate
pip install adafruit-circuitpython-dht requests gpiozero mfrc522 RPi.GPIO opencv-python

python dht_sensor.py      # DHT11 + PIR
python rfid_reader.py     # RFID čitač
python camera_module.py   # Kamera (poziva se npr. po detekciji pokreta)
```

---

## REST API

### `GET /devices/`

Vraća stanje svih uređaja.

```json
{
  "env_sensor_1": { "type": "temperature_humidity", "temperature": 22.4, "humidity": 48.0 },
  "motion_sensor_1": { "type": "motion", "motion_detected": false },
  "rfid_reader_1": { "type": "rfid", "last_tag": "123456789", "access_granted": true },
  "camera_1": { "type": "camera", "status": "IDLE", "last_snapshot": null }
}
```

### `PUT /devices/{device_id}`

Ažurira podatke jednog uređaja (koristi ga Raspberry Pi da pošalje očitanja senzora).

| Polje | Tip | Opis |
|-------|-----|------|
| `temperature` | float | Temperatura (°C) |
| `humidity` | float | Vlažnost vazduha (%) |
| `motion_detected` | bool | Da li je detektovan pokret |
| `tag_id` | string | ID očitane RFID kartice |
| `camera_status` | string | Status kamere |
| `snapshot_url` | string | Putanja poslednjeg snimka |

### `GET /history/temperature/`

Istorija temperature i vlažnosti za poslednjih 7 dana.

### `GET /history/rfid/`

Istorija RFID pristupa (koja kartica, da li je pristup dozvoljen, kada) za poslednjih 7 dana.

### `POST /users/` i `POST /login/`

Registracija i prijava korisnika aplikacije.

---

## Struktura projekta

```
pametna_kuca/
│
├── backend/
│   ├── main.py          # FastAPI aplikacija i endpoint-i
│   ├── models.py        # SQLAlchemy modeli (User, Device, SensorLog, AccessLog)
│   └── database.py      # Konekcija ka SQLite bazi
│
├── rpi/
│   ├── dht_sensor.py     # DHT11 + PIR (temperatura, vlažnost, pokret)
│   ├── rfid_reader.py    # RFID čitač (MFRC522)
│   ├── camera_module.py  # Kamera
│   ├── motion_sensor.py  # Samostalna PIR skripta (alternativa dht_sensor.py)
│   └── simulator.py      # Simulacija svih senzora bez hardvera
│
├── pametna-kuca-front/
│   └── src/
│       ├── components/
│       │   ├── Dashboard.jsx   # Prikaz uređaja uživo
│       │   ├── Login.jsx
│       │   └── Register.jsx
│       └── App.jsx
│
├── docs/
│   └── rpi-povezivanje.md   # Detaljno uputstvo za povezivanje RPi-ja sa backendom
│
├── requirements.txt
└── README.md
```

---

## Autori

| Ime prezime | Broj indeksa |
|-------------|--------------|
| _(popuniti)_ | _(popuniti)_ |
| _(popuniti)_ | _(popuniti)_ |

Fakultet organizacionih nauka
Predmet: Internet inteligentnih uređaja
