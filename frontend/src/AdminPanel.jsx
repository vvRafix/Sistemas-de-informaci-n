import { useEffect, useState } from "react";

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState("audit"); // 'audit' | 'recycle' | 'users'
    const [logs, setLogs] = useState([]);
    const [deletedItems, setDeletedItems] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Estados para crear/editar usuarios
    const [showUserForm, setShowUserForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // objeto de usuario cuando se edita
    const [userForm, setUserForm] = useState({ username: "", role: "user", password: "" });

    const getToken = () => localStorage.getItem("token") || "";

    // Cargar datos según la pestaña activa
    useEffect(() => {
        if (activeTab === "audit") fetchAuditLogs();
        if (activeTab === "recycle") fetchRecycleBin();
        if (activeTab === "users") fetchUsers();
    }, [activeTab]);

    // AUDITORÍA
    const fetchAuditLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:3000/audit-logs", {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) setLogs(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // PAPELERA
    const fetchRecycleBin = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:3000/recycle-bin", {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) setDeletedItems(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id) => {
        if (!confirm("¿Restaurar este reporte?")) return;
        try {
            const res = await fetch(`http://localhost:3000/recycle-bin/restore/${id}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) {
                alert("Restaurado con éxito");
                fetchRecycleBin();
            } else {
                alert("Error al restaurar");
            }
        } catch (err) {
            alert("Error al restaurar");
        }
    };

    // USUARIOS (ADMIN)
    // Nota: ajustar endpoints si su server.js usa otras rutas (por ejemplo '/users' en vez de '/admin/users')
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:3000/users", {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) {
                setUsers(await res.json());
            } else {
                console.error("Error fetching users", res.status);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateUserForm = () => {
        setEditingUser(null);
        setUserForm({ username: "", role: "user", password: "" });
        setShowUserForm(true);
    };

    const openEditUserForm = (user) => {
        setEditingUser(user);
        setUserForm({ username: user.username || "", role: user.role || "user", password: "" });
        setShowUserForm(true);
    };

    const handleUserFormChange = (e) => {
        const { name, value } = e.target;
        setUserForm((s) => ({ ...s, [name]: value }));
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        // Validaciones simples
        if (!userForm.username || (!editingUser && !userForm.password)) {
            alert("Completar username y password (para nuevo usuario).");
            return;
        }

        try {
            const url = editingUser
                ? `http://localhost:3000/users/${editingUser.id}`
                : `http://localhost:3000/users`;
            const method = editingUser ? "PUT" : "POST";

            const payload = { username: userForm.username, role: userForm.role };
            if (!editingUser && userForm.password) payload.password = userForm.password;
            // For edit, only include password if provided
            if (editingUser && userForm.password) payload.password = userForm.password;

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(editingUser ? "Usuario actualizado" : "Usuario creado");
                setShowUserForm(false);
                setEditingUser(null);
                setUserForm({ username: "", role: "user", password: "" });
                fetchUsers();
            } else {
                const text = await res.text();
                console.error("Error saving user", res.status, text);
                alert("Error al guardar usuario");
            }
        } catch (err) {
            console.error(err);
            alert("Error al guardar usuario");
        }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm("¿Eliminar este usuario? Esta acción es irreversible.")) return;
        try {
            const res = await fetch(`http://localhost:3000/users/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) {
                alert("Usuario eliminado");
                fetchUsers();
            } else {
                alert("Error al eliminar usuario");
            }
        } catch (err) {
            console.error(err);
            alert("Error al eliminar usuario");
        }
    };

    return (
        <div style={styles.container}>
            <h2>Panel de Administración</h2>

            <div style={styles.tabs}>
                <button
                    style={activeTab === "audit" ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab("audit")}
                >
                    Historial de Acciones
                </button>
                <button
                    style={activeTab === "recycle" ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab("recycle")}
                >
                    Papelera de Reciclaje
                </button>
                <button
                    style={activeTab === "users" ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab("users")}
                >
                    Usuarios
                </button>
            </div>

            <div style={styles.content}>
                {loading && <p>Cargando datos...</p>}

                {/* VISTA DE AUDITORÍA */}
                {activeTab === "audit" && !loading && (
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Fecha</th>
                                <th style={styles.th}>Usuario</th>
                                <th style={styles.th}>Acción</th>
                                <th style={styles.th}>Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td style={styles.td}>{new Date(log.timestamp).toLocaleString()}</td>
                                    <td style={styles.td}>{log.username || "Desconocido"}</td>
                                    <td style={styles.td}>
                                        <span style={getActionStyle(log.action)}>{log.action}</span>
                                    </td>
                                    <td style={styles.td}>{log.details}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && <tr><td colSpan="4" style={styles.td}>Sin registros</td></tr>}
                        </tbody>
                    </table>
                )}

                {/* VISTA DE PAPELERA */}
                {activeTab === "recycle" && !loading && (
                    <div>
                        {deletedItems.length === 0 ? <p>La papelera está vacía.</p> : null}
                        <div style={styles.grid}>
                            {deletedItems.map((item) => {
                                const data = item.data || {};
                                return (
                                    <div key={item.id} style={styles.card}>
                                        <h4>{data.client_name || "Sin Cliente"}</h4>
                                        <p>Borrado por: <strong>{item.deleted_by_user}</strong></p>
                                        <p><small>Fecha: {new Date(item.deleted_at).toLocaleDateString()}</small></p>
                                        <button style={styles.restoreBtn} onClick={() => handleRestore(item.id)}>
                                            ♻️ Restaurar
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* VISTA DE USUARIOS */}
                {activeTab === "users" && !loading && (
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3>Gestionar Usuarios</h3>
                            <div>
                                <button style={styles.newUserBtn} onClick={openCreateUserForm}>+ Nuevo usuario</button>
                                <button style={styles.refreshBtn} onClick={fetchUsers}>Actualizar</button>
                            </div>
                        </div>

                        {showUserForm && (
                            <form onSubmit={handleSaveUser} style={styles.userForm}>
                                <div style={styles.formRow}>
                                    <label style={styles.label}>Usuario</label>
                                    <input name="username" value={userForm.username} onChange={handleUserFormChange} style={styles.input} />
                                </div>
                                <div style={styles.formRow}>
                                    <label style={styles.label}>Rol</label>
                                    <select name="role" value={userForm.role} onChange={handleUserFormChange} style={styles.select}>
                                        <option value="user">Tecnico</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div style={styles.formRow}>
                                    <label style={styles.label}>{editingUser ? "Nueva contraseña (opcional)" : "Password"}</label>
                                    <input name="password" type="password" value={userForm.password} onChange={handleUserFormChange} style={styles.input} />
                                </div>
                                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                    <button type="submit" style={styles.saveBtn}>{editingUser ? "Guardar cambios" : "Crear usuario"}</button>
                                    <button type="button" style={styles.cancelBtn} onClick={() => { setShowUserForm(false); setEditingUser(null); }}>Cancelar</button>
                                </div>
                            </form>
                        )}

                        <table style={{ ...styles.table, marginTop: 20 }}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>ID</th>
                                    <th style={styles.th}>Usuario</th>
                                    <th style={styles.th}>Rol</th>
                                    <th style={styles.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td style={styles.td}>{u.id}</td>
                                        <td style={styles.td}>{u.username}</td>
                                        <td style={styles.td}>{u.role}</td>
                                        <td style={styles.td}>
                                            <button style={styles.smallBtn} onClick={() => openEditUserForm(u)}>Editar</button>
                                            <button style={styles.deleteBtn} onClick={() => handleDeleteUser(u.id)}>Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && <tr><td colSpan="4" style={styles.td}>No hay usuarios</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// Estilos CSS en JS Mejorados (Alto Contraste)
const styles = {
    container: { maxWidth: "1000px", margin: "40px auto", padding: "20px", color: "#5f9de4ff" },

    // Pestañas
    tabs: { display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: "20px" },
    tab: { padding: "12px 24px", border: "none", background: "transparent", cursor: "pointer", fontSize: "16px", color: "#d0d4dbff", fontWeight: "500" },
    activeTab: { padding: "12px 24px", border: "none", background: "transparent", cursor: "pointer", fontSize: "16px", borderBottom: "3px solid #2563eb", fontWeight: "bold", color: "#2563eb" },

    // Contenedor Blanco
    content: { background: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" },

    // Tabla
    table: { width: "100%", borderCollapse: "collapse", marginTop: "10px" },
    th: { textAlign: "left", padding: "12px", backgroundColor: "#f3f4f6", color: "#374151", fontWeight: "bold", borderBottom: "2px solid #e5e7eb", textTransform: "uppercase", fontSize: "0.85rem" },
    td: { padding: "10px 12px", borderBottom: "1px solid #e5e7eb", color: "#374151", fontSize: "0.95rem" },

    // Grilla de Papelera
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" },
    card: { border: "1px solid #e5e7eb", padding: "20px", borderRadius: "8px", background: "#fff", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" },

    // Botón Restaurar
    restoreBtn: { marginTop: "15px", padding: "10px", width: "100%", background: "#10b981", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "background 0.2s" },

    // Usuarios - botones y formulario
    newUserBtn: { padding: "8px 12px", background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", marginRight: 8 },
    refreshBtn: { padding: "8px 12px", background: "#6b7280", color: "white", border: "none", borderRadius: 6, cursor: "pointer" },
    smallBtn: { padding: "6px 10px", marginRight: 8, background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer" },
    deleteBtn: { padding: "6px 10px", background: "#ef4444", color: "white", border: "none", borderRadius: 6, cursor: "pointer" },
    saveBtn: { padding: "8px 14px", background: "#10b981", color: "white", border: "none", borderRadius: 6, cursor: "pointer" },
    cancelBtn: { padding: "8px 14px", background: "#6b7280", color: "white", border: "none", borderRadius: 6, cursor: "pointer" },

    userForm: { border: "1px solid #e5e7eb", padding: 16, borderRadius: 8, marginBottom: 16, background: "#fafafa" },
    formRow: { display: "flex", flexDirection: "column", marginBottom: 10 },
    label: { fontSize: 13, marginBottom: 6, color: "#374151" },
    input: { padding: 8, borderRadius: 6, border: "1px solid #d1d5db" },
    select: { padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }
};

const getActionStyle = (action) => {
    const base = { padding: "4px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" };
    if (action === "CREAR") return { ...base, background: "#dcfce7", color: "#166534" };
    if (action === "EDITAR") return { ...base, background: "#dbeafe", color: "#1e40af" };
    if (action === "BORRAR") return { ...base, background: "#fee2e2", color: "#991b1b" };
    if (action === "RESTAURAR") return { ...base, background: "#fef3c7", color: "#92400e" };
    return { ...base, background: "#f3f4f6", color: "#374151" };
};
