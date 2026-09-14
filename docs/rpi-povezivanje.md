# Arhitektura: Raspberry Pi ↔ backend ↔ frontend

> Za korak-po-korak uputstvo za svakodnevno pokretanje, videti [docs/pokretanje.md](pokretanje.md). Ovaj dokument objašnjava **kako i zašto** je sistem povezan kako je povezan.

## Poreklo zadatka

`RPi - Temperatura (1).doc` opisuje originalni školski zadatak: DHT11 senzor na
GPIO4, koji čita temperaturu i vlažnost i ispisuje ih u terminal, uz opciono
paljenje LED diode u zavisnosti od temperature. Taj kod radi samostalno na
RPi-ju — nema veze sa serverom, samo `print()` i `RPi.GPIO`. Projekat je tu
ideju proširio: umesto ispisa u terminal i lokalnih LED dioda, RPi šalje
očitanja na centralni server, a stanje svih senzora se prikazuje na veb
dashboard-u koji se može gledati sa bilo kog uređaja na mreži.

## Trenutna arhitektura

```
DHT11 + PIR + plamen + RFID  →  rpi/all_sensors.py  →  HTTP PUT  →  FastAPI backend (SQLite)
                                  (na Raspberry Pi-ju)                (isti Raspberry Pi)
                                                                            │
                                                                     HTTP GET (poll na 3s)
                                                                            ▼
                                                              React frontend (drugi uređaj, browser)
```

**Backend i svi senzori rade na istom Raspberry Pi-ju.** To je promena u odnosu
na raniju verziju gde je backend bio na posebnom računaru — sad RPi skripte
gledaju `127.0.0.1` umesto LAN IP adrese, jer je server "on sam". Jedino front
(browser) mora da zna IP adresu RPi-ja, pošto se obično gleda sa drugog
uređaja.

RPi ne prima ništa od servera — samo šalje (`PUT /devices/{id}`). Frontend je
jedini koji čita (`GET /devices/`, `GET /history/...`).

## Zašto jedna skripta, ne četiri

Sve četiri stvari koje RPi radi (DHT11, PIR, plamen, RFID) su objedinjene u
[`rpi/all_sensors.py`](../rpi/all_sensors.py), svaka u svom `threading` nitu:

- DHT11 čita na svakih 5s
- PIR i plamen koriste blokirajuće `gpiozero` pozive (`wait_for_active`,
  `is_active`) — bez odvojenih niti, PIR bi zaustavio čitanje DHT11 senzora
  dok čeka pokret
- RFID koristi blokirajući `reader.read()` iz `mfrc522` biblioteke

Svaka nit ima svoj `try/except` oko petlje — ako jedna niti naiđe na grešku,
ostale nastavljaju da rade nesmetano (npr. ako RFID modul zapne, temperatura
se i dalje ažurira).

## Logika po senzoru

### PIR (pokret) — softverski timeout

PIR moduli imaju sopstveno hardversko "hold" vreme (koliko dugo signal ostaje
aktivan posle poslednjeg pokreta), koje je često duže i nepredvidivo. Umesto
da se na to oslanja, skripta prati vreme poslednjeg aktivnog očitavanja i sama
javlja "nema pokreta" tačno 5 sekundi (`MOTION_TIMEOUT`) nakon poslednjeg
pokreta, nezavisno od hardvera. Svaki put kad se pokret detektuje, backend
upisuje i tačan trenutak (`last_motion_at`).

### Senzor plamena — bez veštačkog timeouta

Za razliku od PIR-a, plamen se prati uživo bez timeouta — `flame_detected`
prati stanje hardvera direktno i vraća se na `false` čim senzor to javi. Ovo
je namerno: veštački timeout bi mogao da prikaže "nema plamena" dok vatra i
dalje gori.

### RFID — 5s auto-zaključavanje

Kad se kartica pročita, backend upoređuje ID sa ovlašćenom karticom
(trenutno `454268117939`, upisano direktno u `backend/main.py`). Rezultat se
upisuje u `access_logs` istoriju. Pet sekundi nakon očitavanja, skripta sama
šalje `{"access_granted": false}` da "zaključa" vrata na dashboard-u, bez
čekanja na novu karticu.

## Pinovi

| Senzor | Pin | Raspberry Pi (BCM) |
|--------|-----|---------------------|
| DHT11 | DATA | GPIO17 |
| PIR | OUT | GPIO22 |
| Senzor plamena | DO | GPIO6 |
| RFID MFRC522 | SDA (SS) | GPIO8 |
| RFID MFRC522 | SCK | GPIO11 |
| RFID MFRC522 | MOSI | GPIO10 |
| RFID MFRC522 | MISO | GPIO9 |
| RFID MFRC522 | RST | GPIO25 |

RST pin je hardkodiran unutar `mfrc522` biblioteke (ne podešava se u našem
kodu) — GPIO25 je vrednost koju ta konkretna biblioteka očekuje.

## Poznat, nerešen problem

PIR, plamen i RFID ponekad prestanu da javljaju promene posle nekog vremena
rada (dok DHT11 nastavlja normalno). Sumnja je da `RPi.GPIO` (koristi ga
RFID biblioteka) i `gpiozero`/`lgpio` (koriste ih PIR i plamen) dolaze u
konflikt kad rade zajedno duže vreme na Raspberry Pi 5. Detalji i privremeno
rešenje (restart skripte) u [docs/pokretanje.md](pokretanje.md#poznati-problemi).
