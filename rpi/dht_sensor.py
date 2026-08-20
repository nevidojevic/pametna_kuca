import time
import requests
import adafruit_dht
import board

API_URL = "http://IP_ADRESA_SERVERA:8000/devices/env_sensor_1"

# Inicijalizacija senzora na GPIO pin 4 (ili odgovarajući pin)
dht_device = adafruit_dht.DHT11(board.D4)

while True:
    try:
        temperature = dht_device.temperature
        humidity = dht_device.humidity

        if temperature is not None and humidity is not None:
            payload = {"temperature": temperature, "humidity": humidity}
            requests.put(API_URL, json=payload)
            print(f"Poslata stvarna temperatura: {temperature}°C, Vlaga: {humidity}%")

    except RuntimeError as error:
        # Greške su česte kod DHT senzora, samo ih preskočimo i probamo ponovo
        print(f"Greška senzora: {error.args[0]}")
    except Exception as error:
        dht_device.exit()
        raise error

    time.sleep(5)