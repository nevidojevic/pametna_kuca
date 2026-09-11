import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

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
