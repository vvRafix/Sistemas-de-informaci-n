import React, { useState, useEffect } from 'react';

export default function Inventory() {
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', category: '' });
    const [originalData, setOriginalData] = useState(null); 
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Estados para las Calculadoras (Separados para no mezclar)
    const [adjustStock, setAdjustStock] = useState(""); 
    const [adjustPrice, setAdjustPrice] = useState(""); 

    const getToken = () => localStorage.getItem('token');

    useEffect(() => { fetchProducts(); }, []);

    const fetchProducts = async () => {
        const res = await fetch('http://localhost:3000/inventory', { headers: { 'Authorization': `Bearer ${getToken()}` } });
        if (res.ok) setProducts(await res.json());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingId ? `http://localhost:3000/inventory/${editingId}` : 'http://localhost:3000/inventory';
        const method = editingId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify(form)
        });
        if (res.ok) { 
            alert("Guardado con éxito"); 
            resetForm();
            fetchProducts(); 
        }
    };

    const resetForm = () => {
        setForm({ name: '', description: '', price: '', stock: '', category: '' });
        setEditingId(null);
        setOriginalData(null);
        setAdjustStock("");
        setAdjustPrice("");
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Borrar producto?")) return;
        await fetch(`http://localhost:3000/inventory/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
        fetchProducts();
    };

    const handleEdit = (prod) => { 
        setEditingId(prod.id); 
        setForm(prod); 
        setOriginalData(prod);
        setAdjustStock(""); 
        setAdjustPrice("");
        window.scrollTo({top:0, behavior:'smooth'}); 
    };

    // --- LÓGICA DE CALCULADORA GENÉRICA ---
    const applyAdjustment = (field, valueState, setValueState, operation) => {
        if (!valueState || isNaN(valueState)) return;
        const val = parseInt(valueState);
        const current = parseInt(form[field]) || 0;
        
        let newValue;
        if (operation === 'add') newValue = current + val;
        if (operation === 'subtract') newValue = Math.max(0, current - val); // No bajar de 0

        setForm({ ...form, [field]: newValue });
        setValueState(""); // Limpiar la cajita chica
    };

    // --- VISUALIZACIÓN DE DIFERENCIA (FANTASMA) ---
    const renderDiff = (field) => {
        if (!originalData) return null;
        const current = Number(form[field]);
        const original = Number(originalData[field]);
        const diff = current - original;

        if (diff === 0) return null;
        const color = diff > 0 ? '#16a34a' : '#dc2626'; 
        const sign = diff > 0 ? '+' : '';
        // Si es precio, agregamos el signo $
        const prefix = field === 'price' ? '$' : '';
        return <span style={{fontWeight:'bold', color, marginLeft:'8px', fontSize:'14px'}}>({sign}{prefix}{diff.toLocaleString()})</span>;
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{maxWidth: '900px', margin: '20px auto', fontFamily:"'Inter', sans-serif", color:'#333'}}>
            <h2 style={{textAlign:'center', marginBottom:'30px', color:'#fff'}}>📦 Gestión de Inventario</h2>
            
            <form onSubmit={handleSubmit} style={s.form}>
                <div style={{gridColumn:'span 2', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>
                    <h3 style={{margin:0, color:'#1e293b'}}>
                        {editingId ? `Editando: ${originalData?.name}` : "Nuevo Producto"}
                    </h3>
                    {editingId && <span style={{fontSize:'12px', color:'#64748b', background:'#f1f5f9', padding:'4px 8px', borderRadius:'4px'}}>Modo Edición</span>}
                </div>

                {/* NOMBRE Y CATEGORÍA */}
                <div style={{gridColumn:'span 2', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                    <div>
                        <label style={s.label}>Nombre Producto</label>
                        <input style={s.input} value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
                    </div>
                    <div>
                        <label style={s.label}>Categoría</label>
                        <input style={s.input} value={form.category} onChange={e=>setForm({...form, category:e.target.value})} />
                    </div>
                </div>
                
                {/* PRECIO CON CALCULADORA */}
                <div>
                    <label style={s.label}>Precio Actual {renderDiff('price')}</label>
                    <div style={{display:'flex', gap:'10px'}}>
                        <input 
                            style={{...s.input, flex:1, fontWeight:'bold', color: '#1e293b'}} 
                            type="number" 
                            value={form.price} 
                            onChange={e=>setForm({...form, price:e.target.value})} 
                            required 
                            min="0"
                            onKeyDown={(e) => ["-", "e", "+"].includes(e.key) && e.preventDefault()}
                        />
                        
                        {/* Calculadora de Precio */}
                        {editingId && (
                            <div style={s.calcContainer}>
                                <input 
                                    style={s.miniInput} 
                                    placeholder="$ Ajuste" 
                                    type="number"
                                    value={adjustPrice}
                                    onChange={e=>setAdjustPrice(e.target.value)}
                                    onKeyDown={(e) => ["-", "e", "+"].includes(e.key) && e.preventDefault()}
                                />
                                <button type="button" onClick={()=>applyAdjustment('price', adjustPrice, setAdjustPrice, 'add')} style={{...s.miniBtn, color:'green'}} title="Subir Precio">+</button>
                                <button type="button" onClick={()=>applyAdjustment('price', adjustPrice, setAdjustPrice, 'subtract')} style={{...s.miniBtn, color:'red'}} title="Bajar Precio">-</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* STOCK CON CALCULADORA */}
                <div>
                    <label style={s.label}>Stock Actual {renderDiff('stock')}</label>
                    <div style={{display:'flex', gap:'10px'}}>
                        <input 
                            style={{...s.input, flex:1, fontWeight:'bold', color: '#1e293b'}} 
                            type="number" 
                            value={form.stock} 
                            onChange={e=>setForm({...form, stock:e.target.value})} 
                            required 
                            min="0"
                            onKeyDown={(e) => ["-", "e", "+"].includes(e.key) && e.preventDefault()}
                        />
                        
                        {/* Calculadora de Stock */}
                        {editingId && (
                            <div style={s.calcContainer}>
                                <input 
                                    style={s.miniInput} 
                                    placeholder="# Cant." 
                                    type="number"
                                    value={adjustStock}
                                    onChange={e=>setAdjustStock(e.target.value)}
                                    onKeyDown={(e) => ["-", "e", "+"].includes(e.key) && e.preventDefault()}
                                />
                                <button type="button" onClick={()=>applyAdjustment('stock', adjustStock, setAdjustStock, 'add')} style={{...s.miniBtn, color:'green'}} title="Sumar Stock">+</button>
                                <button type="button" onClick={()=>applyAdjustment('stock', adjustStock, setAdjustStock, 'subtract')} style={{...s.miniBtn, color:'red'}} title="Restar Stock">-</button>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{gridColumn:'span 2'}}>
                    <label style={s.label}>Descripción</label>
                    <textarea style={{...s.input, height:'80px', fontFamily:'inherit'}} value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
                </div>
                
                <div style={{gridColumn:'span 2', display:'flex', gap:'10px', marginTop:'10px'}}>
                    <button type="submit" style={{...s.btn, flex:1}}>{editingId ? "Guardar Cambios" : "Agregar Producto"}</button>
                    {editingId && <button type="button" onClick={resetForm} style={s.btnCancel}>Cancelar Edición</button>}
                </div>
            </form>

            {/* BARRA DE BÚSQUEDA */}
            <div style={{marginBottom:'15px'}}>
                <input 
                    style={{...s.input, border:'2px solid #e2e8f0', padding:'12px'}} 
                    placeholder="🔍 Buscar producto..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* TABLA */}
            <div style={{overflowX:'auto', borderRadius:'8px', border:'1px solid #e2e8f0', boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>
                <table style={{width:'100%', borderCollapse:'collapse', background:'white'}}>
                    <thead style={{background:'#f8fafc', borderBottom:'1px solid #e2e8f0'}}>
                        <tr>
                            <th style={s.th}>Nombre</th>
                            <th style={s.th}>Categoría</th>
                            <th style={s.th}>Precio</th>
                            <th style={s.th}>Stock</th>
                            <th style={s.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => (
                            <tr key={p.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                                <td style={s.td}><strong>{p.name}</strong></td>
                                <td style={s.td}><span style={s.catBadge}>{p.category}</span></td>
                                <td style={s.td}>${Number(p.price).toLocaleString()}</td>
                                <td style={{...s.td, fontWeight:'bold', color: p.stock < 5 ? '#ef4444' : '#16a34a'}}>{p.stock}</td>
                                <td style={s.td}>
                                    <button onClick={()=>handleEdit(p)} style={s.actionBtn} title="Editar">✏️</button>
                                    <button onClick={()=>handleDelete(p.id)} style={{...s.actionBtn, color:'#ef4444', background:'#fef2f2'}} title="Borrar">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const s = {
    form: { background:'white', padding:'30px', borderRadius:'12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display:'grid', gap:'20px', gridTemplateColumns:'repeat(2, 1fr)', marginBottom:'30px' },
    input: { padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize:'14px', width:'100%', boxSizing:'border-box', color: '#1f2937', background: '#ffffff' },
    
    // Estilos de la mini calculadora
    calcContainer: { display:'flex', alignItems:'center', gap:'5px', background:'#f8fafc', padding:'5px', borderRadius:'6px', border:'1px solid #e2e8f0' },
    miniInput: { padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize:'13px', width:'70px', textAlign:'center', color:'#1f2937', background:'white' },
    miniBtn: { padding: '5px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight:'bold' },

    label: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '6px', display:'block', textTransform:'uppercase' },
    btn: { padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight:'bold', fontSize:'14px' },
    btnCancel: { padding: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight:'bold', fontSize:'14px' },
    
    th: { padding: '15px', textAlign: 'left', color:'#475569', fontSize:'12px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.05em' },
    td: { padding: '15px', color:'#334155', fontSize:'14px' },
    actionBtn: { padding:'8px 12px', border:'none', borderRadius:'4px', cursor:'pointer', background:'#f1f5f9', marginRight:'8px', fontSize:'16px' },
    catBadge: { background:'#f1f5f9', padding:'4px 10px', borderRadius:'999px', fontSize:'11px', color:'#475569', fontWeight:'600' }
};