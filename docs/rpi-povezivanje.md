# Povezivanje Raspberry Pi senzora sa aplikacijom

## Dokumentacija zadatka

`RPi - Temperatura (1).doc` opisuje školski zadatak: DHT11 senzor na GPIO4
(pin `board.D4`), povezan preko breadboard-a, koji čita temperaturu i
vlažnost i ispisuje ih u terminal, uz opciono paljenje LED diode
(crvena/zelena) u zavisnosti od temperature. Taj kod radi samostalno na
RPi-ju — nema veze sa serverom, samo `print()` i `RPi.GPIO`.

Kod iz `temperatura.py` u dokumentu (referenca):

```python
import time
import adafruit_dht
import board
import RPi.GPIO as gpio

gpio.setmode(gpio.BCM)
gpio.setup(17, gpio.OUT)
gpio.setup(27, gpio.OUT)

dht_device = adafruit_dht.DHT11(board.D4)

while True:
    try:
        temperature_c = dht_device.temperature
        humidity = dht_device.humidity

        print("Temp:{:.1f} C /   Humidity: {}%".format(temperature_c, humidity))
        if temperature_c > 23:
            gpio.output(17, 1)
            gpio.output(27, 0)
        else:
            gpio.output(17, 0)
            gpio.output(27, 1)

    except RuntimeError as err:
        gpio.cleanup()
        print(err.args[0])

    time.sleep(2)
```

## Arhitektura projekta (već postoji)

```
RPi + DHT11 senzor  →  HTTP PUT  →  FastAPI backend (SQLite)  →  HTTP GET  →  React frontend
   (rpi/dht_sensor.py)              (backend/main.py)                        (Dashboard.jsx, poll na 3s)
```

RPi ne komunicira direktno sa frontendom — gura podatke na backend preko
`PUT`, a frontend ih povlači sa backenda preko `GET`. Kod je već napisan po
ovom patternu u [`rpi/dht_sensor.py`](../rpi/dht_sensor.py):

```python
API_URL = "http://IP_ADRESA_SERVERA:8000/devices/env_sensor_1"
...
requests.put(API_URL, json={"temperature": temperature, "humidity": humidity})
```

Backend u [`backend/main.py`](../backend/main.py) prima taj `PUT`, upisuje u
`devices` tabelu i u `sensor_logs` istoriju. Frontend u
[`pametna-kuca-front/src/components/Dashboard.jsx`](../pametna-kuca-front/src/components/Dashboard.jsx)
svaka 3 sekunde radi `GET /devices/` i renderuje karticu za
`temperature_humidity` tip. Kod se ne piše iznova — samo se pravilno
poveže/podesi.

## Koraci povezivanja

### 1. Ožičenje (fizički deo iz dokumenta)

DHT11 na GPIO4 (`board.D4`), napajanje i masa preko breadboard-a, kako je
prikazano na Slici 1 u dokumentu.

### 2. Priprema Raspberry Pi-ja

Preko SSH (Bitvise ili bilo koji SSH klijent):

```bash
sudo apt update
sudo apt-get install python3-pip
mkdir temp && cd temp
python3 -m venv --system-site-packages .
source bin/activate
pip install adafruit-circuitpython-dht requests
```

Bitno: pored `adafruit-circuitpython-dht` iz dokumenta, mora i `requests`,
jer skripta šalje HTTP pozive backendu.

### 3. Prebacite `dht_sensor.py` na RPi

Fajl već postoji u repou — [`rpi/dht_sensor.py`](../rpi/dht_sensor.py).
Prekopirajte ga na RPi (SFTP, `scp`, ili `git clone` na samom RPi-ju).

### 4. Podesite pravu IP adresu

Na liniji sa `API_URL` zamenite placeholder:

```python
API_URL = "http://IP_ADRESA_SERVERA:8000/devices/env_sensor_1"
```

`IP_ADRESA_SERVERA` je LAN IP adresa računara na kom radi FastAPI backend
(ne `127.0.0.1` — to bi značilo "sam RPi"). Na Windows računaru gde radi
backend, nađite je sa:

```bash
ipconfig
```

(tražite IPv4 Address, npr. `192.168.1.23`).

### 5. Pokrenite backend tako da bude dostupan sa mreže

Iz foldera `pametna_kuca`:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

`--host 0.0.0.0` je ključno — bez toga server sluša samo na `localhost` i
RPi ga ne vidi. Proverite i da Windows Firewall dozvoljava dolazne
konekcije na port 8000.

### 6. Pokrenite skriptu na RPi-ju

```bash
python dht_sensor.py
```

Trebalo bi da ispisuje `Poslata stvarna temperatura: X°C, Vlaga: Y%` na
svakih 5 sekundi.

### 7. Frontend

`Dashboard.jsx` koristi `API_URL = "http://127.0.0.1:8000"`. To radi samo
ako se frontend otvara u browseru na istom računaru gde radi backend. Ako
se frontend gleda sa drugog uređaja (telefon, drugi laptop), promeniti i tu
na istu LAN IP adresu backenda.

### 8. Provera da sve radi

Sa bilo kog računara na mreži:

```bash
curl http://192.168.1.23:8000/devices/
```

Trebalo bi da se vidi `env_sensor_1` sa temperaturom/vlažnošću koje šalje
RPi, a ne default vrednosti (22.0/45.0) iz `backend/main.py`.

## Napomena

Isti pattern važi i za pokret (`rpi/motion_sensor.py`) i za NFC/kameru —
sve ide na isti backend preko `PUT /devices/{id}`, pa kad ovo proradi za
temperaturu, ostali senzori se povezuju identično (samo im treba promeniti
isti `IP_ADRESA_SERVERA` placeholder).
