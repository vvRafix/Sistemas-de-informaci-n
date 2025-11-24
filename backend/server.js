const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'secreto_super_seguro';

// Configuración Uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, 'uploads/'); },
    filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Error DB:', err.message);
    else {
        console.log('Conectado a SQLite.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Tablas Base
        db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT)`);
        // 2. Reportes Técnicos (AMPLIADA SEGÚN FORMATO DE IMAGEN)
        db.run(`CREATE TABLE IF NOT EXISTS technical_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_date DATE, client_name TEXT, contact_name TEXT, technician_name TEXT, 
            arrival_time TEXT, departure_time TEXT, equipment_brand TEXT, model TEXT, serial_number TEXT, 
            battery_info TEXT, hour_meter TEXT, machine_status TEXT, 
            symptoms TEXT, causes TEXT, solution TEXT, parts_used TEXT, client_notes TEXT, client_contact_info TEXT,
            created_by_user_id INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT, details TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS recycle_bin (id INTEGER PRIMARY KEY AUTOINCREMENT, original_id INTEGER, data_json TEXT, deleted_by INTEGER, deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS funds (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amount REAL, assigned_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, description TEXT, amount REAL, expense_date DATE, status TEXT DEFAULT 'pendiente', receipt_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, price REAL, stock INTEGER, category TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS quotes (id INTEGER PRIMARY KEY AUTOINCREMENT, client_name TEXT, quote_date DATE, validity_days INTEGER, total_amount REAL, status TEXT DEFAULT 'revision', created_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS quote_items (id INTEGER PRIMARY KEY AUTOINCREMENT, quote_id INTEGER, product_id INTEGER, description TEXT, quantity INTEGER, unit_price REAL, total REAL)`);

        // Usuarios default
        db.get("SELECT count(*) as count FROM users", (err, row) => {
            if (row && row.count === 0) {
                const pass = bcrypt.hashSync('Pelot7E123.1', 8);
                const stmt = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
                stmt.run('Luis Felipe', pass, 'admin');
                stmt.run('tecnico', pass, 'tecnico');
                stmt.finalize();
                console.log("Usuarios iniciales creados.");
            }
        });
    });
}

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ message: "Sin token" });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Token inválido" });
        req.user = decoded;
        next();
    });
};

// --- RUTAS ---
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ message: "Credenciales incorrectas" });
        const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: user.role });
    });
});

// ==========================================
// 1. MÓDULO REPORTES TÉCNICOS
// ==========================================
app.get('/reports', verifyToken, (req, res) => {
    let query = `SELECT tr.*, u.username as author_system FROM technical_reports tr LEFT JOIN users u ON tr.created_by_user_id = u.id`;
    let params = [];
    if (req.user.role === 'tecnico') { query += ` WHERE tr.created_by_user_id=${req.user.id}`; }
    query += " ORDER BY tr.created_at DESC";
    db.all(query, params, (err, rows) => { if(err) return res.status(500).json({error: err.message}); res.json(rows); });
});

app.post('/reports', verifyToken, (req, res) => {
    const data = req.body;
    
    // SQL con todos los nuevos campos del formulario (report_date, contact_name, etc.)
    const sql = `
        INSERT INTO technical_reports (
            report_date, client_name, contact_name, technician_name, 
            arrival_time, departure_time, equipment_brand, model, serial_number, 
            battery_info, hour_meter, machine_status, symptoms, causes, 
            solution, parts_used, client_notes, client_contact_info, created_by_user_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;
    
    // Parámetros para la inserción (deben coincidir con el orden de la SQL)
    const params = [
        data.date, data.client, data.contact, data.tech_name,
        data.arrival, data.departure, data.brand, data.model, data.serial,
        data.battery, data.hour_meter, data.status, data.symptoms, data.causes,
        data.solution, data.parts, data.client_notes, data.client_contact, req.user.id
    ];

    db.run(sql, params, function(err) {
        if(err) {
             console.error("Error SQL al guardar reporte:", err);
             return res.status(500).json({error: "Fallo de DB: " + err.message});
        }
        db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'CREAR_INFORME', `Informe ID ${this.lastID} (Serie: ${data.serial})`]);
        res.status(201).json({success:true, id: this.lastID});
    });
});

app.put('/reports/:id', verifyToken, (req, res) => {
    const data = req.body;
    const sql = `UPDATE technical_reports SET report_date=?, client_name=?, contact_name=?, technician_name=?, arrival_time=?, departure_time=?, equipment_brand=?, model=?, serial_number=?, battery_info=?, hour_meter=?, machine_status=?, symptoms=?, causes=?, solution=?, parts_used=?, client_notes=?, client_contact_info=? WHERE id=?`;
    const params = [data.date, data.client, data.contact, data.tech_name, data.arrival, data.departure, data.brand, data.model, data.serial, data.battery, data.hour_meter, data.status, data.symptoms, data.causes, data.solution, data.parts, data.client_notes, data.client_contact, req.params.id];
    db.run(sql, params, function(err) {
        if(err) return res.status(500).json({error: err.message});
        res.json({success:true});
    });
});

app.delete('/reports/:id', verifyToken, (req, res) => {
    db.get("SELECT * FROM technical_reports WHERE id=?", [req.params.id], (err, item) => {
        if(!item) return res.status(404).json({error:"No encontrado"});
        db.run("INSERT INTO recycle_bin (original_id, data_json, deleted_by) VALUES (?,?,?)", [item.id, JSON.stringify(item), req.user.id]);
        db.run("DELETE FROM technical_reports WHERE id=?", [req.params.id], (err)=>{
            db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'BORRAR_INFORME', `ID: ${req.params.id}`]);
            res.json({success:true});
        });
    });
});

