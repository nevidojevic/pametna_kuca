import React, { useState } from 'react';
import { API_URL } from '../config';

function Register({ onSwitchToLogin, onRegisterSuccess }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
        body: JSON.stringify({ username, email, password })
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
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-name">Pametna kuća</span>
        </div>
        <h1 className="auth-title">Registracija</h1>
        <form onSubmit={handleRegister}>
          <div className="field">
            <label htmlFor="reg-username">Korisničko ime</label>
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="reg-password">Lozinka</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn-primary">Registruj se</button>
        </form>
        <p className="auth-switch">
          Već imate nalog? <button type="button" onClick={onSwitchToLogin}>Prijavite se</button>
        </p>
      </div>
    </div>
  );
}

export default Register;
