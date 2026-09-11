import React, { useState } from 'react';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import History from './components/History';

function App() {
  const [currentView, setCurrentView] = useState('login');

  return (
    <div className="shell">
      {currentView === 'login' && (
        <Login 
          onLogin={() => setCurrentView('dashboard')} 
          onSwitchToRegister={() => setCurrentView('register')} 
        />
      )}

      {currentView === 'register' && (
        <Register 
          onSwitchToLogin={() => setCurrentView('login')} 
          onRegisterSuccess={() => setCurrentView('login')} 
        />
      )}

      {currentView === 'dashboard' && (
        <Dashboard
          onLogout={() => setCurrentView('login')}
          onShowHistory={() => setCurrentView('history')}
        />
      )}

      {currentView === 'history' && (
        <History
          onBack={() => setCurrentView('dashboard')}
        />
      )}
    </div>
  );
}

export default App;