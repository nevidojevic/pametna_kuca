import React, { useState } from 'react';

function Register({ onSwitchToLogin, onRegisterSuccess }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const API_URL = "http://127.0.0.1:8000";

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      alert("Popunite sva polja.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }) // Dodato slanje lozinke
      });

      if (response.ok) {
        alert("Uspešno ste kreirali profil! Možete se prijaviti.");
        onRegisterSuccess();
      } else {
        const data = await response.json();
        alert(data.detail || "Greška pri registraciji.");
      }
    } catch (error) {
      console.error("Greška sa serverom:", error);
      alert("Nije moguće povezati se sa serverom.");
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '60px', fontFamily: 'Arial' }}>
      <h2>Registracija - Pametna Kuća</h2>
      <form onSubmit={handleRegister} style={{ display: 'inline-block', textAlign: 'left', border: '1px solid #ccc', padding: '20px', borderRadius: '5px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Korisničko ime:</label><br />
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            style={{ padding: '6px', width: '220px', marginTop: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label><br />
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
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
        <button type="submit" style={{ padding: '8px 15px', cursor: 'pointer', width: '100%', marginBottom: '10px' }}>Registruj se</button>
        <p style={{ fontSize: '13px', textAlign: 'center', margin: '5px 0' }}>
          Već imate nalog? <span onClick={onSwitchToLogin} style={{ color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}>Prijavite se</span>
        </p>
      </form>
    </div>
  );
}

export default Register;