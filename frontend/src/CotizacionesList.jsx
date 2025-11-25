import React, { useEffect, useState } from 'react';

function CotizacionesList() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCotizaciones = () => {
    setLoading(true);
    fetch('https://sevenelectricmanage.onrender.com/cotizaciones')
      .then(res => { if (!res.ok) throw new Error('Error al cargar cotizaciones'); return res.json(); })
      .then(data => { setCotizaciones(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { fetchCotizaciones(); }, []);

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const res = await fetch(`https://sevenelectricmanage.onrender.com/cotizaciones/${id}/estado`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: nuevoEstado })
      });
      if (!res.ok) throw new Error('Error al actualizar estado');
      // si fue rechazada, recargar y también puede ser movida a papelera
      fetchCotizaciones();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Cargando cotizaciones...</p>;
  if (error) return <p>Error: {error}</p>;
  const pendientes = cotizaciones.filter(c => c.estado === 'pendiente');
  const aceptadas = cotizaciones.filter(c => c.estado === 'aceptada');

  return (
    <div style={{ width: '100%' }}>
      <h3>Cotizaciones</h3>
      <h4>Pendientes</h4>
      {pendientes.length === 0 ? <p>No hay cotizaciones pendientes.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Items</th>
              <th>Total</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{c.id}</td>
                <td style={{ padding: 8 }}>{c.cliente}</td>
                <td style={{ padding: 8 }}>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {c.items.map((it, i) => <li key={i}>{it.descripcion} - ${it.precio}</li>)}
                  </ul>
                </td>
                <td style={{ padding: 8 }}>${c.total}</td>
                <td style={{ padding: 8 }}>{c.fecha}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => cambiarEstado(c.id, 'aceptada')} className="btn-primary small" style={{ marginRight: 6 }}>Aceptar</button>
                  <button onClick={() => cambiarEstado(c.id, 'rechazada')} className="btn-danger small">Rechazar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h4>Aceptadas</h4>
      {aceptadas.length === 0 ? <p>No hay cotizaciones aceptadas.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Items</th>
              <th>Total</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {aceptadas.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{c.id}</td>
                <td style={{ padding: 8 }}>{c.cliente}</td>
                <td style={{ padding: 8 }}>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {c.items.map((it, i) => <li key={i}>{it.descripcion} - ${it.precio}</li>)}
                  </ul>
                </td>
                <td style={{ padding: 8 }}>${c.total}</td>
                <td style={{ padding: 8 }}>{c.fecha}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => {
                    if (!window.confirm('¿Eliminar esta cotización aceptada? Esto la moverá a la papelera.')) return;
                    cambiarEstado(c.id, 'rechazada');
                  }} className="btn-danger small">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default CotizacionesList;
