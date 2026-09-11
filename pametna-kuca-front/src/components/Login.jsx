import React, { useState } from 'react';
import { API_URL } from '../config';

function Login({ onLogin, onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-name">Pametna kuća</span>
        </div>
        <h1 className="auth-title">Prijava</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-username">Korisničko ime</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Lozinka</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary">Prijavi se</button>
        </form>
        <p className="auth-switch">
          Nemate nalog? <button type="button" onClick={onSwitchToRegister}>Registrujte se</button>
        </p>
      </div>
    </div>
  );
}

export default Login;
