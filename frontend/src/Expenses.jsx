import React, { useEffect, useState } from "react";

export default function Expenses() {
    const [view, setView] = useState("list");
    const [selectedTech, setSelectedTech] = useState(null);
    
    // Datos
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({ assigned: 0, spent: 0, balance: 0 });
    const [techOverview, setTechOverview] = useState([]);
    const [users, setUsers] = useState([]);

    // Formulario Rendición
    const [desc, setDesc] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); 
    const [file, setFile] = useState(null);

    // Formulario Admin (Mejorado)
    const [fundUser, setFundUser] = useState("");
    const [fundAmount, setFundAmount] = useState("");
    const [fundAction, setFundAction] = useState("add"); // 'add', 'subtract', 'set'

    const getToken = () => localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const isAdmin = role === "admin";

    useEffect(() => {
        if (isAdmin) {
            fetchAdminOverview();
            fetchUsers();
        } else {
            fetchMyData();
        }
    }, []);

    const fetchMyData = async () => {
        const headers = { Authorization: `Bearer ${getToken()}` };
        const resExp = await fetch("https://sevenelectricmanage.onrender.com/expenses", { headers });
        const resSum = await fetch("https://sevenelectricmanage.onrender.com/finance/summary", { headers });
        if (resExp.ok) setExpenses(await resExp.json());
        if (resSum.ok) setSummary(await resSum.json());
    };

    const fetchAdminOverview = async () => {
        const headers = { Authorization: `Bearer ${getToken()}` };
        const res = await fetch("https://sevenelectricmanage.onrender.com/finance/admin-overview", { headers });
        if (res.ok) setTechOverview(await res.json());
    };

    const fetchUsers = async () => {
        const res = await fetch("https://sevenelectricmanage.onrender.com/users", { headers: { Authorization: `Bearer ${getToken()}` } });
        if (res.ok) setUsers(await res.json());
    };

    const fetchTechDetail = async (userId, username) => {
        const headers = { Authorization: `Bearer ${getToken()}` };
        const res = await fetch(`https://sevenelectricmanage.onrender.com/expenses?user_id=${userId}`, { headers });
        if (res.ok) {
            setExpenses(await res.json());
            setSelectedTech({ id: userId, name: username });
            setView("detail");
        }
    };

    // --- LÓGICA DE GASTOS ---
    const handleSubmitExpense = async (e) => {
        e.preventDefault();
        if (amount <= 0) return alert("Monto positivo requerido");
        
        // Validaciones fecha
        const selectedDate = new Date(date);
        const minDate = new Date('2017-01-01');
        const now = new Date();
        if (selectedDate > now) return alert("No puedes poner fechas futuras");
        if (selectedDate < minDate) return alert("Fecha demasiado antigua (mínimo 2017)");

        const formData = new FormData();
        formData.append("description", desc);
        formData.append("amount", amount);
        formData.append("date", date);
        if (file) formData.append("receipt", file);

        try {
            const res = await fetch("https://sevenelectricmanage.onrender.com/expenses", {
                method: "POST",
                headers: { Authorization: `Bearer ${getToken()}` },
                body: formData
            });
            if (res.ok) {
                alert("Rendición enviada");
                setDesc(""); setAmount(""); setFile(null);
                if(isAdmin && view === 'detail') fetchTechDetail(selectedTech.id, selectedTech.name);
                else fetchMyData();
            }
        } catch (err) { alert("Error de red"); }
    };

    // --- LÓGICA DE FONDOS INTELIGENTE ---
    const handleFundOperation = async (e) => {
    e.preventDefault();
    if (!fundUser || !fundAmount) return alert("Complete los campos");
    
    // 1. Convertir lo que escribió el usuario a número
    let inputAmount = parseFloat(fundAmount);

    // 2. VALIDACIÓN DE SEGURIDAD: Impedir números negativos en el input
    if (inputAmount <= 0) {
        return alert("Por favor ingrese un monto mayor a 0. Use el botón 'Restar' para descontar.");
    }

    // 3. LÓGICA MATEMÁTICA (Aquí ocurre la magia)
    let finalAmount = inputAmount; 
    const targetTech = techOverview.find(t => String(t.id) === String(fundUser));
    const currentBalance = targetTech ? targetTech.total_assigned : 0;

    if (fundAction === "subtract") {
        // Si eligió restar, el sistema lo vuelve negativo automáticamente
        finalAmount = -Math.abs(inputAmount); 
    } else if (fundAction === "set") {
        // Calcular diferencia
        finalAmount = inputAmount - currentBalance;
        if (finalAmount === 0) return alert("El usuario ya tiene ese monto exacto.");
    }

    // 4. Enviar al Backend (El backend debe aceptar negativos para que esto funcione)
    try {
        const res = await fetch("https://sevenelectricmanage.onrender.com/finance/funds", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ target_user_id: fundUser, amount: finalAmount })
        });

        if (res.ok) {
            alert("Operación realizada con éxito");
            setFundAmount("");
            fetchAdminOverview(); 
        } else {
            const err = await res.json();
            alert("Error: " + (err.error || "No se pudo procesar"));
        }
    } catch (error) {
        alert("Error de conexión");
    }
    };

    const handleStatus = async (id, status) => {
        await fetch(`https://sevenelectricmanage.onrender.com/expenses/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ status })
        });
        if (isAdmin && view === 'detail') fetchTechDetail(selectedTech.id, selectedTech.name);
        else fetchMyData();
    };

    // Agrupar por fechas
    const groupedExpenses = expenses.reduce((groups, expense) => {
        const d = expense.expense_date;
        if (!groups[d]) groups[d] = [];
        groups[d].push(expense);
        return groups;
    }, {});
    const sortedDates = Object.keys(groupedExpenses).sort((a, b) => new Date(b) - new Date(a));

    // --- OBTENER INFO DEL USUARIO SELECCIONADO EN EL DROPDOWN ---
    const selectedUserBalance = techOverview.find(t => String(t.id) === String(fundUser));

    // VISTA ADMIN PRINCIPAL
    if (isAdmin && view === "list") {
        return (
            <div style={styles.container}>
                <h2>Gestión Financiera (Admin)</h2>
                
                {/* PANEL DE OPERACIONES */}
                <div style={styles.adminPanel}>
                    <h3 style={{color:'#1e40af', margin:'0 0 15px 0'}}>💰 Gestión de Fondos</h3>
                    
                    <form onSubmit={handleFundOperation} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                            <select style={{...styles.input, flex:2}} value={fundUser} onChange={e=>setFundUser(e.target.value)} required>
                                <option value="">Seleccionar Técnico...</option>
                                {techOverview.map(u => (
                                    <option key={u.id} value={u.id}>{u.username}</option>
                                ))}
                            </select>
                            
                            {/* Visualizador de Saldo Actual (Contexto) */}
                            {selectedUserBalance && (
                                <div style={{background:'white', padding:'8px 12px', borderRadius:'6px', fontSize:'14px', border:'1px solid #bfdbfe', color:'#1e40af'}}>
                                    Saldo actual: <strong>${selectedUserBalance.balance.toLocaleString()}</strong>
                                </div>
                            )}
                        </div>

                        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                            <input 
                            style={styles.input} 
                            type="number" 
                            min="0" // Ayuda visual
                            placeholder="Monto (Positivo)" 
                            value={fundAmount} 
                            onChange={e => setFundAmount(e.target.value)} 
                            // Esto BLOQUEA que escriban signos menos, más o la letra 'e'
                            onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()}
                            required
                            />
                            
                            {/* Botones de Acción */}
                            <div style={{display:'flex', gap:'5px'}}>
                                <button 
                                    type="button" 
                                    onClick={() => setFundAction("add")}
                                    style={fundAction === "add" ? styles.actionBtnActive : styles.actionBtn}
                                    title="Sumar al saldo actual"
                                >
                                    ➕ Abonar
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setFundAction("subtract")}
                                    style={fundAction === "subtract" ? styles.actionBtnActive : styles.actionBtn}
                                    title="Restar del saldo actual"
                                >
                                    ➖ Restar
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setFundAction("set")}
                                    style={fundAction === "set" ? styles.actionBtnActive : styles.actionBtn}
                                    title="Fijar este monto exacto"
                                >
                                    ✏️ Fijar
                                </button>
                            </div>

                            <button type="submit" style={{...styles.btn, background:'#1e40af', minWidth:'100px'}}>
                                {fundAction === 'add' ? 'Abonar' : fundAction === 'subtract' ? 'Descontar' : 'Fijar'}
                            </button>
                        </div>
                        
                        <p style={{margin:0, fontSize:'12px', color:'#555'}}>
                            {fundAction === 'add' && "Se sumará este monto a la billetera del técnico."}
                            {fundAction === 'subtract' && "Se descontará este monto de la billetera."}
                            {fundAction === 'set' && "El saldo asignado del técnico pasará a ser exactamente este monto (se calculará la diferencia)."}
                        </p>
                    </form>
                </div>

                {/* TARJETAS DE TÉCNICOS (TEXTO OSCURO PARA QUE SE VEA) */}
                <h3>Saldos por Técnico</h3>
                <div style={{display:'grid', gap:'10px', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))'}}>
                    {techOverview.map(tech => (
                        <div key={tech.id} style={styles.techCard} onClick={() => fetchTechDetail(tech.id, tech.username)}>
                            <div style={{fontSize:'1.2rem', fontWeight:'bold', color:'#333'}}>{tech.username}</div>
                            <hr style={{borderColor:'#eee', margin:'10px 0'}}/>
                            <div style={{display:'flex', justifyContent:'space-between', color:'#555'}}>
                                <span>Asignado:</span> <span>${tech.total_assigned.toLocaleString()}</span>
                            </div>
                            <div style={{display:'flex', justifyContent:'space-between', color:'#ef4444'}}>
                                <span>Gastado:</span> <span>-${tech.total_spent.toLocaleString()}</span>
                            </div>
                            <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold', marginTop:'5px', color: tech.balance >= 0 ? '#10b981' : '#ef4444', fontSize:'1.1rem'}}>
                                <span>Saldo:</span> <span>${tech.balance.toLocaleString()}</span>
                            </div>
                            <div style={{textAlign:'center', marginTop:'10px', color:'#2563eb', fontSize:'0.9rem', fontWeight:'bold'}}>
                                Ver Detalle →
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // VISTA DETALLE Y TÉCNICO (Mismo código de antes, solo aseguro estilos)
    return (
        <div style={styles.container}>
            {isAdmin && (
                <button onClick={() => setView("list")} style={{marginBottom:'20px', background:'transparent', border:'none', color:'#666', cursor:'pointer', fontSize:'16px'}}>
                    ← Volver al Resumen
                </button>
            )}

            <div style={styles.balanceCard}>
                <div>
                    <h2 style={{margin:0}}>{isAdmin ? `Billetera de: ${selectedTech?.name}` : "Mi Billetera"}</h2>
                    <p style={{margin:0, opacity:0.8}}>Rendición de Gastos</p>
                </div>
                {!isAdmin && (
                    <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'14px'}}>Saldo Disponible</div>
                        <div style={{fontSize:'32px', fontWeight:'bold'}}>${summary.balance.toLocaleString()}</div>
                    </div>
                )}
            </div>

            {!isAdmin && (
                <div style={styles.card}>
                    <h3>Nueva Rendición</h3>
                    <form onSubmit={handleSubmitExpense} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                        <input style={styles.input} placeholder="Descripción" value={desc} onChange={e=>setDesc(e.target.value)} required />
                        <div style={{display:'flex', gap:'10px'}}>
                            <input style={styles.input} type="number" placeholder="Monto" value={amount} onChange={e=>setAmount(e.target.value)} required />
                            <input style={styles.dateInput} type="date" value={date} max={new Date().toISOString().split("T")[0]} min="2017-01-01" onChange={e=>setDate(e.target.value)} required />
                        </div>
                        <input type="file" accept="image/*" onChange={e=>setFile(e.target.files[0])} style={{marginTop:'5px'}}/>
                        <button type="submit" style={styles.btn}>Rendir Gasto</button>
                    </form>
                </div>
            )}

            <h3>Historial de Rendiciones</h3>
            {sortedDates.length === 0 && <p style={{color:'#888'}}>No hay movimientos.</p>}

            {sortedDates.map(date => (
                <div key={date} style={{marginBottom:'25px'}}>
                    <div style={{background:'#e5e7eb', padding:'8px 15px', borderRadius:'6px', fontWeight:'bold', color:'#445064ff', marginBottom:'10px'}}>
                        📅 {new Date(date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div style={{display:'grid', gap:'10px'}}>
                        {groupedExpenses[date].map(exp => (
                            <div key={exp.id} style={{...styles.card, borderLeft: `5px solid ${getStatusColor(exp.status)}`, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div>
                                    <div style={{fontWeight:'bold', fontSize:'1.1rem', color:'#333'}}>{exp.description}</div>
                                    {exp.receipt_url && <a href={`https://sevenelectricmanage.onrender.com${exp.receipt_url}`} target="_blank" rel="noreferrer" style={{fontSize:'12px', color:'#2563eb'}}>Ver Boleta 📎</a>}
                                </div>
                                <div style={{textAlign:'right'}}>
                                    <div style={{fontSize:'1.2rem', fontWeight:'bold', color:'#333'}}>${exp.amount.toLocaleString()}</div>
                                    <span style={{...styles.badge, background: getStatusColor(exp.status)}}>{exp.status}</span>
                                    {isAdmin && exp.status === 'pendiente' && (
                                        <div style={{marginTop:'5px', display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                                            <button onClick={()=>handleStatus(exp.id, 'aprobado')} style={{...styles.miniBtn, background:'#10b981'}}>Apr</button>
                                            <button onClick={()=>handleStatus(exp.id, 'rechazado')} style={{...styles.miniBtn, background:'#ef4444'}}>Rech</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

const getStatusColor = s => s==='aprobado'?'#10b981':s==='rechazado'?'#ef4444':'#f59e0b';

const styles = {
    container: { 
        maxWidth: "800px", 
        margin: "20px auto", 
        padding: "20px", 
        fontFamily: "Arial, sans-serif", 
        color: "#0f172a",              // texto oscuro para buen contraste sobre tarjetas claras
        background: "#f8fafc",         // tarjeta principal clara para separarse del fondo de la app
        borderRadius: "10px",
        boxShadow: "0 6px 18px rgba(2,6,23,0.12)"
    },
    balanceCard: { 
        background: "#0b1220",        // fondo más profundo para destacar la tarjeta de balance
        color: "white", 
        padding: "20px", 
        borderRadius: "12px", 
        display: "flex", 
        justifyContent: "space-between", 
        marginBottom: "20px",
        boxShadow: "0 4px 12px rgba(2,6,23,0.3)"
    },
    adminPanel: { 
        background: "#08306b",        // azul intenso para contraste y legibilidad
        color: "white",
        padding: "20px", 
        borderRadius: "8px", 
        marginBottom: "20px", 
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 4px 12px rgba(3,7,18,0.25)"
    },
    techCard: { 
        background: "white", 
        padding: "15px", 
        borderRadius: "8px", 
        boxShadow: "0 6px 14px rgba(2,6,23,0.06)", 
        cursor: "pointer", 
        border: "1px solid #e6eefc", 
        transition: "transform 0.2s, box-shadow 0.2s"
    },
    card: { 
        background: "white", 
        padding: "15px", 
        borderRadius: "8px", 
        boxShadow: "0 6px 14px rgba(2,6,23,0.06)",
        border: "1px solid #e6eefc"
    },
    input: { 
        padding: "10px", 
        borderRadius: "6px", 
        border: "1px solid #0f172a", // borde oscuro para contraste
        fontSize: "14px", 
        background: 'white',
        color: '#0f172a'
    },
    dateInput: { 
        padding: "10px", 
        borderRadius: "6px", 
        border: "1px solid #0f172a", 
        flex: 1, 
        fontFamily: 'inherit',
        background: 'white',
        color: '#0f172a'
    },
    btn: { 
        padding: "10px", 
        background: "#0b69ff",       // botón principal destacado
        color: "white", 
        border: "none", 
        borderRadius: "6px", 
        cursor: "pointer", 
        fontWeight: "bold",
        boxShadow: "0 6px 12px rgba(11,105,255,0.18)"
    },
    badge: { 
        padding: "2px 8px", 
        borderRadius: "10px", 
        fontSize: "10px", 
        color: "white", 
        textTransform: "uppercase" 
    },
    miniBtn: { 
        padding: "4px 8px", 
        color: "white", 
        border: "none", 
        borderRadius: "4px", 
        cursor: "pointer", 
        fontSize: "11px", 
        fontWeight: "bold" 
    },
    
    // Nuevos botones de acción
    actionBtn: { 
        padding: "8px 12px", 
        border: "1px solid #0b69ff", 
        background: "white", 
        color: "#0b69ff", 
        borderRadius: "4px", 
        cursor: "pointer", 
        fontWeight: "bold", 
        fontSize:"12px",
        boxShadow: "0 4px 10px rgba(11,105,255,0.06)"
    },
    actionBtnActive: { 
        padding: "8px 12px", 
        border: "1px solid #0b69ff", 
        background: "#0b69ff", 
        color: "white", 
        borderRadius: "4px", 
        cursor: "pointer", 
        fontWeight: "bold", 
        fontSize:"12px",
        boxShadow: "0 6px 14px rgba(11,105,255,0.18)"
    }
};