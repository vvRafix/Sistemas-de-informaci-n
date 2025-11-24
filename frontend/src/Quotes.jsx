import React, { useState, useEffect } from 'react';

export default function Quotes() {
    const [view, setView] = useState('list');
    const [quotes, setQuotes] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [searchTerm, setSearchTerm] = useState(""); // Buscador
    
    // Formulario
    const [clientName, setClientName] = useState('');
    const [items, setItems] = useState([]);
    const [editingId, setEditingId] = useState(null);

    const getToken = () => localStorage.getItem('token');
    const isAdmin = localStorage.getItem('role') === 'admin';

    useEffect(() => { fetchQuotes(); fetchInventory(); }, []);

    const fetchQuotes = async () => {
        const res = await fetch('http://localhost:3000/quotes', { headers: { 'Authorization': `Bearer ${getToken()}` } });
        if (res.ok) setQuotes(await res.json());
    };

    const fetchInventory = async () => {
        const res = await fetch('http://localhost:3000/inventory', { headers: { 'Authorization': `Bearer ${getToken()}` } });
        if (res.ok) setInventory(await res.json());
    };

    const addProductRow = (e) => {
        const prodId = e.target.value;
        if (!prodId) return;
        const product = inventory.find(p => String(p.id) === prodId);
        if (items.find(i => i.product_id === product.id)) return alert("Ya está agregado");
        setItems([...items, { product_id: product.id, desc: product.name, qty: 1, price: product.price, maxStock: product.stock }]);
    };

    const handleQtyChange = (idx, val) => {
    const newQty = parseInt(val);
    const item = items[idx];

    // Validación 1: No negativos ni cero
    if (isNaN(newQty) || newQty < 1) return;

    // Validación 2: Tope de Stock
    if (item.maxStock && newQty > item.maxStock) {
        alert(`¡Solo tienes ${item.maxStock} unidades de ${item.desc}!`);
        return; // No actualizamos el estado, se queda con el valor anterior
    }

    const newItems = [...items];
    newItems[idx].qty = newQty;
    setItems(newItems);
    };

    const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

    const calculateTotal = () => items.reduce((sum, i) => sum + (i.qty * i.price), 0);

    const handleSubmit = async () => {
        if(!clientName || items.length === 0) return alert("Faltan datos");
        const payload = {
            client_name: clientName,
            quote_date: new Date(),
            validity_days: 15,
            total_amount: calculateTotal(),
            items: items.map(i => ({ product_id: i.product_id, description: i.desc, quantity: i.qty, unit_price: i.price }))
        };
        const res = await fetch('http://localhost:3000/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify(payload)
        });
        if(res.ok) { alert("Guardado"); setView('list'); fetchQuotes(); setClientName(''); setItems([]); }
    };

    const handleDelete = async (id) => {
        if(!confirm("¿Borrar definitivamente?")) return;
        await fetch(`http://localhost:3000/quotes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
        fetchQuotes();
    };

    const handleApprove = async (id) => {
        if(!confirm("Se descontará stock. ¿Seguro?")) return;
        const res = await fetch(`http://localhost:3000/quotes/${id}/approve`, { method: 'PUT', headers: { 'Authorization': `Bearer ${getToken()}` } });
        if(res.ok) { alert("✅ Aprobada"); fetchQuotes(); fetchInventory(); }
        else { const err = await res.json(); alert("Error: " + err.error); }
    };

    const handleRevert = async (id) => {
        if(!confirm("¿Revertir aprobación? El stock volverá al inventario.")) return;
        const res = await fetch(`http://localhost:3000/quotes/${id}/revert`, { method: 'PUT', headers: { 'Authorization': `Bearer ${getToken()}` } });
        if(res.ok) { alert("↺ Revertida a Revisión"); fetchQuotes(); fetchInventory(); }
    };

    // FILTRADO REACTIVO
    const filteredQuotes = quotes.filter(q => 
        q.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.total_amount.toString().includes(searchTerm)
    );

    return (
        <div style={s.container}>
            <h2 style={{textAlign:'center', color:'#fff', marginBottom:'20px'}}>Gestión de Cotizaciones</h2>

            {view === 'list' && (
                <div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', gap:'10px', flexWrap:'wrap'}}>
                        <button onClick={()=>{setItems([]); setClientName(''); setView('create')}} style={s.btnMain}>+ Nueva Cotización</button>
                        
                        <input 
                            style={s.searchBar} 
                            placeholder="🔍 Buscar cliente..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={s.grid}>
                        {filteredQuotes.map(q => (
                            <div key={q.id} style={{...s.card, borderLeft: `6px solid ${q.status==='aprobada'?'#10b981':'#f59e0b'}`}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                                    <div>
                                        <h3 style={{margin:'0 0 5px 0', color:'#1f2937'}}>Cliente: {q.client_name}</h3>
                                        <span style={{...s.badge, background: q.status==='aprobada'?'#d1fae5':'#fef3c7', color: q.status==='aprobada'?'#065f46':'#92400e'}}>
                                            {q.status.toUpperCase()}
                                        </span>
                                        <div style={{fontSize:'12px', color:'#64748b', marginTop:'8px'}}>
                                            {new Date(q.quote_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{textAlign:'right'}}>
                                        <div style={{fontWeight:'bold', fontSize:'1.4rem', color:'#1f2937'}}>${q.total_amount.toLocaleString()}</div>
                                        
                                        <div style={{marginTop:'10px', display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                                            {isAdmin && q.status === 'revision' && (
                                                <button onClick={()=>handleApprove(q.id)} style={s.btnApprove}>✓ Aprobar</button>
                                            )}
                                            {isAdmin && q.status === 'aprobada' && (
                                                <button onClick={()=>handleRevert(q.id)} style={s.btnRevert}>↺ Revertir</button>
                                            )}
                                            <button onClick={()=>handleDelete(q.id)} style={s.btnDelete}>🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredQuotes.length === 0 && <p style={{textAlign:'center', color:'#ccc'}}>No se encontraron cotizaciones.</p>}
                    </div>
                </div>
            )}

            {view === 'create' && (
                <div style={s.formCard}>
                    <h3 style={{color:'#1f2937', marginTop:0}}>Nueva Cotización</h3>
                    <input style={s.input} placeholder="Nombre del Cliente" value={clientName} onChange={e=>setClientName(e.target.value)} />
                    
                    <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', marginTop:'20px', border:'1px solid #e2e8f0'}}>
                        <label style={{display:'block', marginBottom:'5px', fontSize:'14px', fontWeight:'bold', color:'#475569'}}>Agregar Producto:</label>
                        <select style={s.select} onChange={addProductRow} value="">
                            <option value="">-- Seleccionar del Inventario --</option>
                            {inventory.map(p => (
                                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                                    {p.name} — Stock: {p.stock} — ${p.price}
                                </option>
                            ))}
                        </select>
                    </div>

                    <table style={s.table}>
                        <thead><tr style={{background:'#f1f5f9', color:'#475569'}}><th>Producto</th><th>Cant.</th><th>Total</th><th></th></tr></thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx} style={{borderBottom:'1px solid #e2e8f0'}}>
                                    <td style={s.td}>{item.desc}</td>
                                    <td style={s.td}><input type="number" value={item.qty} onChange={e=>handleQtyChange(idx, e.target.value)} style={s.qtyInput} min="1"/></td>
                                    <td style={{...s.td, fontWeight:'bold'}}>${(item.price * item.qty).toLocaleString()}</td>
                                    <td style={s.td}><button onClick={()=>removeItem(idx)} style={{color:'red', cursor:'pointer', border:'none', background:'transparent'}}>✕</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <div style={{textAlign:'right', marginTop:'20px', fontSize:'1.5rem', fontWeight:'bold', color:'#1e293b'}}>
                        Total: ${calculateTotal().toLocaleString()}
                    </div>

                    <div style={{marginTop:'20px', display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                        <button onClick={() => setView('list')} style={s.btnSec}>Cancelar</button>
                        <button onClick={handleSubmit} style={s.btnMain}>Guardar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const s = {
    container: { maxWidth: '900px', margin: '40px auto', fontFamily: "Arial, sans-serif" },
    searchBar: { padding: '10px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, maxWidth: '300px', fontSize: '14px', color: '#1f2937', background: 'white' },
    grid: { display: 'grid', gap: '15px', marginTop: '20px' },
    
    // TARJETAS Y FORMULARIOS (Colores oscuros forzados para texto)
    card: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', color: '#1f2937' },
    formCard: { background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#1f2937' },
    
    input: { padding: '10px', width: '100%', marginBottom: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', color: '#1f2937', background: 'white' },
    select: { padding: '10px', width: '100%', marginBottom: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', color: '#1f2937', background: 'white' },
    qtyInput: { padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '60px', textAlign: 'center', color: '#1f2937', background: '#ffffff', fontWeight: 'bold'},
    
    btnMain: { padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    btnSec: { padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    btnApprove: { padding: '6px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight:'bold' },
    btnRevert: { padding: '6px 12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight:'bold' },
    btnDelete: { padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },

    table: { width: '100%', marginTop: '10px', borderCollapse: 'collapse', color: '#333' },
    td: { padding: '10px', color: '#333' },
    badge: { fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', fontWeight: 'bold' }
};