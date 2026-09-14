# pametna_kuca

# 🏠 Pametna Kuća – IoT sistem za nadzor i upravljanje domom

## Opis projekta

Pametna Kuća predstavlja IoT sistem za nadzor stanja u domu korišćenjem Raspberry Pi mikroračunara.

Sistem prikuplja podatke sa više senzora (temperatura, vlažnost, pokret, RFID kartica) i šalje ih na centralni FastAPI server koji ih čuva u SQLite bazi. Podaci su dostupni preko REST API-ja u JSON formatu i prikazuju se uživo na React web dashboard-u, uključujući live grafik temperature/vlažnosti.

---

## Funkcionalnosti

- Očitavanje temperature i vlažnosti vazduha (DHT11)
- Detekcija pokreta u prostoriji (PIR senzor)
- Detekcija plamena (senzor plamena)
- Kontrola pristupa ulaznim vratima putem RFID kartice (automatsko zaključavanje posle 5s)
- Beleženje tačnog vremena poslednjeg registrovanog pokreta
- Automatsko čuvanje istorije temperature/vlažnosti i pristupa u bazi
- Live grafik temperature i vlažnosti na dashboard-u
- Registracija i prijava korisnika
- Prikaz stanja svih uređaja uživo na web dashboard-u (osvežavanje na 3s)

---

## Korišćene komponente

| Komponenta | Opis | Količina |
|------------|------|-----------|
| Raspberry Pi | 3/4 Model B | 1 |
| DHT11 | Senzor temperature i vlažnosti | 1 |
| PIR senzor pokreta | Detekcija kretanja u prostoriji | 1 |
| Senzor plamena | Detekcija plamena (digitalni izlaz) | 1 |
| RFID čitač MFRC522 | Kontrola pristupa (13.56 MHz, Mifare kartice) | 1 |
| RFID kartica/privezak | Za prislanjanje na čitač | 1+ |
| Proto ploča | Za povezivanje elektronskih elemenata | 1 |
| Kablovi | Muško-Ženski | 5+ |
| Kablovi | Muško-Muški | 3+ |

---

## Arhitektura sistema