// ==========================================
// 2. MÓDULO HISTORIAL MÁQUINAS (MULTI-SEARCH APLICADO)
// ==========================================
// [Actualizar esta única ruta]
app.get('/machines/suggestions', verifyToken, (req, res) => {
    const q = req.query.q;
    if (!q) return res.json([]);
    
    // **NUEVA LÓGICA:** Selecciona Cliente, Técnico y Serie
    const sql = `
        SELECT DISTINCT serial_number, client_name, technician_name 
        FROM technical_reports 
        WHERE serial_number LIKE ? OR client_name LIKE ? OR technician_name LIKE ?
        LIMIT 5
    `;
    const searchParam = `%${q}%`;

    db.all(sql, [searchParam, searchParam, searchParam], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        // Devuelve el objeto completo para tener contexto en el Frontend
        res.json(rows);
    });
});

app.get('/history/:serial', verifyToken, (req, res) => {
    // La consulta ahora trae TODAS las columnas que necesita el PDF
    const sql = `
        SELECT *
        FROM technical_reports 
        WHERE serial_number = ? 
        ORDER BY report_date DESC
    `;
    db.all(sql, [req.params.serial], (err, rows) => { 
        if(err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

// ==========================================
// 3. MÓDULO FINANZAS (GASTOS)
// ==========================================
app.get('/finance/summary', verifyToken, (req, res) => {
    const userId = req.user.id;
    db.get("SELECT SUM(amount) as total FROM funds WHERE user_id = ?", [userId], (err, funds) => {
        db.get("SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND status != 'rechazado'", [userId], (err, exps) => {
            res.json({ assigned: funds?.total || 0, spent: exps?.total || 0, balance: (funds?.total || 0) - (exps?.total || 0) });
        });
    });
});

app.get('/finance/admin-overview', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({error: "Acceso denegado"});
    const sql = `SELECT u.id, u.username, COALESCE((SELECT SUM(amount) FROM funds WHERE user_id = u.id), 0) as total_assigned, COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = u.id AND status != 'rechazado'), 0) as total_spent FROM users u WHERE u.role != 'admin'`;
    db.all(sql, [], (err, rows) => {
        res.json(rows.map(r => ({ ...r, balance: r.total_assigned - r.total_spent })));
    });
});

app.post('/finance/funds', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({error: "Acceso denegado"});
    const { target_user_id, amount } = req.body;
    if (amount === 0 || !amount) return res.status(400).json({error: "Monto inválido"});
    db.run("INSERT INTO funds (user_id, amount, assigned_by) VALUES (?,?,?)", [target_user_id, amount, req.user.id], function(err){
        if(err) return res.status(500).json({error:err.message});
        const accion = amount > 0 ? 'ASIGNAR_FONDO' : 'DESCONTAR_FONDO';
        db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, accion, `Monto: $${amount} a usuario ID ${target_user_id}`]);
        res.json({success: true});
    });
});

app.post('/expenses', verifyToken, upload.single('receipt'), (req, res) => {
    const { description, amount, date } = req.body;
    const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;
    if(!amount || amount <= 0) return res.status(400).json({error: "Monto inválido"});
    
    const stmt = db.prepare("INSERT INTO expenses (user_id, description, amount, expense_date, receipt_url) VALUES (?,?,?,?,?)");
    stmt.run(req.user.id, description, amount, date, receiptUrl, function(err){
        if(err) return res.status(500).json({error: err.message});
        db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'RENDIR_GASTO', `Monto: $${amount}`]);
        res.json({success: true, id: this.lastID});
    });
});

