import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
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
        const point = { temperature: env.temperature, humidity: env.humidity };
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

  const env = devices.env_sensor_1;
  const motion = devices.motion_sensor_1;
  const flame = devices.flame_sensor_1;
  const rfid = devices.rfid_reader_1;

  const hasData = Object.keys(devices).length > 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-name">Pametna kuća</span>
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={onShowHistory}>Istorija</button>
          <button className="btn-text" onClick={onLogout}>Odjavi se</button>
        </div>
      </div>

      {!hasData ? (
        <p className="loading-note">Učitavanje uređaja sa servera...</p>
      ) : (
        <>
          {env && (
            <div className="hero-panel">
              <div className="hero-readout">
                <div className="hero-temp">
                  {env.temperature}<span>°C</span>
                </div>
                <div className="hero-humidity">
                  <div className="hero-humidity-value">{env.humidity}%</div>
                  <div className="hero-humidity-label">vlažnost</div>
                </div>
              </div>

              {chartData.length > 1 && (
                <div className="hero-chart">
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <YAxis hide domain={['dataMin - 0.15', 'dataMax + 0.15']} />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          <div className="panel-list">
            {motion && (
              <div className="panel-row">
                <span className={`status-dot ${motion.motion_detected ? 'is-active' : ''}`} />
                <div className="panel-row-body">
                  <div className="panel-row-label">Pokret</div>
                  <div className="panel-row-sub">
                    {motion.last_motion_at ? `Poslednji put: ${motion.last_motion_at}` : 'Nema zabeleženih pokreta'}
                  </div>
                </div>
                <div className={`panel-row-value ${motion.motion_detected ? 'is-alert' : 'is-safe'}`}>
                  {motion.motion_detected ? 'Detektovan' : 'Mirno'}
                </div>
              </div>
            )}

            {flame && (
              <div className={`panel-row ${flame.flame_detected ? 'is-alert' : ''}`}>
                <span className={`status-dot ${flame.flame_detected ? 'is-active' : ''}`} />
                <div className="panel-row-body">
                  <div className="panel-row-label">Plamen</div>
                  {flame.flame_detected && (
                    <div className="panel-row-sub">Opasnost — proveriti odmah</div>
                  )}
                </div>
                <div className={`panel-row-value ${flame.flame_detected ? 'is-alert' : 'is-safe'}`}>
                  {flame.flame_detected ? 'Detektovan' : 'Nema'}
                </div>
              </div>
            )}

            {rfid && (
              <div className="panel-row">
                <span className={`status-dot ${rfid.access_granted ? '' : 'is-active'}`} />
                <div className="panel-row-body">
                  <div className="panel-row-label">Ulazna vrata</div>
                  <div className="panel-row-sub">
                    {rfid.last_tag ? `Poslednji tag: ${rfid.last_tag}` : 'Nema očitavanja'}
                  </div>
                </div>
                <div className={`panel-row-value ${rfid.access_granted ? 'is-safe' : ''}`}>
                  {rfid.access_granted ? 'Otključano' : 'Zaključano'}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
