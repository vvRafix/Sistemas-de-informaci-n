require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'secreto_super_seguro';

// Configuración de Conexión a PostgreSQL (Neon/Render/Etc)
// --- MODIFICACIÓN TEMPORAL ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Render llenará esto por nosotros
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
// -----------------------------

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

// --- FUNCIÓN HELPER PARA CONSULTAS ---
async function query(text, params) {
    const res = await pool.query(text, params);
    return res;
}

// --- INICIALIZACIÓN DE LA BASE DE DATOS ---
async function initializeDatabase() {
    console.log("Verificando/Creando tablas en PostgreSQL...");
    try {
        // 1. Usuarios
        await query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT
        )`);

        // 2. Reportes Técnicos
        await query(`CREATE TABLE IF NOT EXISTS technical_reports (
            id SERIAL PRIMARY KEY,
            report_date DATE, client_name TEXT, contact_name TEXT, technician_name TEXT, 
            arrival_time TEXT, departure_time TEXT, equipment_brand TEXT, model TEXT, serial_number TEXT, 
            battery_info TEXT, hour_meter TEXT, machine_status TEXT, 
            symptoms TEXT, causes TEXT, solution TEXT, parts_used TEXT, client_notes TEXT, client_contact_info TEXT,
            created_by_user_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // 3. Tablas auxiliares
        await query(`CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, user_id INTEGER, action TEXT, details TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await query(`CREATE TABLE IF NOT EXISTS recycle_bin (id SERIAL PRIMARY KEY, original_id INTEGER, data_json TEXT, deleted_by INTEGER, deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        
        // 4. Finanzas
        await query(`CREATE TABLE IF NOT EXISTS funds (id SERIAL PRIMARY KEY, user_id INTEGER, amount REAL, assigned_by INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await query(`CREATE TABLE IF NOT EXISTS expenses (id SERIAL PRIMARY KEY, user_id INTEGER, description TEXT, amount REAL, expense_date DATE, status TEXT DEFAULT 'pendiente', receipt_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        
        // 5. Inventario y Cotizaciones
        await query(`CREATE TABLE IF NOT EXISTS inventory (id SERIAL PRIMARY KEY, name TEXT, description TEXT, price REAL, stock INTEGER, category TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await query(`CREATE TABLE IF NOT EXISTS quotes (id SERIAL PRIMARY KEY, client_name TEXT, quote_date DATE, validity_days INTEGER, total_amount REAL, status TEXT DEFAULT 'revision', created_by INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await query(`CREATE TABLE IF NOT EXISTS quote_items (id SERIAL PRIMARY KEY, quote_id INTEGER, product_id INTEGER, description TEXT, quantity INTEGER, unit_price REAL, total REAL)`);

        // Usuarios por defecto
        const res = await query("SELECT count(*) as count FROM users");
        if (parseInt(res.rows[0].count) === 0) {
            const pass = bcrypt.hashSync('Pelot7E123.1', 8);
            await query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ['Luis Felipe', pass, 'admin']);
            await query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ['tecnico', pass, 'tecnico']);
            console.log("Usuarios iniciales creados.");
        }
    } catch (err) {
        console.error("Error al inicializar DB:", err);
    }
}

initializeDatabase();

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

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await query("SELECT * FROM users WHERE username = $1", [username]);
        const user = result.rows[0];
        if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ message: "Credenciales incorrectas" });
        const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: user.role });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 1. Reportes Técnicos
app.get('/reports', verifyToken, async (req, res) => {
    let sql = `SELECT tr.*, u.username as author_system FROM technical_reports tr LEFT JOIN users u ON tr.created_by_user_id = u.id`;
    let params = [];
    if (req.user.role === 'tecnico') { sql += ` WHERE tr.created_by_user_id=$1`; params.push(req.user.id); }
    sql += " ORDER BY tr.created_at DESC";
    try {
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({error: err.message}); }
});

