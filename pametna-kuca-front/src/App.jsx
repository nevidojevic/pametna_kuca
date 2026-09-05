import React, { useState } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

function App() {
  const [currentView, setCurrentView] = useState('login'); 

  return (
    <div>
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
        />
      )}
    </div>
  );
}

export default App;