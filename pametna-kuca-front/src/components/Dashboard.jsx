import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_URL } from '../config';

const MAX_CHART_POINTS = 20;

function Dashboard({ onLogout, onShowHistory }) {
  const [devices, setDevices] = useState({});
  const [chartData, setChartData] = useState([]);

  const fetchDevices = async () => {
    try {
      const response = await fetch(`${API_URL}/devices/`);
      const data = await response.json();
      setDevices(data);

      const env = data.env_sensor_1;
      if (env && env.temperature != null) {
        const point = {
          time: new Date().toLocaleTimeString(),
          temperature: env.temperature,
          humidity: env.humidity
        };
        setChartData((prev) => [...prev, point].slice(-MAX_CHART_POINTS));
      }
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
        <div>
          <button onClick={onShowHistory} style={{ padding: '5px 10px', cursor: 'pointer', marginRight: '8px' }}>Istorija</button>
          <button onClick={onLogout} style={{ padding: '5px 10px', cursor: 'pointer' }}>Odjavi se</button>
        </div>
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

                  {chartData.length > 1 && (
                    <div style={{ width: '100%', height: 200, marginTop: '10px' }}>
                      <ResponsiveContainer>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="temperature" stroke="#e74c3c" name="Temperatura (°C)" dot={false} isAnimationActive={false} />
                          <Line type="monotone" dataKey="humidity" stroke="#3498db" name="Vlažnost (%)" dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Senzor pokreta */}
              {info.type === 'motion' && (
                <div>
                  <p>🏃 Status pokreta: <span style={{ color: info.motion_detected ? 'red' : 'green' }}>
                    {info.motion_detected ? "DETEKTOVAN POKRET 🚨" : "Sve mirno 🟢"}
                  </span></p>
                  <p style={{ fontSize: '13px', color: '#666' }}>
                    Poslednji pokret: {info.last_motion_at || "Nema zabeleženih pokreta"}
                  </p>
                </div>
              )}

              {/* 3. Senzor plamena */}
              {info.type === 'flame' && (
                <div>
                  <p>🔥 Status: <strong style={{ color: info.flame_detected ? 'red' : 'green' }}>
                    {info.flame_detected ? "OPASNOST - DETEKTOVAN PLAMEN 🚨" : "Nema plamena 🟢"}
                  </strong></p>
                </div>
              )}

              {/* 4. RFID čitač (Ulazna vrata) */}
              {info.type === 'rfid' && (
                <div>
                  <p>🚪 Ulazna vrata: <strong style={{ color: info.access_granted ? 'green' : 'red' }}>
                    {info.access_granted ? "OTKLJUČANO 🔓" : "ZAKLJUČANO 🔒"}
                  </strong></p>
                  <p style={{ fontSize: '13px', color: '#666' }}>Poslednji tag: {info.last_tag || "Nema očitavanja"}</p>
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