app.get('/expenses', verifyToken, (req, res) => {
    let sql = `SELECT e.*, u.username FROM expenses e LEFT JOIN users u ON e.user_id = u.id`;
    let params = [];
    if (req.user.role === 'tecnico') { sql += " WHERE e.user_id = ?"; params.push(req.user.id); }
    else if (req.user.role === 'admin' && req.query.user_id) { sql += " WHERE e.user_id = ?"; params.push(req.query.user_id); }
    sql += " ORDER BY e.expense_date DESC";
    db.all(sql, params, (err, rows) => res.json(rows));
});

app.put('/expenses/:id/status', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({error: "Acceso denegado"});
    db.run("UPDATE expenses SET status = ? WHERE id = ?", [req.body.status, req.params.id], (err) => {
        db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'REVISAR_GASTO', `Estado: ${req.body.status}`]);
        res.json({success: true});
    });
});

// ==========================================
// 4. MÓDULO INVENTARIO Y COTIZACIONES
// ==========================================
app.get('/inventory', verifyToken, (req, res) => db.all("SELECT * FROM inventory ORDER BY name ASC", [], (err, rows) => res.json(rows)));

app.post('/inventory', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    const { name, description, price, stock, category } = req.body;
    db.run("INSERT INTO inventory (name, description, price, stock, category) VALUES (?, ?, ?, ?, ?)", [name, description, price, stock, category], function(err) {
        db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'CREAR_PRODUCTO', `Producto: ${name}`]);
        res.json({ success: true, id: this.lastID });
    });
});

app.put('/inventory/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    const { name, description, price, stock, category } = req.body;
    db.run("UPDATE inventory SET name=?, description=?, price=?, stock=?, category=? WHERE id=?", [name, description, price, stock, category, req.params.id], function(err) {
        db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'EDITAR_PRODUCTO', `ID: ${req.params.id}`]);
        res.json({ success: true });
    });
});

app.delete('/inventory/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    db.get("SELECT * FROM inventory WHERE id=?", [req.params.id], (err, item) => {
        if(!item) return res.status(404).json({error: "No encontrado"});
        db.run("INSERT INTO recycle_bin (original_id, data_json, deleted_by) VALUES (?,?,?)", [item.id, JSON.stringify(item), req.user.id]);
        db.run("DELETE FROM inventory WHERE id=?", [req.params.id], (err) => {
            db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'BORRAR_PRODUCTO', `ID: ${req.params.id}`]);
            res.json({ success: true });
        });
    });
});

// Cotizaciones (Con transacción segura para ítems)
app.get('/quotes', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    db.all("SELECT q.*, u.username as author FROM quotes q LEFT JOIN users u ON q.created_by = u.id ORDER BY q.created_at DESC", [], (err, rows) => res.json(rows));
});

app.get('/quotes/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    db.get("SELECT * FROM quotes WHERE id=?", [req.params.id], (err, quote) => {
        if (!quote) return res.status(404).json({error: "No encontrada"});
        db.all("SELECT * FROM quote_items WHERE quote_id = ?", [req.params.id], (err, items) => res.json({ ...quote, items }));
    });
});