```
DHT11 senzor   PIR senzor   Senzor plamena   RFID čitač (MFRC522)
      │             │              │                  │
      └──────┬──────┘              │                  │
             ▼                     ▼                  ▼
       Raspberry Pi (jedna skripta: rpi/all_sensors.py)
                              │
                     HTTP PUT (JSON) preko LAN/WiFi
                              ▼
                 FastAPI backend (SQLite baza)
                              │
              HTTP GET (JSON, trenutno stanje i istorija)
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

### Senzor plamena

| Pin senzora | Raspberry Pi |
|------------|--------------|
| DO | GPIO6 |
| VCC | 5V |
| GND | GND |

---

## Prikaz uređaja i njihovih stanja

| Uređaj (id) | Tip | Prikazano stanje |
|-------------|-----|-------------------|
| `env_sensor_1` | `temperature_humidity` | Temperatura (°C) i vlažnost (%) + live grafik |
| `motion_sensor_1` | `motion` | "Sve mirno 🟢" / "Detektovan pokret 🚨" + tačno vreme poslednjeg pokreta |
| `flame_sensor_1` | `flame` | "Nema plamena 🟢" / "OPASNOST - DETEKTOVAN PLAMEN 🚨" |
| `rfid_reader_1` | `rfid` | "Otključano 🔓" / "Zaključano 🔒" + poslednji očitani tag |

---

## Logika sistema

### Kontrola pristupa (RFID)

Kada RFID čitač pošalje `tag_id` backendu, server upoređuje ga sa ovlašćenom karticom:

```python
access_allowed = (update.tag_id == "454268117939")
```

Rezultat (`access_granted`) se upisuje na uređaj i u `access_logs` istoriju, tako da se svako prislanjanje kartice može naknadno proveriti kroz `GET /history/rfid/`. Vrata se automatski "zaključavaju" (`access_granted: false`) 5 sekundi nakon uspešnog očitavanja.

### Istorija temperature i vlažnosti

Svaki put kad DHT11 pošalje nove vrednosti, backend ih upisuje i u trenutno stanje uređaja i u `sensor_logs` tabelu, tako da `GET /history/temperature/` može da vrati podatke za poslednjih 7 dana. Dashboard dodatno iscrtava live grafik poslednjih očitavanja (bez pozivanja `/history/` endpointa — gradi se iz redovnog osvežavanja na 3s).

### Pokret

PIR senzor javlja početak/kraj pokreta (`motion_detected: true/false`) i pri svakoj detekciji upisuje tačan trenutak (`last_motion_at`) koji se prikazuje na dashboard-u.

---

## Raspberry Pi aplikacija

Raspberry Pi ne prima podatke od servera — on ih **šalje**. Sve skripte za senzore su objedinjene u **jednu skriptu**, [`rpi/all_sensors.py`](rpi/all_sensors.py), koja pokreće svaki senzor u svom `threading` nitu i šalje HTTP `PUT` zahtev ka odgovarajućem uređaju:

| Senzor | GPIO | Endpoint |
|--------|------|----------|
| DHT11 (temperatura/vlažnost) | GPIO17 | `/devices/env_sensor_1` |
| PIR (pokret) | GPIO22 | `/devices/motion_sensor_1` |
| Senzor plamena | GPIO6 | `/devices/flame_sensor_1` |
| RFID čitač (MFRC522, SPI) | RST na GPIO25 | `/devices/rfid_reader_1` |

`rpi/simulator.py` ostaje odvojeno — simulira sve senzore bez hardvera, za testiranje.

Backend u skripti gleda `127.0.0.1` jer radi na istom RPi-ju kao i senzori (detaljno opisano u [docs/rpi-povezivanje.md](docs/rpi-povezivanje.md)). Za korak-po-korak uputstvo za pokretanje celog sistema, videti [docs/pokretanje.md](docs/pokretanje.md).

---

## Pokretanje projekta

> Kratak pregled ispod; za detaljno korak-po-korak uputstvo (uključujući poznate probleme i njihova rešenja) videti [docs/pokretanje.md](docs/pokretanje.md).

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

### Raspberry Pi

```bash
python3 -m venv --system-site-packages venv
source venv/bin/activate
pip install adafruit-circuitpython-dht requests gpiozero mfrc522 RPi.GPIO

python rpi/all_sensors.py
```

---

## REST API

### `GET /devices/`

Vraća stanje svih uređaja.

```json
{
  "env_sensor_1": { "type": "temperature_humidity", "temperature": 22.4, "humidity": 48.0 },
  "motion_sensor_1": { "type": "motion", "motion_detected": false, "last_motion_at": "2026-09-11 14:32:07" },
  "flame_sensor_1": { "type": "flame", "flame_detected": false },
  "rfid_reader_1": { "type": "rfid", "last_tag": "454268117939", "access_granted": true }
}
```

### `PUT /devices/{device_id}`

Ažurira podatke jednog uređaja (koristi ga Raspberry Pi da pošalje očitanja senzora).

| Polje | Tip | Opis |
|-------|-----|------|
| `temperature` | float | Temperatura (°C) |
| `humidity` | float | Vlažnost vazduha (%) |
| `motion_detected` | bool | Da li je detektovan pokret |
| `flame_detected` | bool | Da li je detektovan plamen |
| `tag_id` | string | ID očitane RFID kartice |
| `access_granted` | bool | Direktan upis pristupa (koristi se za auto-zaključavanje) |

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
│   ├── all_sensors.py    # Sve skripte za senzore u jednom fajlu (DHT11, PIR, plamen, RFID)
│   └── simulator.py      # Simulacija svih senzora bez hardvera
│
├── pametna-kuca-front/
│   └── src/
│       ├── components/
│       │   ├── Dashboard.jsx   # Prikaz uređaja uživo
│       │   ├── History.jsx     # Istorija temperature/vlažnosti i RFID pristupa
│       │   ├── Login.jsx
│       │   └── Register.jsx
│       └── App.jsx
│
├── docs/
│   ├── pokretanje.md        # Korak-po-korak uputstvo za pokretanje sistema
│   ├── rpi-povezivanje.md   # Arhitektura: kako i zašto su RPi/backend/front povezani
│   └── izvestaj-projekta.md # Formalni izveštaj za predaju
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
