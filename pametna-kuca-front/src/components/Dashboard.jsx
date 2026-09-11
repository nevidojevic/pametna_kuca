import React, { useState, useEffect } from 'react';

function Dashboard({ onLogout }) {
  const [devices, setDevices] = useState({});
  const API_URL = "http://127.0.0.1:8000";

  const fetchDevices = async () => {
    try {
      console.log("Pokušavam da preuzmem uređaje...");
      const response = await fetch(`${API_URL}/devices/`);
      const data = await response.json();
      console.log("Uspešno preuzeti podaci:", data);
      setDevices(data);
    } catch (error) {
      console.error("Greška pri učitavanju uređaja:", error);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Kontrolni Panel - Pametna Kuća</h2>
        <button onClick={onLogout} style={{ padding: '5px 10px', cursor: 'pointer' }}>Odjavi se</button>
      </div>
      <hr style={{ margin: '15px 0' }} />

      <div>
        {Object.keys(devices).length === 0 ? (
          <p>Učitavanje uređaja sa servera...</p>
        ) : (
          Object.entries(devices).map(([id, info]) => (
            <div key={id} style={{ border: '1px solid #ddd', padding: '15px', margin: '12px 0', borderRadius: '8px', background: '#fff' }}>
              <h3>{id} ({info.type})</h3>

              {/* 1. Temperatura i vlažnost */}
              {info.type === 'temperature_humidity' && (
                <div>
                  <p>🌡️ Temperatura: <strong>{info.temperature}°C</strong></p>
                  <p>💧 Vlažnost: <strong>{info.humidity}%</strong></p>
                </div>
              )}

              {/* 2. Senzor pokreta */}
              {info.type === 'motion' && (
                <div>
                  <p>🏃 Status pokreta: <span style={{ color: info.motion_detected ? 'red' : 'green' }}>
                    {info.motion_detected ? "DETEKTOVAN POKRET 🚨" : "Sve mirno 🟢"}
                  </span></p>
                </div>
              )}

              {/* 3. RFID čitač (Ulazna vrata) */}
              {info.type === 'rfid' && (
                <div>
                  <p>🚪 Ulazna vrata: <strong style={{ color: info.access_granted ? 'green' : 'red' }}>
                    {info.access_granted ? "OTKLJUČANO 🔓" : "ZAKLJUČANO 🔒"}
                  </strong></p>
                  <p style={{ fontSize: '13px', color: '#666' }}>Poslednji tag: {info.last_tag || "Nema očitavanja"}</p>
                </div>
              )}

              {/* 4. Kamera */}
              {info.type === 'camera' && (
                <div>
                  <p>📷 Status kamere: <strong>{info.status}</strong></p>
                  {info.last_snapshot && (
                    <p style={{ fontSize: '13px' }}>Poslednji snimak: {info.last_snapshot}</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Dashboard;