app.post('/quotes', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    const { client_name, quote_date, validity_days, items, total_amount } = req.body;
    if (!items || items.length === 0) return res.status(400).json({error: "Sin ítems"});

    db.serialize(() => {
        db.run("INSERT INTO quotes (client_name, quote_date, validity_days, total_amount, created_by) VALUES (?, ?, ?, ?, ?)", 
            [client_name, quote_date, validity_days, total_amount, req.user.id], 
            function(err) {
                if (err) return res.status(500).json({error: err.message});
                const quoteId = this.lastID;
                const stmt = db.prepare("INSERT INTO quote_items (quote_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)");
                
                const inserts = items.map(i => new Promise((resolve, reject) => {
                    stmt.run(quoteId, i.product_id || null, i.description, i.quantity, i.unit_price, (i.quantity * i.unit_price), (err) => {
                        if(err) reject(err); else resolve();
                    });
                }));

                Promise.all(inserts).then(() => {
                    stmt.finalize();
                    db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'CREAR_COTIZACION', `ID: ${quoteId}`]);
                    res.status(201).json({ success: true, id: quoteId });
                }).catch(e => {
                    stmt.finalize();
                    res.status(500).json({ error: "Error items" });
                });
            }
        );
    });
});

app.put('/quotes/:id/approve', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    const quoteId = req.params.id;
    
    db.all("SELECT * FROM quote_items WHERE quote_id = ?", [quoteId], (err, items) => {
        if(items.length === 0) return res.status(400).json({error: "Cotización vacía"});
        
        // Validar Stock
        const checks = items.map(i => new Promise((resolve, reject) => {
            if (!i.product_id) return resolve();
            db.get("SELECT stock, name FROM inventory WHERE id=?", [i.product_id], (err, p) => {
                if (err) reject(err); else if (!p || p.stock < i.quantity) reject(`Falta stock: ${p?p.name:'?'}`); else resolve();
            });
        }));

        Promise.all(checks).then(() => {
            const stmt = db.prepare("UPDATE inventory SET stock = stock - ? WHERE id = ?");
            items.forEach(i => { if (i.product_id) stmt.run(i.quantity, i.product_id); });
            stmt.finalize();
            db.run("UPDATE quotes SET status = 'aprobada' WHERE id = ?", [quoteId], (err) => {
                db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'APROBAR_COTIZACION', `ID: ${quoteId}`]);
                res.json({ success: true });
            });
        }).catch(e => res.status(400).json({ error: e }));
    });
});

app.put('/quotes/:id/revert', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    const quoteId = req.params.id;
    db.all("SELECT * FROM quote_items WHERE quote_id = ?", [quoteId], (err, items) => {
        const stmt = db.prepare("UPDATE inventory SET stock = stock + ? WHERE id = ?");
        items.forEach(i => { if (i.product_id) stmt.run(i.quantity, i.product_id); });
        stmt.finalize();
        db.run("UPDATE quotes SET status = 'revision' WHERE id = ?", [quoteId], (err) => {
            db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'REVERTIR_COTIZACION', `ID: ${quoteId}`]);
            res.json({ success: true });
        });
    });
});

app.delete('/quotes/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    db.run("DELETE FROM quotes WHERE id = ?", [req.params.id], (err) => {
        db.run("DELETE FROM quote_items WHERE quote_id = ?", [req.params.id]);
        db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'BORRAR_COTIZACION', `ID: ${req.params.id}`]);
        res.json({ success: true });
    });
});

