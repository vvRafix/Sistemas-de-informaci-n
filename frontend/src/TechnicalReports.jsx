import React, { useEffect, useState } from "react";

export default function TechnicalReports() {
    const [reports, setReports] = useState([]);
    const [users, setUsers] = useState([]);
    const initialForm = {
        date: new Date().toISOString().split('T')[0],
        client: "", contact: "", tech_name: "", // tech_name almacenará el id del técnico
        arrival: "", departure: "", brand: "", model: "", serial: "",
        battery: "", hour_meter: "", status: "operativo",
        symptoms: "", causes: "", solution: "", parts: "",
        client_notes: "", client_contact: ""
    };
    const [formData, setFormData] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);

    const getToken = () => localStorage.getItem("token");

    useEffect(() => {
        fetchReports();
        fetchUsers();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await fetch("http://localhost:3000/reports", {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) setReports(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch("http://localhost:3000/users", {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) setUsers(await res.json());
        } catch (err) { console.error("Error cargando usuarios", err); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resolveTechName = (techIdOrName) => {
        if (!techIdOrName && techIdOrName !== 0) return "";
        // si techIdOrName es id, buscar usuario; si es nombre, devolverlo
        const found = users.find(u => String(u.id) === String(techIdOrName));
        if (found) return found.username;
        return String(techIdOrName);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingId ? `http://localhost:3000/reports/${editingId}` : "http://localhost:3000/reports";
        const method = editingId ? "PUT" : "POST";

        // Asegurar valores por defecto para evitar nulls en la BD
        const payload = {
    // Las propiedades del payload deben coincidir con data.date, data.client, etc. del backend
    date: formData.date,
    client: formData.client,
    contact: formData.contact,
    tech_name: resolveTechName(formData.tech_name),
    arrival: formData.arrival, // <-- Antes era arrival_time
    departure: formData.departure, // <-- Antes era departure_time
    brand: formData.brand, // <-- Antes era equipment_brand
    model: formData.model,
    serial: formData.serial, // <-- Antes era serial_number
    battery: formData.battery, // <-- Antes era battery_info
    hour_meter: formData.hour_meter,
    status: formData.status, // <-- Antes era machine_status
    symptoms: formData.symptoms,
    causes: formData.causes,
    solution: formData.solution,
    parts: formData.parts, // <-- Antes era parts_used
    client_notes: formData.client_notes,
    client_contact: formData.client_contact // <-- Antes era client_contact_info
};

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify(payload)
            });

            const text = await res.text();
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }

            if (res.ok) {
                alert(editingId ? "Informe Actualizado" : "Informe Creado");
                setEditingId(null);
                setFormData(initialForm); // reset completo a valores por defecto
                fetchReports();
            } else {
                const errMsg = (data && (data.error || data.message)) ? (data.error || data.message) : (text || res.statusText || 'Error desconocido');
                alert("Error: " + errMsg);
            }
        } 
        
        catch (err) {
            console.error("Fetch error:", err);
            alert("Error de conexión.");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Borrar informe?")) return;
        const res = await fetch(`http://localhost:3000/reports/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (res.ok) fetchReports();
    };

    const handleEdit = (report) => {
        // tratar de usar technician_id si está disponible; si no usar technician_name
        const techValue = report.technician_id ?? (users.find(u => u.username === report.technician_name)?.id ?? report.technician_name ?? "");
        setEditingId(report.id);
        setFormData({
            date: report.report_date || initialForm.date,
            client: report.client_name || "",
            contact: report.contact_name || "",
            tech_name: techValue,
            arrival: report.arrival_time || "",
            departure: report.departure_time || "",
            brand: report.equipment_brand || "",
            model: report.model || "",
            erial: report.serial_number || "",
            battery: report.battery_info || "",
            hour_meter: report.hour_meter || "",
            status: report.machine_status || "operativo",
            symptoms: report.symptoms || "",
            causes: report.causes || "",
            solution: report.solution || "",
            parts: report.parts_used || "",
            client_notes: report.client_notes || "",
            client_contact: report.client_contact_info || ""
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- GENERADOR DE PDF (igual) ---
    const handlePrint = (report) => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html>
            <head>
                <title>Informe Técnico Nº ${report.id}</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #000; font-size: 11px; padding: 10mm; }
                    .container { border: 2px solid #4ade80; padding: 15px; box-sizing: border-box; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #4ade80; padding-bottom: 10px; margin-bottom: 10px; }
                    .brand { color: #1e3a8a; font-size: 20px; font-weight: bold; }
                    .folio { color: #059669; font-size: 18px; font-weight: bold; }
                    .grid-box { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; border: 1px solid #ccc; padding: 5px; margin-bottom: 10px; }
                    .row { display: flex; border-bottom: 1px solid #eee; padding: 2px 0; }
                    .label { font-weight: bold; width: 120px; }
                    .section-title { font-weight: bold; margin-top: 10px; border-bottom: 1px dashed #ccc; }
                    .text-box { border: 1px solid #ccc; padding: 6px; min-height: 60px; margin-bottom: 5px; white-space: pre-wrap; word-break: break-word; }
                    .split-box { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="brand">SEVEN ELECTRIC</div>
                        <div class="folio">FOLIO Nº ${String(report.id).padStart(5, '0')}</div>
                    </div>
                    <div style="text-align:center; font-weight:bold; margin-bottom:5px;">Informe Técnico Seven Electric SpA</div>
                    <div class="grid-box">
                        <div>
                            <div class="row"><span class="label">Fecha:</span> <span class="value">${report.report_date || ''}</span></div>
                            <div class="row"><span class="label">Cliente:</span> <span class="value">${report.client_name || ''}</span></div>
                            <div class="row"><span class="label">Contacto:</span> <span class="value">${report.contact_name || ''}</span></div>
                            <div class="row"><span class="label">Técnico:</span> <span class="value">${report.technician_name || ''}</span></div>
                        </div>
                        <div>
                            <div class="row"><span class="label">Equipo:</span> <span class="value">${report.equipment_brand || ''} ${report.model || ''}</span></div>
                            <div class="row"><span class="label">Serie:</span> <span class="value">${report.serial_number || ''}</span></div>
                            <div class="row"><span class="label">Batería:</span> <span class="value">${report.battery_info || ''}</span></div>
                            <div class="row"><span class="label">Horómetro:</span> <span class="value">${report.hour_meter || ''}</span></div>
                            <div class="row"><span class="label">Estado:</span> <span class="value" style="text-transform:uppercase; font-weight:bold;">${report.machine_status || ''}</span></div>
                        </div>
                    </div>
                    <div class="section-title">SÍNTOMAS / OBSERVACIONES:</div><div class="text-box">${report.symptoms || ''}</div>
                    <div class="section-title">CAUSAL, DAÑOS, FALLAS:</div><div class="text-box">${report.causes || ''}</div>
                    <div class="section-title">SOLUCIÓN, RECOMENDACIONES:</div><div class="text-box">${report.solution || ''}</div>
                    <div class="split-box">
                        <div><div class="section-title">REPUESTOS UTILIZADOS:</div><div class="text-box" style="height:80px;">${report.parts_used || ''}</div></div>
                        <div><div class="section-title">OBSERVACIONES DE CLIENTE:</div><div class="text-box" style="height:80px;">${report.client_notes || ''}</div></div>
                    </div>
                    <div style="margin-top:30px;"><b>Contacto Cliente:</b><br/>${report.client_contact_info || ''}</div>
                </div>
                <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
            </body>
            </html>
        `);
        win.document.close();
    };

    return (
        <div style={s.container}>
            <h2 style={{ textAlign: 'center', color: '#8bbcffff' }}>Redactar Informe Técnico</h2>

            <form onSubmit={handleSubmit} style={s.form}>
                <h4 style={s.sectionTitle}>Datos Generales</h4>

                <div style={s.grid3}>
                    <div style={{ gridColumn: 'span 3' }}>
                        <label style={s.label}>Fecha</label>
                        <input name="date" type="date" value={formData.date} onChange={handleChange} style={s.input} required />
                    </div>
                </div>

                <div style={s.grid2}>
                    <input name="client" placeholder="Cliente" value={formData.client} onChange={handleChange} style={s.input} required />
                    <input name="contact" placeholder="Contacto en sitio" value={formData.contact} onChange={handleChange} style={s.input} />

                    <select name="tech_name" value={formData.tech_name} onChange={handleChange} style={s.select} required>
                        <option value="">-- Técnico a cargo --</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.username}</option>
                        ))}
                    </select>

                    <input name="client_contact" placeholder="Email/Teléfono Cliente" value={formData.client_contact} onChange={handleChange} style={s.input} />
                </div>

                <h4 style={s.sectionTitle}>Datos del Equipo</h4>
                <div style={s.grid3}>
                    <input name="brand" placeholder="Marca" value={formData.brand} onChange={handleChange} style={s.input} required />
                    <input name="model" placeholder="Modelo" value={formData.model} onChange={handleChange} style={s.input} />
                    <input name="serial" placeholder="Nº Serie" value={formData.serial} onChange={handleChange} style={s.input} required />
                    <input name="battery" placeholder="Batería" value={formData.battery} onChange={handleChange} style={s.input} />
                    <input name="hour_meter" placeholder="Horómetro" value={formData.hour_meter} onChange={handleChange} style={s.input} />
                    <select name="status" value={formData.status} onChange={handleChange} style={s.select}>
                        <option value="operativo">Operativo</option>
                        <option value="detenido">Detenido</option>
                    </select>
                </div>

                <h4 style={s.sectionTitle}>Diagnóstico y Solución</h4>
                <textarea name="symptoms" placeholder="Síntomas / Observaciones" value={formData.symptoms} onChange={handleChange} style={s.textarea} />
                <textarea name="causes" placeholder="Causas / Fallas" value={formData.causes} onChange={handleChange} style={s.textarea} />
                <textarea name="solution" placeholder="Solución / Recomendaciones" value={formData.solution} onChange={handleChange} style={s.textarea} />

                <div style={s.grid2}>
                    <textarea name="parts" placeholder="Repuestos Utilizados" value={formData.parts} onChange={handleChange} style={s.textareaSmall} />
                    <textarea name="client_notes" placeholder="Observaciones del Cliente" value={formData.client_notes} onChange={handleChange} style={s.textareaSmall} />
                </div>

                <button type="submit" style={s.btnMain}>{editingId ? "Actualizar Informe" : "Guardar Informe"}</button>
                {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} style={s.btnSec}>Cancelar</button>}
            </form>

            <h3 style={{ color: '#1f2937', marginTop: '40px' }}>Historial de Informes</h3>
            <div style={s.list}>
                {reports.map(r => (
                    <div key={r.id} style={s.card}>
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '16px' }}>{r.client_name} - {r.equipment_brand}</div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>Serie: {r.serial_number} | Fecha: {r.report_date}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handlePrint(r)} style={s.btnPrint}>🖨️ PDF</button>
                            <button onClick={() => handleEdit(r)} style={s.btnEdit}>✏️</button>
                            <button onClick={() => handleDelete(r.id)} style={s.btnDelete}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const s = {
    container: { maxWidth: '800px', margin: '20px auto', fontFamily: 'Arial, sans-serif' },
    form: { background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
    sectionTitle: { margin: '25px 0 15px 0', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', fontSize: '16px', fontWeight: 'bold' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' },

    label: { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#4b5563' },

    input: { padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', fontSize: '14px', backgroundColor: '#ffffff', color: '#1f2937' },
    select: { padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', fontSize: '14px', backgroundColor: '#ffffff', color: '#1f2937' },
    textarea: { width: '100%', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '15px', fontFamily: 'inherit', backgroundColor: '#ffffff', color: '#1f2937', resize: 'vertical' },
    textareaSmall: { width: '100%', height: '100px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit', backgroundColor: '#ffffff', color: '#1f2937', resize: 'vertical' },

    btnMain: { width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' },
    btnSec: { width: '100%', padding: '10px', background: '#94a3b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' },
    list: { display: 'grid', gap: '15px' },
    card: { background: 'white', padding: '20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '5px solid #2563eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    btnPrint: { padding: '8px 15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
    btnEdit: { padding: '8px 12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
    btnDelete: { padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }
};