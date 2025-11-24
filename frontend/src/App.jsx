import React, { useState, useEffect } from 'react';
import Login from './Login';
import TechnicalReports from './TechnicalReports';
import MachineHistory from './MachineHistory';
import Expenses from './Expenses';
import Inventory from './Inventory';
import Quotes from './Quotes';
import AdminPanel from './AdminPanel';

function App() {
  const [userRole, setUserRole] = useState(null);
  const [currentView, setCurrentView] = useState('home'); 

  // 1. Cargar estado al iniciar
  useEffect(() => {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('token');
    if (role && token) {
      setUserRole(role);
    }
  }, []);

  // 2. Funciones de Sesión
  const handleLogin = (role) => {
    setUserRole(role);
    setCurrentView('home');
  };

  const handleLogout = () => {
    localStorage.clear(); // Limpiar todo (token y role)
    setUserRole(null);
    setCurrentView('home');
  };

  // 3. Renderizado Condicional del Login
  if (!userRole) {
    return <Login onLoginSuccess={handleLogin} />;
  }

  const isAdmin = userRole === 'admin';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#374151', minHeight: '100vh' }}>
      <nav style={styles.navBar}>
        <div style={styles.headerInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/pesta%C3%B1a.png"
              alt="Seven Electric logo"
              style={{ width: '40px', height: '40px', objectFit: 'contain' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
                fontWeight: 800,
                fontSize: '1.8rem',
                color: '#7dd3fc' /* azul claro */,
                letterSpacing: '0.04em'
              }}>
                SEVEN
              </span>
              <span style={{
                fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
                fontWeight: 800,
                fontSize: '1.8rem',
                color: '#7dd3fc' /* azul */,
                letterSpacing: '0.04em'
              }}>
                ELECTRIC
              </span>
            </div>
          </div>

          <span style={roleBadge(isAdmin)}>
            {userRole}
          </span>
        </div>

        {/* CONTROLES DE NAVEGACIÓN */}
        <div style={styles.navControls}>
          {/* MÓDULOS OPERATIVOS (Para todos) */}
          <button onClick={() => setCurrentView('home')} style={btnNav(currentView === 'home')}>Inicio</button>
          <button onClick={() => setCurrentView('reports')} style={btnNav(currentView === 'reports')}>Reportes</button>
          <button onClick={() => setCurrentView('history')} style={btnNav(currentView === 'history')}>Historial Máquinas</button>
          <button onClick={() => setCurrentView('expenses')} style={btnNav(currentView === 'expenses')}>Gastos</button>
          
          {/* MÓDULOS SOLO ADMIN (Permisos Restringidos) */}
          {isAdmin && (
            <>
              <button onClick={() => setCurrentView('quotes')} style={btnNav(currentView === 'quotes')}>Cotizaciones</button>
              <button onClick={() => setCurrentView('inventory')} style={btnNav(currentView === 'inventory')}>📦 Inventario</button>
              <button onClick={() => setCurrentView('admin')} style={btnNav(currentView === 'admin')}>⚙️ Admin</button>
            </>
          )}
          
          <button onClick={handleLogout} style={{ ...styles.baseBtn, background: '#dc2626' }}>Salir</button>
        </div>
      </nav>

      {/* ÁREA PRINCIPAL */}
      <main style={{ padding: '20px' }}>
        {currentView === 'home' && (
          <div style={{ textAlign: 'center', marginTop: '50px', color: '#ffffffff' }}>
            <h2 style={{fontSize: '2.5rem', marginBottom: '10px'}}>Bienvenido al Sistema</h2>
            <p>Selecciona un módulo en la barra superior para comenzar a trabajar.</p>
          </div>
        )}

        {currentView === 'reports' && <TechnicalReports />}
        {currentView === 'history' && <MachineHistory />}
        {currentView === 'expenses' && <Expenses />}
        {currentView === 'quotes' && <Quotes />}
        {currentView === 'inventory' && <Inventory />}
        {currentView === 'admin' && <AdminPanel />}
      </main>
    </div>
  );
}

// --- ESTILOS ---
const styles = {
    navBar: { background: '#1f2937', color: '#fff', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
    headerInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
    navControls: { display: 'flex', gap: '5px', flexWrap: 'wrap' },
    baseBtn: {
        padding: '8px 14px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: '500',
        transition: 'all 0.2s',
        color: 'white'
    }
};

const roleBadge = (isAdmin) => ({
    background: isAdmin ? '#2563eb' : '#059669', 
    padding: '2px 8px', 
    borderRadius: '4px', 
    fontSize: '0.8rem', 
    textTransform: 'uppercase'
});

const btnNav = (isActive) => ({
    ...styles.baseBtn,
    background: isActive ? '#374151' : 'transparent',
    border: isActive ? '1px solid #4b5563' : 'none',
});


export default App;