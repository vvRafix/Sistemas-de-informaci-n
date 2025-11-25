import React, { useState } from 'react';

function CotizacionForm({ onCreated }) {
  const [cliente, setCliente] = useState('');
  const [items, setItems] = useState([{ descripcion: '', precio: '' }]);
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleItemChange = (idx, field, value) => {
    const copy = [...items];
    copy[idx][field] = value;
    setItems(copy);
  };
  const addItem = () => setItems([...items, { descripcion: '', precio: 0 }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const calcularTotal = () => items.reduce((s, it) => s + (Number(it.precio) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!cliente || !fecha || items.length === 0) {
      setError('Completa cliente, fecha y al menos un item');
      return;
    }
    setEnviando(true);
    try {
      // convertir precios a número antes de enviar
      const payloadItems = items.map(it => ({ descripcion: it.descripcion, precio: Number(it.precio) || 0 }));
      const res = await fetch('https://sevenelectricmanage.onrender.com/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente, items: payloadItems, total: calcularTotal(), fecha })
      });
      if (!res.ok) throw new Error('Error al crear cotización');
      const data = await res.json();
      onCreated && onCreated(data);
      setCliente(''); setFecha(''); setItems([{ descripcion: '', precio: 0 }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', marginBottom: 20 }}>
      <h3>Crear cotización</h3>
      <div>
        <label>Cliente: </label>
        <input value={cliente} onChange={e => setCliente(e.target.value)} required />
      </div>
      <div>
        <label>Fecha: </label>
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required />
      </div>
      <div style={{ marginTop: 10 }}>
        <h4>Items</h4>
        {items.map((it, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input placeholder="Descripción" value={it.descripcion} onChange={e => handleItemChange(idx, 'descripcion', e.target.value)} required />
            <input placeholder="Precio" type="number" value={it.precio} onChange={e => handleItemChange(idx, 'precio', e.target.value)} required />
            <button type="button" onClick={() => removeItem(idx)} className="btn-danger small">Quitar</button>
          </div>
        ))}
  <button type="button" onClick={addItem} className="btn-primary small">Agregar item</button>
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>Total: {calcularTotal()}</strong>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
  <button type="submit" disabled={enviando} className="btn-primary" style={{ marginTop: 8 }}>{enviando ? 'Guardando...' : 'Crear cotización'}</button>
    </form>
  );
}

export default CotizacionForm;
