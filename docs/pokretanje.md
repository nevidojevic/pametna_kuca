# Uputstvo za pokretanje

Sistem ima tri dela koja rade na dva različita uređaja:

- **Raspberry Pi** — backend (FastAPI + SQLite) i skripta sa svim senzorima (`rpi/all_sensors.py`), oba na istom uređaju
- **Računar** (bilo koji, ne mora biti isti kao za backend) — front (React/Vite), otvara se u browseru

## Preduslovi (rade se samo jednom, ne svaki put)

### Na Raspberry Pi-ju

```bash
git clone https://github.com/nevidojevic/pametna_kuca.git
cd pametna_kuca
python3 -m venv --system-site-packages venv
source venv/bin/activate
pip install -r requirements.txt
pip install adafruit-circuitpython-dht requests gpiozero mfrc522 RPi.GPIO
```

Fizičko povezivanje senzora — videti tabelu pinova u [README.md](../README.md#povezivanje-senzora).

### Na računaru za front

Potreban je Node.js 20+ (LTS 22 preporučeno). Ako nema admin prava za instalaciju, koristiti portable .zip verziju sa nodejs.org (raspakovati i dodati na PATH za tu sesiju terminala).

```bash
git clone https://github.com/nevidojevic/pametna_kuca.git
cd pametna_kuca/pametna-kuca-front
npm install
```

---

## Svaki put kad se sistem pokreće

### 1. Raspberry Pi — Terminal A (backend)

```bash
cd pametna_kuca
git pull
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Sačekati `Application startup complete.` Ovaj terminal ostaje otvoren tokom celog rada — u njemu se ništa dalje ne kuca.

### 2. Raspberry Pi — Terminal B (senzori)

Novi SSH/terminal, pored onog iz koraka 1:

```bash
cd pametna_kuca
source venv/bin/activate
python rpi/all_sensors.py
```

Treba da počne da ispisuje očitavanja DHT11 senzora na svakih 5 sekundi (`DHT11 -> Temperatura: ... (HTTP 200)`).

### 3. Proveriti IP adresu RPi-ja

```bash
hostname -I
```

Ako se razlikuje od one upisane u `pametna-kuca-front/src/config.js` (trenutno `172.20.222.234`), ažurirati je tamo — RPi dobija IP preko DHCP-a i ume da se promeni između pokretanja.

### 4. Računar sa frontom

```bash
git pull
cd pametna-kuca-front
npm install
npm run dev
```

(`npm install` je potreban samo ako se `package.json`/`package-lock.json` promenio od prošlog puta — inače se može preskočiti.)

Otvoriti link koji Vite ispiše u terminalu (obično `http://localhost:5173`).

### 5. Provera da sve radi

- Registracija i prijava rade
- Dashboard prikazuje temperaturu/vlažnost koje se menjaju na svakih par sekundi, sa live grafikom
- Mahnuti ispred PIR senzora → red "Pokret" postane crven i piše "Detektovan", posle ~5s bez pokreta vraća se na "Mirno"
- Prisloniti RFID karticu → red "Ulazna vrata" postane zelen i piše "Otključano", posle 5s se sam vrati na "Zaključano"
- Ako se plamen simulira/detektuje → ceo red postaje crven, "Opasnost — proveriti odmah"
- Dugme **Istorija** prikazuje tabele prošlih očitavanja temperature i RFID pristupa

---

## Poznati problemi

### "Connection refused" u terminalu senzora

Backend (Terminal A) nije pokrenut, ili je pao, ili ne sluša na `--host 0.0.0.0`. Proveriti da Terminal A i dalje pokazuje `Application startup complete.` bez grešaka.

### PIR i/ili senzor plamena prestanu da javljaju promene posle nekog vremena rada

Poznat, još nerešen problem — verovatno konflikt između `RPi.GPIO` (koristi ga RFID biblioteka) i `gpiozero`/`lgpio` (koriste ih PIR i plamen) kad rade dugo u istom procesu na Raspberry Pi 5. Trenutna zaštita (try/except oko svake petlje) sprečava da to obori ceo program, ali ne rešava koren problema.

**Privremeno rešenje:** ugasiti (Ctrl+C) i ponovo pokrenuti `python rpi/all_sensors.py` (Terminal B). Backend (Terminal A) ne treba dirati.

### RFID čita karticu samo prvih par sekundi po pokretanju, posle toga ništa

Isti koren problema kao gore. Restart `all_sensors.py` privremeno pomaže. **Ne** praviti novu `SimpleMFRC522()` instancu pri svakom čitanju — to je probano i pokvarilo je čitanje potpuno (SPI uređaj ostaje zauzet od prethodne instance).

### Front ne može da se poveže sa serverom (CORS/NetworkError u konzoli)

Skoro uvek znači da `API_URL` u `pametna-kuca-front/src/config.js` gleda pogrešnu/staru IP adresu. Proveriti trenutnu IP adresu RPi-ja (`hostname -I`) i uskladiti.

### Node greška `styleText` pri `npm run dev`

Node.js je prestar (< 20). Ažurirati Node ili koristiti portable .zip verziju — videti [README.md](../README.md).
