import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

function computeAverages(history) {
  const byDay = {};
  let tempSum = 0, tempCount = 0, humSum = 0, humCount = 0;

  history.forEach((entry) => {
    const day = entry.time.split(' ')[0];
    if (!byDay[day]) byDay[day] = { tempSum: 0, tempCount: 0, humSum: 0, humCount: 0 };

    if (entry.temperature != null) {
      byDay[day].tempSum += entry.temperature;
      byDay[day].tempCount += 1;
      tempSum += entry.temperature;
      tempCount += 1;
    }
    if (entry.humidity != null) {
      byDay[day].humSum += entry.humidity;
      byDay[day].humCount += 1;
      humSum += entry.humidity;
      humCount += 1;
    }
  });

  const dailyAverages = Object.entries(byDay)
    .map(([day, v]) => ({
      day,
      avgTemp: v.tempCount ? v.tempSum / v.tempCount : null,
      avgHumidity: v.humCount ? v.humSum / v.humCount : null,
    }))
    .sort((a, b) => (a.day < b.day ? 1 : -1));

  return {
    weeklyAvgTemp: tempCount ? tempSum / tempCount : null,
    weeklyAvgHumidity: humCount ? humSum / humCount : null,
    dailyAverages,
  };
}

function History({ onBack }) {
  const [tempHistory, setTempHistory] = useState([]);
  const [rfidHistory, setRfidHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [tempRes, rfidRes] = await Promise.all([
          fetch(`${API_URL}/history/temperature/`),
          fetch(`${API_URL}/history/rfid/`)
        ]);
        setTempHistory(await tempRes.json());
        setRfidHistory(await rfidRes.json());
      } catch (error) {
        console.error("Greška pri učitavanju istorije:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const { weeklyAvgTemp, weeklyAvgHumidity, dailyAverages } = computeAverages(tempHistory);

  return (
    <div className="history">
      <div className="history-header">
        <h1 className="history-title">Istorija</h1>
        <button className="btn-ghost" onClick={onBack}>Nazad</button>
      </div>

      {loading ? (
        <p className="loading-note">Učitavanje istorije...</p>
      ) : (
        <>
          {tempHistory.length > 0 && (
            <div className="history-section">
              <div className="history-section-title">Nedeljni prosek</div>
              <div className="stat-row">
                <div className="stat-tile">
                  <div className="stat-value">
                    {weeklyAvgTemp != null ? weeklyAvgTemp.toFixed(1) : '—'}<span>°C</span>
                  </div>
                  <div className="stat-label">prosečna temperatura</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-value">
                    {weeklyAvgHumidity != null ? weeklyAvgHumidity.toFixed(1) : '—'}<span>%</span>
                  </div>
                  <div className="stat-label">prosečna vlažnost</div>
                </div>
              </div>

              <div className="history-section-title" style={{ marginTop: '22px' }}>Dnevni prosek</div>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Dan</th>
                    <th>Prosečna temperatura</th>
                    <th>Prosečna vlažnost</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyAverages.map((d) => (
                    <tr key={d.day}>
                      <td>{d.day}</td>
                      <td>{d.avgTemp != null ? `${d.avgTemp.toFixed(1)}°C` : '—'}</td>
                      <td>{d.avgHumidity != null ? `${d.avgHumidity.toFixed(1)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="history-section">
            <div className="history-section-title">Temperatura i vlažnost — poslednjih 7 dana</div>
            {tempHistory.length === 0 ? (
              <p className="history-empty">Nema zabeleženih podataka.</p>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Vreme</th>
                    <th>Temperatura</th>
                    <th>Vlažnost</th>
                  </tr>
                </thead>
                <tbody>
                  {[...tempHistory].reverse().map((entry, i) => (
                    <tr key={i}>
                      <td>{entry.time}</td>
                      <td>{entry.temperature != null ? `${entry.temperature}°C` : '—'}</td>
                      <td>{entry.humidity != null ? `${entry.humidity}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="history-section">
            <div className="history-section-title">RFID pristup — poslednjih 7 dana</div>
            {rfidHistory.length === 0 ? (
              <p className="history-empty">Nema zabeleženih podataka.</p>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Vreme</th>
                    <th>Tag ID</th>
                    <th>Pristup</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rfidHistory].reverse().map((entry, i) => (
                    <tr key={i}>
                      <td>{entry.time}</td>
                      <td>{entry.tag_id}</td>
                      <td className={entry.access_granted ? 'access-granted' : 'access-denied'}>
                        {entry.access_granted ? 'Dozvoljen' : 'Odbijen'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default History;
