import React, { useState } from 'react';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que la página se recargue
    console.log("1. Botón presionado. Intentando login..."); // CHIVATO 1

    if (!username || !password) {
      alert("Por favor escribe usuario y contraseña");
      return;
    }

    setLoading(true);

    try {
      console.log("2. Enviando datos a http://localhost:3000/login"); // CHIVATO 2
      
      const res = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      console.log("3. Respuesta del servidor recibida. Status:", res.status); // CHIVATO 3

      const data = await res.json();

      if (res.ok) {
        console.log("4. Login Exitoso. Rol:", data.role); // CHIVATO 4
        // Guardar datos
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        
        alert("¡Login Correcto! Entrando...");

        // Avisar a la App principal
        if (onLoginSuccess) {
          onLoginSuccess(data.role);
        } else {
          console.error("ERROR CRÍTICO: No se pasó la función onLoginSuccess desde App.jsx");
          alert("Error interno: La App no sabe cómo cambiar de pantalla.");
        }
      } else {
        console.warn("Error de login:", data.message);
        alert(`Error: ${data.message || 'Usuario o clave incorrectos'}`);
      }
    } catch (err) {
      console.error("Error de conexión:", err);
      alert("Error de conexión: No se pudo contactar al servidor (Backend apagado o puerto incorrecto).");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{ textAlign: 'center', color: '#333' }}>Iniciar Sesión</h2>
        <p style={{textAlign: 'center', color: '#666'}}>Accede con tu usuario y contraseña</p>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="admin"
            />
          </div>
          <div style={styles.inputGroup}>
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="...."
            />
          </div>
          
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Conectando...' : 'Iniciar Sesión'}
          </button>
        </form>
        
        <p style={{fontSize: '0.8rem', color: '#999', textAlign: 'center', marginTop: '10px'}}>
            ¿Problemas? Abre la consola (F12) para ver errores.
        </p>
      </div>
    </div>
  );
};

// Estilos simples para que se vea bien
const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' },
  card: { padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'white', width: '100%', maxWidth: '400px' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  input: { padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' },
  button: { padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }
};

export default Login;