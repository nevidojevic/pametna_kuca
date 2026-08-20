import tkinter as tk
from tkinter import messagebox
import requests

API_URL = "http://127.0.0.1:8000"


class SmartHomeGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Pametna Kuća - Kontrolni Panel")
        self.root.geometry("750x550")
        self.root.config(bg="#f0f2f5")

        # Naslov
        title_label = tk.Label(root, text="Sistem za Upravljanje Pametnom Kućom", font=("Arial", 16, "bold"),
                               bg="#f0f2f5", fg="#333333")
        title_label.pack(pady=15)

        # Okvir za prikaz uređaja/senzora
        self.frame_devices = tk.Frame(root, bg="#f0f2f5")
        self.frame_devices.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        # Donji panel sa dugmadima
        btn_frame = tk.Frame(root, bg="#f0f2f5")
        btn_frame.pack(pady=15)

        btn_refresh = tk.Button(btn_frame, text="Osveži podatke", command=self.load_devices, bg="#4CAF50", fg="white",
                                font=("Arial", 10, "bold"), padx=10, pady=5)
        btn_refresh.pack(side=tk.LEFT, padx=10)

        # Inicijalno učitavanje uređaja
        self.load_devices()

        # Automatsko osvežavanje na svakih 3 sekunde
        self.auto_refresh()

    def load_devices(self):
        # Brisanje prethodnih widgeta
        for widget in self.frame_devices.winfo_children():
            widget.destroy()

        try:
            response = requests.get(f"{API_URL}/devices/")
            if response.status_code == 200:
                devices_data = response.json()
                for dev_id, dev_info in devices_data.items():
                    self.create_device_card(dev_id, dev_info)
            else:
                messagebox.showerror("Greška", "Ne mogu da učitam podatke sa servera.")
        except requests.exceptions.ConnectionError:
            # Ako server nije dostupan, ne prekidamo rad, samo ispisujemo status na GUI-ju
            lbl_error = tk.Label(self.frame_devices, text="⚠️ Greška: Nije moguće povezati se sa FastAPI serverom!",
                                 fg="red", bg="#f0f2f5", font=("Arial", 11, "bold"))
            lbl_error.pack(pady=20)

    def create_device_card(def_self, dev_id, dev_info):
        card = tk.Frame(def_self.frame_devices, relief=tk.RAISED, borderwidth=1, bg="white", padx=10, pady=8)
        card.pack(fill=tk.X, pady=5)

        dev_type = dev_info.get("type", "unknown")

        # Dinamičko kreiranje teksta zavisno od tipa hardvera
        text_info = f"Uređaj ID: {dev_id}  |  Tip: {dev_type.upper()}\n"

        if dev_type == "temperature_humidity":
            text_info += f"🌡️ Temperatura: {dev_info.get('temperature')}°C   |   💧 Vlažnost: {dev_info.get('humidity')}%"
        elif dev_type == "motion":
            motion = "DA 🚨" if dev_info.get('motion_detected') else "NE 🟢"
            text_info += f"🏃 Detektovan pokret: {motion}"
        elif dev_type == "nfc":
            access = "DOZVOLJEN ✅" if dev_info.get('access_granted') else "ODBIJEN ❌"
            text_info += f"🔑 Poslednji Tag: {dev_info.get('last_tag')} | Pristup: {access}"
        elif dev_type == "camera":
            text_info += f"📷 Status: {dev_info.get('status')} | Slika: {dev_info.get('last_snapshot')}"
        else:
            text_info += f"Stanje: {dev_info}"

        lbl = tk.Label(card, text=text_info, anchor="w", justify=tk.LEFT, bg="white", font=("Arial", 10))
        lbl.pack(side=tk.LEFT, fill=tk.X, expand=True)

    def auto_refresh(self):
        # Poziva metodu za učitavanje svakih 3000 ms (3 sekunde)
        self.load_devices()
        self.root.after(3000, self.auto_refresh)


if __name__ == "__main__":
    root = tk.Tk()
    app = SmartHomeGUI(root)
    root.mainloop()