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
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Istorija podataka</h2>
        <button onClick={onBack} style={{ padding: '5px 10px', cursor: 'pointer' }}>Nazad</button>
      </div>
      <hr style={{ margin: '15px 0' }} />

      {loading ? (
        <p>Učitavanje istorije...</p>
      ) : (
        <>
          <h3>🌡️ Temperatura i vlažnost (poslednjih 7 dana)</h3>
          {tempHistory.length === 0 ? (
            <p>Nema zabeleženih podataka.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                  <th style={{ padding: '6px' }}>Vreme</th>
                  <th style={{ padding: '6px' }}>Temperatura</th>
                  <th style={{ padding: '6px' }}>Vlažnost</th>
                </tr>
              </thead>
              <tbody>
                {[...tempHistory].reverse().map((entry, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px' }}>{entry.time}</td>
                    <td style={{ padding: '6px' }}>{entry.temperature != null ? `${entry.temperature}°C` : '-'}</td>
                    <td style={{ padding: '6px' }}>{entry.humidity != null ? `${entry.humidity}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3>🚪 RFID pristup (poslednjih 7 dana)</h3>
          {rfidHistory.length === 0 ? (
            <p>Nema zabeleženih podataka.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                  <th style={{ padding: '6px' }}>Vreme</th>
                  <th style={{ padding: '6px' }}>Tag ID</th>
                  <th style={{ padding: '6px' }}>Pristup</th>
                </tr>
              </thead>
              <tbody>
                {[...rfidHistory].reverse().map((entry, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px' }}>{entry.time}</td>
                    <td style={{ padding: '6px' }}>{entry.tag_id}</td>
                    <td style={{ padding: '6px', color: entry.access_granted ? 'green' : 'red' }}>
                      {entry.access_granted ? 'Dozvoljen' : 'Odbijen'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default History;