app.post('/reports', verifyToken, async (req, res) => {
    const data = req.body;
    const sql = `
        INSERT INTO technical_reports (
            report_date, client_name, contact_name, technician_name, 
            arrival_time, departure_time, equipment_brand, model, serial_number, 
            battery_info, hour_meter, machine_status, symptoms, causes, 
            solution, parts_used, client_notes, client_contact_info, created_by_user_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        RETURNING id
    `;
    // Nota: Aquí se esperan los nombres cortos del frontend corregido
    const params = [
        data.date, data.client, data.contact, data.tech_name,
        data.arrival, data.departure, data.brand, data.model, data.serial,
        data.battery, data.hour_meter, data.status, data.symptoms, data.causes,
        data.solution, data.parts, data.client_notes, data.client_contact, req.user.id
    ];

    try {
        const result = await query(sql, params);
        const newId = result.rows[0].id;
        await query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, 'CREAR_INFORME', `Informe ID ${newId} (Serie: ${data.serial})`]);
        res.status(201).json({success:true, id: newId});
    } catch(err) {
        console.error("Error SQL:", err);
        res.status(500).json({error: "Fallo de DB: " + err.message});
    }
});

app.put('/reports/:id', verifyToken, async (req, res) => {
    const data = req.body;
    const sql = `UPDATE technical_reports SET report_date=$1, client_name=$2, contact_name=$3, technician_name=$4, arrival_time=$5, departure_time=$6, equipment_brand=$7, model=$8, serial_number=$9, battery_info=$10, hour_meter=$11, machine_status=$12, symptoms=$13, causes=$14, solution=$15, parts_used=$16, client_notes=$17, client_contact_info=$18 WHERE id=$19`;
    const params = [data.date, data.client, data.contact, data.tech_name, data.arrival, data.departure, data.brand, data.model, data.serial, data.battery, data.hour_meter, data.status, data.symptoms, data.causes, data.solution, data.parts, data.client_notes, data.client_contact, req.params.id];
    try {
        await query(sql, params);
        res.json({success:true});
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.delete('/reports/:id', verifyToken, async (req, res) => {
    try {
        const result = await query("SELECT * FROM technical_reports WHERE id=$1", [req.params.id]);
        const item = result.rows[0];
        if(!item) return res.status(404).json({error:"No encontrado"});
        
        await query("INSERT INTO recycle_bin (original_id, data_json, deleted_by) VALUES ($1,$2,$3)", [item.id, JSON.stringify(item), req.user.id]);
        await query("DELETE FROM technical_reports WHERE id=$1", [req.params.id]);
        await query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, 'BORRAR_INFORME', `ID: ${req.params.id}`]);
        res.json({success:true});
    } catch(err) { res.status(500).json({error: err.message}); }
});

// 2. Historial Máquinas
app.get('/machines/suggestions', verifyToken, async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json([]);
    const sql = `SELECT DISTINCT serial_number, client_name, technician_name FROM technical_reports WHERE serial_number ILIKE $1 OR client_name ILIKE $2 OR technician_name ILIKE $3 LIMIT 5`;
    const p = `%${q}%`;
    try {
        const result = await query(sql, [p, p, p]);
        res.json(result.rows);
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.get('/history/:serial', verifyToken, async (req, res) => {
    try {
        const result = await query("SELECT * FROM technical_reports WHERE serial_number = $1 ORDER BY report_date DESC", [req.params.serial]);
        res.json(result.rows);
    } catch(err) { res.status(500).json({error: err.message}); }
});

// 3. Finanzas
app.get('/finance/summary', verifyToken, async (req, res) => {
    try {
        const fundsRes = await query("SELECT SUM(amount) as total FROM funds WHERE user_id = $1", [req.user.id]);
        const expsRes = await query("SELECT SUM(amount) as total FROM expenses WHERE user_id = $1 AND status != 'rechazado'", [req.user.id]);
        const assigned = fundsRes.rows[0].total || 0;
        const spent = expsRes.rows[0].total || 0;
        res.json({ assigned, spent, balance: assigned - spent });
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.get('/finance/admin-overview', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({error: "Acceso denegado"});
    const sql = `SELECT u.id, u.username, COALESCE((SELECT SUM(amount) FROM funds WHERE user_id = u.id), 0) as total_assigned, COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = u.id AND status != 'rechazado'), 0) as total_spent FROM users u WHERE u.role != 'admin'`;
    try {
        const result = await query(sql);
        res.json(result.rows.map(r => ({ ...r, balance: r.total_assigned - r.total_spent })));
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.post('/finance/funds', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({error: "Acceso denegado"});
    const { target_user_id, amount } = req.body;
    try {
        await query("INSERT INTO funds (user_id, amount, assigned_by) VALUES ($1,$2,$3)", [target_user_id, amount, req.user.id]);
        const accion = amount > 0 ? 'ASIGNAR_FONDO' : 'DESCONTAR_FONDO';
        await query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, accion, `Monto: $${amount} a usuario ID ${target_user_id}`]);
        res.json({success: true});
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.post('/expenses', verifyToken, upload.single('receipt'), async (req, res) => {
    const { description, amount, date } = req.body;
    const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;
    try {
        const result = await query("INSERT INTO expenses (user_id, description, amount, expense_date, receipt_url) VALUES ($1,$2,$3,$4,$5) RETURNING id", [req.user.id, description, amount, date, receiptUrl]);
        await query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, 'RENDIR_GASTO', `Monto: $${amount}`]);
        res.json({success: true, id: result.rows[0].id});
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.get('/expenses', verifyToken, async (req, res) => {
    let sql = `SELECT e.*, u.username FROM expenses e LEFT JOIN users u ON e.user_id = u.id`;
    let params = [];
    if (req.user.role === 'tecnico') { sql += " WHERE e.user_id = $1"; params.push(req.user.id); }
    else if (req.user.role === 'admin' && req.query.user_id) { sql += " WHERE e.user_id = $1"; params.push(req.query.user_id); }
    sql += " ORDER BY e.expense_date DESC";
    try {
        const result = await query(sql, params);
        res.json(result.rows);
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.put('/expenses/:id/status', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({error: "Acceso denegado"});
    try {
        await query("UPDATE expenses SET status = $1 WHERE id = $2", [req.body.status, req.params.id]);
        await query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, 'REVISAR_GASTO', `Estado: ${req.body.status}`]);
        res.json({success: true});
    } catch(err) { res.status(500).json({error: err.message}); }
});

// 4. Inventario
app.get('/inventory', verifyToken, async (req, res) => {
    try {
        const result = await query("SELECT * FROM inventory ORDER BY name ASC");
        res.json(result.rows);
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.post('/inventory', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    const { name, description, price, stock, category } = req.body;
    try {
        const result = await query("INSERT INTO inventory (name, description, price, stock, category) VALUES ($1, $2, $3, $4, $5) RETURNING id", [name, description, price, stock, category]);
        await query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, 'CREAR_PRODUCTO', `Producto: ${name}`]);
        res.json({ success: true, id: result.rows[0].id });
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.put('/inventory/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    const { name, description, price, stock, category } = req.body;
    try {
        await query("UPDATE inventory SET name=$1, description=$2, price=$3, stock=$4, category=$5 WHERE id=$6", [name, description, price, stock, category, req.params.id]);
        await query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, 'EDITAR_PRODUCTO', `ID: ${req.params.id}`]);
        res.json({ success: true });
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.delete('/inventory/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    try {
        const result = await query("SELECT * FROM inventory WHERE id=$1", [req.params.id]);
        const item = result.rows[0];
        if(!item) return res.status(404).json({error: "No encontrado"});
        
        await query("INSERT INTO recycle_bin (original_id, data_json, deleted_by) VALUES ($1,$2,$3)", [item.id, JSON.stringify(item), req.user.id]);
        await query("DELETE FROM inventory WHERE id=$1", [req.params.id]);
        await query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, 'BORRAR_PRODUCTO', `ID: ${req.params.id}`]);
        res.json({ success: true });
    } catch(err) { res.status(500).json({error: err.message}); }
});

// 5. Cotizaciones (Con Transacciones)
app.get('/quotes', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    try {
        const result = await query("SELECT q.*, u.username as author FROM quotes q LEFT JOIN users u ON q.created_by = u.id ORDER BY q.created_at DESC");
        res.json(result.rows);
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.get('/quotes/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    try {
        const quoteRes = await query("SELECT * FROM quotes WHERE id=$1", [req.params.id]);
        const quote = quoteRes.rows[0];
        if (!quote) return res.status(404).json({error: "No encontrada"});
        const itemsRes = await query("SELECT * FROM quote_items WHERE quote_id = $1", [req.params.id]);
        res.json({ ...quote, items: itemsRes.rows });
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.post('/quotes', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    const { client_name, quote_date, validity_days, items, total_amount } = req.body;
    
    const client = await pool.connect(); // Cliente para transacción
    try {
        await client.query('BEGIN');
        const insertQuote = "INSERT INTO quotes (client_name, quote_date, validity_days, total_amount, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id";
        const resQuote = await client.query(insertQuote, [client_name, quote_date, validity_days, total_amount, req.user.id]);
        const quoteId = resQuote.rows[0].id;

        for (const i of items) {
            await client.query(
                "INSERT INTO quote_items (quote_id, product_id, description, quantity, unit_price, total) VALUES ($1, $2, $3, $4, $5, $6)",
                [quoteId, i.product_id || null, i.description, i.quantity, i.unit_price, (i.quantity * i.unit_price)]
            );
        }

        await client.query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, 'CREAR_COTIZACION', `ID: ${quoteId}`]);
        await client.query('COMMIT');
        res.status(201).json({ success: true, id: quoteId });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.put('/quotes/:id/approve', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const itemsRes = await client.query("SELECT * FROM quote_items WHERE quote_id = $1", [req.params.id]);
        const items = itemsRes.rows;

        for (const i of items) {
            if (i.product_id) {
                const prodRes = await client.query("SELECT stock, name FROM inventory WHERE id=$1", [i.product_id]);
                const prod = prodRes.rows[0];
                if (!prod || prod.stock < i.quantity) throw new Error(`Falta stock: ${prod ? prod.name : '?'}`);
                await client.query("UPDATE inventory SET stock = stock - $1 WHERE id = $2", [i.quantity, i.product_id]);
            }
        }

        await client.query("UPDATE quotes SET status = 'aprobada' WHERE id = $1", [req.params.id]);
        await client.query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, 'APROBAR_COTIZACION', `ID: ${req.params.id}`]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.put('/quotes/:id/revert', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Solo admin" });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const itemsRes = await client.query("SELECT * FROM quote_items WHERE quote_id = $1", [req.params.id]);
        for (const i of itemsRes.rows) {
            if (i.product_id) {
                await client.query("UPDATE inventory SET stock = stock + $1 WHERE id = $2", [i.quantity, i.product_id]);
            }
        }
        await client.query("UPDATE quotes SET status = 'revision' WHERE id = $1", [req.params.id]);
        await client.query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, 'REVERTIR_COTIZACION', `ID: ${req.params.id}`]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch(e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Admin & Utilidades
app.get('/users', verifyToken, async (req, res) => {
    try {
        const result = await query("SELECT id, username, role FROM users");
        res.json(result.rows);
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.get('/audit-logs', verifyToken, async (req, res) => {
    try {
        const result = await query("SELECT al.*, u.username FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.timestamp DESC");
        res.json(result.rows);
    } catch(err) { res.status(500).json({error: err.message}); }
});

app.post('/users', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Acceso denegado" });
    const { username, password, role } = req.body;
    const userRole = role === 'admin' ? 'admin' : 'tecnico';
    const hashed = bcrypt.hashSync(password, 8);
    try {
        const result = await query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id", [username, hashed, userRole]);
        await query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, 'CREAR_USUARIO', `ID: ${result.rows[0].id} - ${username}`]);
        res.status(201).json({ success: true, id: result.rows[0].id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/users/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Acceso denegado" });
    const id = parseInt(req.params.id, 10);
    if (id === req.user.id) return res.status(400).json({ error: "No puedes eliminarte a ti mismo" });

    try {
        const userRes = await query("SELECT * FROM users WHERE id = $1", [id]);
        const user = userRes.rows[0];
        if (!user) return res.status(404).json({ error: "No encontrado" });

        await query("INSERT INTO recycle_bin (original_id, data_json, deleted_by) VALUES ($1,$2,$3)", [user.id, JSON.stringify(user), req.user.id]);
        await query("DELETE FROM users WHERE id = $1", [id]);
        await query("INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)", [req.user.id, 'BORRAR_USUARIO', `ID: ${id}`]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`Servidor PostgreSQL listo en puerto ${PORT}`));