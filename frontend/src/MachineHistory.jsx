import React, { useState } from 'react';

export default function MachineHistory() {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const getToken = () => localStorage.getItem('token');

    // --- FUNCIÓN DE IMPRESIÓN OFICIAL (Copiada del Formulario Técnico) ---
    const handlePrint = (report) => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html>
            <head>
                <title>Informe Técnico Nº ${report.id}</title>
                <style>
                    /* ELIMINAR ARTEFACTOS DEL NAVEGADOR */
                    @page { size: A4; margin: 0; } 
                    body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #000; font-size: 11px; padding: 10mm; }

                    .container { border: 2px solid #4ade80; padding: 15px; box-sizing: border-box; }
                    .header-table { width: 100%; border-bottom: 2px solid #4ade80; margin-bottom: 15px; padding-bottom: 10px; }
                    .brand { color: #1e3a8a; font-size: 22px; font-weight: bold; }
                    .folio { color: #059669; font-size: 16px; font-weight: bold; text-align: right; }
                    
                    .grid-box { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; border: 1px solid #ccc; padding: 5px; margin-bottom: 10px; }
                    .row { display: flex; border-bottom: 1px solid #eee; padding: 2px 0; }
                    .label { font-weight: bold; width: 120px; }
                    
                    .section-title { font-weight: bold; margin-top: 10px; border-bottom: 1px dashed #ccc; }
                    .text-box { 
                        border: 1px solid #ccc; 
                        padding: 6px; 
                        min-height: 60px; 
                        margin-bottom: 5px; 
                        white-space: pre-wrap; 
                        word-break: break-word; /* FIX CRÍTICO PARA EL TEXTO SIN ESPACIOS */
                    }
                    
                    .split-box { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <table class="header-table">
                        <tr>
                            <td class="brand">SEVEN ELECTRIC</td>
                            <td class="folio">FOLIO Nº ${String(report.id).padStart(5, '0')}</td>
                        </tr>
                    </table>
                    <div style="text-align:center; font-weight:bold; margin-bottom:5px;">Informe Técnico Seven Electric SpA</div>
                    
                    <div class="grid-box">
                        <div>
                            <div class="row"><span class="label">Fecha:</span> <span class="value">${report.report_date}</span></div>
                            <div class="row"><span class="label">Cliente:</span> <span class="value">${report.client_name}</span></div>
                            <div class="row"><span class="label">Contacto:</span> <span class="value">${report.contact_name}</span></div>
                            <div class="row"><span class="label">Técnico:</span> <span class="value">${report.technician_name}</span></div>
                        </div>
                        <div>
                            <div class="row"><span class="label">Equipo:</span> <span class="value">${report.equipment_brand} ${report.model}</span></div>
                            <div class="row"><span class="label">Serie:</span> <span class="value">${report.serial_number}</span></div>
                            <div class="row"><span class="label">Horómetro:</span> <span class="value">${report.hour_meter}</span></div>
                            <div class="row"><span class="label">Estado:</span> <span class="value">${report.machine_status}</span></div>
                        </div>
                    </div>

                    <div class="section-title">SÍNTOMAS / OBSERVACIONES:</div><div class="text-box">${report.symptoms}</div>
                    <div class="section-title">CAUSAL / DAÑOS / FALLAS:</div><div class="text-box">${report.causes}</div>
                    <div class="section-title">SOLUCIÓN / RECOMENDACIONES:</div><div class="text-box">${report.solution}</div>
                    
                    <div class="split-box">
                        <div><div class="section-title">REPUESTOS UTILIZADOS:</div><div class="text-box" style="height:80px;">${report.parts_used}</div></div>
                        <div><div class="section-title">OBSERVACIONES DE CLIENTE:</div><div class="text-box" style="height:80px;">${report.client_notes}</div></div>
                    </div>
                    <div style="margin-top:30px;"><b>Contacto Cliente:</b><br/>${report.client_contact_info}</div>
                </div>
                <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
            </body>
            </html>
        `);
        win.document.close();
    };

    // --- LÓGICA DE BÚSQUEDA ---
    const handleSearchChange = async (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (value.length > 1) {
            try {
                // Llama al backend (que ahora busca por Cliente, Técnico y Serie)
                const res = await fetch(`http://localhost:3000/machines/suggestions?q=${value}`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data);
                    setShowSuggestions(true);
                }
            } catch (err) {
                console.error(err);
            }
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    // Seleccionar sugerencia y buscar historial
    const selectSuggestion = (suggestion) => {
        setSearchTerm(suggestion.serial_number);
        setShowSuggestions(false);
        fetchHistory(suggestion.serial_number);
    };

    const fetchHistory = async (serial) => {
        setLoading(true);
        setHistory([]);
        try {
            const res = await fetch(`http://localhost:3000/history/${serial}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (err) {
            alert("Error al buscar historial");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.container}>
            <h2 style={{color: '#89b8ffff', textAlign: 'center', marginBottom: '20px'}}>Historial de Máquinas</h2>
            
            {/* Buscador Autocompletado */}
            <div style={s.searchWrapper}>
                <input 
                    type="text" 
                    placeholder="Buscar por Serie, Cliente o Técnico..." // Placeholder mejorado
                    value={searchTerm}
                    onChange={handleSearchChange}
                    style={s.input}
                />
                {/* Lista desplegable de sugerencias (Ahora con más contexto) */}
                {showSuggestions && suggestions.length > 0 && (
                    <ul style={s.suggestionsList}>
                        {suggestions.map((item, idx) => (
                            <li 
                                key={idx} 
                                style={s.suggestionItem}
                                onClick={() => selectSuggestion(item)} // Pasamos el objeto completo
                            >
                                <strong>Serie:</strong> {item.serial_number} | 
                                Cliente: {item.client_name} | 
                                Téc.: {item.technician_name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div style={s.results}>
                {loading && <p style={{color: 'white'}}>Cargando...</p>}
                
                {history.length > 0 ? (
                    <div style={s.timeline}>
                        {history.map((report) => (
                            <div key={report.id} style={s.card}>
                                <div style={s.cardHeader}>
                                    <span style={{color:'#60a5fa', fontWeight:'bold'}}>INFORME #{report.id} | Fecha: {new Date(report.report_date).toLocaleDateString()}</span>
                                    <span style={s.techBadge}>Técnico: {report.technician_name}</span>
                                </div>
                                
                                <div style={s.detailsGrid}>
                                    <p><strong>Cliente:</strong> {report.client_name}</p>
                                    <p><strong>Marca/Modelo:</strong> {report.equipment_brand} / {report.model}</p>
                                    <p><strong>Horómetro:</strong> {report.hour_meter}</p>
                                    <p><strong>Batería:</strong> {report.battery_info}</p>
                                </div>

                                <h4 style={s.h4}>DIAGNÓSTICO</h4>
                                <p style={s.summary}>
                                    <strong>Síntomas:</strong> {report.symptoms}<br/>
                                    <strong>Causales:</strong> {report.causes}
                                </p>
                                
                                <h4 style={s.h4}>TRABAJO REALIZADO</h4>
                                <p style={s.summary}>
                                    <strong>Solución:</strong> {report.solution}<br/>
                                    <strong>Repuestos:</strong> {report.parts_used || 'Ninguno'}
                                </p>
                                
                                <button onClick={() => handlePrint(report)} style={s.btnViewPdf}>Ver Informe Oficial 📄</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    searchTerm && !loading && <p style={{color: '#aaa', textAlign:'center'}}>No se encontró historial para la serie "{searchTerm}".</p>
                )}
            </div>
        </div>
    );
}

const s = {
    container: { maxWidth: '800px', margin: '40px auto', fontFamily: 'Arial, sans-serif' },
    searchWrapper: { position: 'relative', marginBottom: '30px' },
    input: { width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #4b5563', background: '#1f2937', color: 'white', fontSize: '16px', outline: 'none' },
    suggestionsList: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#374151', listStyle: 'none', padding: 0, margin: '5px 0', borderRadius: '8px', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
    suggestionItem: { padding: '12px', color: 'white', cursor: 'pointer', borderBottom: '1px solid #4b5563' },
    results: { marginTop: '20px' },
    timeline: { display: 'flex', flexDirection: 'column', gap: '25px' },
    card: { background: '#1f2937', padding: '25px', borderRadius: '12px', borderLeft: '4px solid #3b82f6', color: 'white' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '1rem', color: '#9ca3af', borderBottom: '1px solid #374151', paddingBottom: '10px' },
    techBadge: { background: '#374151', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#fff' },
    detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px', fontSize: '0.9rem' },
    summary: { fontSize: '0.9rem', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }, // FIX CRÍTICO PARA EL TEXTO SIN ESPACIOS
    h4: { marginTop: '15px', marginBottom: '5px', color: '#60a5fa', fontSize: '1rem', borderBottom: '1px dashed #374151', paddingBottom: '3px' },
    btnViewPdf: { padding: '8px 15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '15px' }
};