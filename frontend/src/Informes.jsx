import React, { useState } from 'react';

function Informes() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState('');
  const [entidad, setEntidad] = useState('servicios');
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      if (estado) params.append('estado', estado);
      params.append('preview', 'true');
      if (entidad === 'servicios') {
        const res = await fetch(`https://sevenelectricmanage.onrender.com/informes/servicios?${params.toString()}`);
        if (!res.ok) throw new Error('Error al obtener previsualización');
        const data = await res.json();
        setPreview(data);
      } else if (entidad === 'cotizaciones') {
        const res = await fetch(`https://sevenelectricmanage.onrender.com/informes/cotizaciones?${params.toString()}`);
        if (!res.ok) throw new Error('Error al obtener previsualización');
        const data = await res.json();
        setPreview(data);
      } else {
        const res1 = await fetch(`https://sevenelectricmanage.onrender.com/informes/servicios?${params.toString()}`);
        const res2 = await fetch(`https://sevenelectricmanage.onrender.com/informes/cotizaciones?${params.toString()}`);
        if (!res1.ok || !res2.ok) throw new Error('Error al obtener previsualización');
        const d1 = await res1.json();
        const d2 = await res2.json();
        setPreview([...d1, ...d2]);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    if (estado) params.append('estado', estado);
    if (entidad === 'servicios') {
      window.open(`https://sevenelectricmanage.onrender.com/informes/servicios?${params.toString()}`, '_blank');
    } else if (entidad === 'cotizaciones') {
      window.open(`https://sevenelectricmanage.onrender.com/informes/cotizaciones?${params.toString()}`, '_blank');
    } else {
      // Abrir ambos en pestañas separadas
      window.open(`https://sevenelectricmanage.onrender.com/informes/servicios?${params.toString()}`, '_blank');
      window.open(`https://sevenelectricmanage.onrender.com/informes/cotizaciones?${params.toString()}`, '_blank');
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <h3>Informes de Servicios</h3>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div>
          <label>Entidad: </label>
          <select value={entidad} onChange={e => setEntidad(e.target.value)}>
            <option value="servicios">Servicios</option>
            <option value="cotizaciones">Cotizaciones</option>
            <option value="ambos">Ambos</option>
          </select>
        </div>
        <div>
          <label>Desde: </label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label>Hasta: </label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <div>
          <label>Estado: </label>
          <select value={estado} onChange={e => setEstado(e.target.value)}>
            <option value="">(Todos)</option>
            <option value="pendiente">pendiente</option>
            <option value="aceptada">aceptada</option>
            <option value="rechazada">rechazada</option>
            <option value="en proceso">en proceso</option>
            <option value="terminado">terminado</option>
            <option value="cancelado">cancelado</option>
          </select>
        </div>
        <div>
          <button onClick={handlePreview} className="btn-primary" style={{ borderRadius: 6 }}>{loading ? 'Cargando...' : 'Previsualizar'}</button>
        </div>
        <div>
          <button onClick={handleDownload} className="btn-primary" style={{ borderRadius: 6 }}>Descargar CSV</button>
        </div>
      </div>

      <div>
        <h4>Previsualización</h4>
        {preview.length === 0 ? <p>No hay resultados.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Entidad</th>
                <th>Tipo/Cliente</th>
                <th>Descripción/Items</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Fecha Borrado</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{r.id || r.id_borrado || '-'}</td>
                  <td style={{ padding: 8 }}>{r.tipo ? 'servicio' : 'cotizacion'}</td>
                  <td style={{ padding: 8 }}>{r.tipo || r.cliente}</td>
                  <td style={{ padding: 8 }}>{r.descripcion || r.items_formatted || JSON.stringify(r.items)}</td>
                  <td style={{ padding: 8 }}>{r.estado}</td>
                  <td style={{ padding: 8 }}>{r.fecha || r.fechaIngreso}</td>
                  <td style={{ padding: 8 }}>{r.fecha_borrado || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Informes;
