import React, { useState } from 'react';

function Login({ onLogin, onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const API_URL = "http://127.0.0.1:8000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      alert("Unesite korisničko ime i lozinku.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        onLogin(username);
      } else {
        const data = await response.json();
        alert(data.detail || "Pogrešno korisničko ime ili lozinka.");
      }
    } catch (error) {
      console.error("Greška sa serverom:", error);
      alert("Nije moguće povezati se sa serverom.");
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '80px', fontFamily: 'Arial' }}>
      <h2>Prijava - Pametna Kuća</h2>
      <form onSubmit={handleSubmit} style={{ display: 'inline-block', textAlign: 'left', border: '1px solid #ccc', padding: '20px', borderRadius: '5px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label>Korisničko ime:</label><br />
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            style={{ padding: '6px', width: '220px', marginTop: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Lozinka:</label><br />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ padding: '6px', width: '220px', marginTop: '4px' }}
          />
        </div>
        <button type="submit" style={{ padding: '8px 15px', cursor: 'pointer', width: '100%', marginBottom: '10px' }}>Prijavi se</button>
        <p style={{ fontSize: '13px', textAlign: 'center', margin: '5px 0' }}>
          Nemate nalog? <span onClick={onSwitchToRegister} style={{ color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}>Registrujte se</span>
        </p>
      </form>
    </div>
  );
}

export default Login;