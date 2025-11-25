import React, { useEffect, useState } from 'react';

function CotizacionesBorradas() {
  const [borradas, setBorradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('https://sevenelectricmanage.onrender.com/cotizaciones-borradas')
      .then(res => { if (!res.ok) throw new Error('Error al cargar cotizaciones borradas'); return res.json(); })
      .then(data => { setBorradas(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const handleDelete = async (id_borrado) => {
    if (!window.confirm('Eliminar definitivamente esta cotización?')) return;
    try {
      const res = await fetch(`https://sevenelectricmanage.onrender.com/cotizaciones-borradas/${id_borrado}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar definitivamente');
      setBorradas(prev => prev.filter(c => c.id_borrado !== id_borrado));
    } catch (err) { alert(err.message); }
  };

  if (loading) return <p>Cargando cotizaciones borradas...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ marginTop: 20 }}>
      <h3>Cotizaciones</h3>
      {borradas.length === 0 ? <p>No hay cotizaciones en la papelera.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID Borrado</th>
              <th>ID Original</th>
              <th>Cliente</th>
              <th>Items</th>
              <th>Total</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {borradas.map(c => (
              <tr key={c.id_borrado} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{c.id_borrado}</td>
                <td style={{ padding: 8 }}>{c.id_original}</td>
                <td style={{ padding: 8 }}>{c.cliente}</td>
                <td style={{ padding: 8 }}>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {c.items.map((it, i) => <li key={i}>{it.descripcion} - ${it.precio}</li>)}
                  </ul>
                </td>
                <td style={{ padding: 8 }}>${c.total}</td>
                <td style={{ padding: 8 }}>{c.fecha}</td>
                <td style={{ padding: 8 }}><button onClick={() => handleDelete(c.id_borrado)} className="btn-danger small">Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default CotizacionesBorradas;