// Admin & Utilidades
app.get('/users', verifyToken, (req, res) => db.all("SELECT id, username, role FROM users", [], (err, rows) => res.json(rows)));
app.get('/audit-logs', verifyToken, (req, res) => db.all("SELECT al.*, u.username FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.timestamp DESC", [], (err, rows) => res.json(rows)));
app.get('/recycle-bin', verifyToken, (req, res) => db.all("SELECT rb.*, u.username as deleted_by_user FROM recycle_bin rb LEFT JOIN users u ON rb.deleted_by = u.id ORDER BY rb.deleted_at DESC", [], (err, rows) => res.json(rows.map(r => ({ ...r, data: JSON.parse(r.data_json) })))));
app.post('/recycle-bin/restore/:id', verifyToken, (req, res) => {
    db.get("SELECT * FROM recycle_bin WHERE id=?", [req.params.id], (err, item) => {
        if(!item) return res.status(404).json({error:"No existe"});
        const d = JSON.parse(item.data_json);
        // Restaurar genérico
        if(d.client_name && d.serial_number) {
             db.run("INSERT INTO technical_reports (id, client_name, machine_model, serial_number, failure_description, repair_details, technician_id, created_at) VALUES (?,?,?,?,?,?,?,?)", [d.id, d.client_name, d.machine_model, d.serial_number, d.failure_description, d.repair_details, d.technician_id, d.created_at]);
        }
        db.run("DELETE FROM recycle_bin WHERE id=?", [req.params.id]);
        res.json({success:true});
    });
});

// ADMIN: gestionar usuarios (crear, editar, eliminar)
app.post('/users', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Acceso denegado" });
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Faltan campos" });
    const userRole = role === 'admin' ? 'admin' : 'tecnico';
    const hashed = bcrypt.hashSync(password, 8);

    db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [username, hashed, userRole], function(err) {
        if (err) {
            if (err.message && err.message.toLowerCase().includes('unique')) return res.status(400).json({ error: "Usuario ya existe" });
            return res.status(500).json({ error: err.message });
        }
        db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'CREAR_USUARIO', `ID: ${this.lastID} - ${username}`]);
        res.status(201).json({ success: true, id: this.lastID });
    });
});

app.put('/users/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Acceso denegado" });
    const id = req.params.id;
    const { username, password, role } = req.body;
    if (!username && !password && !role) return res.status(400).json({ error: "Nada para actualizar" });

    // Construir SET dinámico
    const fields = [];
    const params = [];
    if (username) { fields.push("username = ?"); params.push(username); }
    if (password) { fields.push("password = ?"); params.push(bcrypt.hashSync(password, 8)); }
    if (role) { fields.push("role = ?"); params.push(role === 'admin' ? 'admin' : 'tecnico'); }
    params.push(id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    db.run(sql, params, function(err) {
        if (err) {
            if (err.message && err.message.toLowerCase().includes('unique')) return res.status(400).json({ error: "Usuario ya existe" });
            return res.status(500).json({ error: err.message });
        }
        db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'EDITAR_USUARIO', `ID: ${id}`]);
        res.json({ success: true });
    });
});

app.delete('/users/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Acceso denegado" });
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    if (id === req.user.id) return res.status(400).json({ error: "No puedes eliminarte a ti mismo" });

    db.get("SELECT * FROM users WHERE id = ?", [id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: "No encontrado" });

        if (user.role === 'admin') {
            db.get("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'", [], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                if (row && row.cnt <= 1) return res.status(400).json({ error: "No se puede eliminar el último admin" });
                proceedDelete(user);
            });
        } else proceedDelete(user);

        function proceedDelete(user) {
            db.run("INSERT INTO recycle_bin (original_id, data_json, deleted_by) VALUES (?,?,?)", [user.id, JSON.stringify(user), req.user.id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    db.run("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)", [req.user.id, 'BORRAR_USUARIO', `ID: ${id} - ${user.username}`]);
                    res.json({ success: true });
                });
            });
        }
    });
});
// Reset
app.get('/emergency-reset', (req, res) => {
    db.serialize(() => {
        db.run("DROP TABLE IF EXISTS users"); db.run("DROP TABLE IF EXISTS technical_reports"); 
        db.run("DROP TABLE IF EXISTS audit_logs"); db.run("DROP TABLE IF EXISTS recycle_bin"); 
        db.run("DROP TABLE IF EXISTS funds"); db.run("DROP TABLE IF EXISTS expenses");
        db.run("DROP TABLE IF EXISTS quotes"); db.run("DROP TABLE IF EXISTS quote_items");
        db.run("DROP TABLE IF EXISTS inventory");
        initializeDatabase();
        res.json({ message: "Reset Completo V7 (Final SQLite)" });
    });
});

app.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`));