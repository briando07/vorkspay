
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const qrcode = require('qrcode');
const mercadopago = require('mercadopago');
const { nanoid } = require('nanoid');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

mercadopago.configure({ access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' });

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({ dest: uploadDir });
const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(uploadDir));

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

function sign(payload){ return jwt.sign(payload, JWT_SECRET, { expiresIn:'30d' }); }
async function auth(req,res,next){
  const a = req.headers.authorization;
  if(!a) return res.status(401).json({error:'no token'});
  try{ req.user = jwt.verify(a.replace('Bearer ','').trim(), JWT_SECRET); next(); }catch(e){ return res.status(401).json({error:'invalid token'}); }
}

async function getConn(){
  const url = process.env.DATABASE_URL || 'mysql://vorkspay:vorkspay@db:3306/vorkspay';
  const m = url.match(/mysql:\/\/(.*?):(.*?)@(.*?):(\d+)\/(.*)/);
  if(!m) throw new Error('Invalid DATABASE_URL');
  const user = m[1], pass = m[2], host = m[3], port = m[4], db = m[5];
  return await mysql.createConnection({ host, user, password: pass, database: db, port });
}

// Helpers
function toCents(reais){ const n = Number(reais)||0; return Math.round(n*100); }
function calcFeeCents(amountCents, merchant){ 
  const percent = Math.round(amountCents * ((merchant && merchant.fee_percent!=null)? merchant.fee_percent : 0.0599));
  const fixed = (merchant && merchant.fee_fixed_cents!=null)? merchant.fee_fixed_cents : 200;
  return percent + fixed;
}

// MIGRATIONS
app.get('/migrate', async (req,res)=>{
  try{
    const conn = await getConn();
    await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255),
      full_name VARCHAR(255),
      cpf VARCHAR(32) UNIQUE,
      phone VARCHAR(64),
      street VARCHAR(255),
      number VARCHAR(64),
      complement VARCHAR(255),
      cep VARCHAR(32),
      apartment BOOLEAN DEFAULT FALSE,
      city VARCHAR(128),
      state VARCHAR(64),
      approved BOOLEAN DEFAULT FALSE,
      role VARCHAR(32) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS merchants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      api_key VARCHAR(255) UNIQUE,
      owner_email VARCHAR(255),
      balance_cents BIGINT DEFAULT 0,
      fee_percent DOUBLE DEFAULT 0.0599,
      fee_fixed_cents INT DEFAULT 200,
      withdrawal_locked BOOLEAN DEFAULT FALSE,
      destination_info TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      merchant_id INT,
      title TEXT,
      description TEXT,
      image VARCHAR(512),
      site VARCHAR(512),
      support_email VARCHAR(255),
      price_cents INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(128) PRIMARY KEY,
      merchant_id INT,
      product_id INT,
      amount_cents INT,
      status VARCHAR(32),
      customer_email VARCHAR(255),
      customer_name VARCHAR(255),
      customer_cpf VARCHAR(64),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      merchant_id INT NOT NULL,
      requested_cents BIGINT NOT NULL,
      fee_cents BIGINT NOT NULL,
      net_cents BIGINT NOT NULL,
      method VARCHAR(64) DEFAULT 'pix',
      destination_info TEXT,
      status VARCHAR(32) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      paid_at TIMESTAMP NULL,
      admin_note TEXT
    );
    `);
    await conn.end();
    res.json({ok:true});
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

// AUTH
app.post('/api/auth/register', async (req,res)=>{
  try{
    const { email, password, fullName, cpf, phone, street, number, complement, cep, apartment, city, state } = req.body;
    if(!email||!password) return res.status(400).json({error:'email+password'});
    const conn = await getConn();
    const [rows] = await conn.query('SELECT id FROM users WHERE email=? OR cpf=?',[email, cpf]);
    if(rows.length) { await conn.end(); return res.status(409).json({error:'exists'}); }
    const hash = await bcrypt.hash(password, 10);
    await conn.query('INSERT INTO users(email,password_hash,full_name,cpf,phone,street,number,complement,cep,apartment,city,state,approved,role) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [email, hash, fullName||'', cpf||'', phone||'', street||'', number||'', complement||'', cep||'', apartment?1:0, city||'', state||'', false, 'user']);
    await conn.end();
    const token = sign({ email });
    res.json({ token });
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

app.post('/api/auth/login', async (req,res)=>{
  try{
    const { email, password } = req.body;
    const conn = await getConn();
    const [rows] = await conn.query('SELECT * FROM users WHERE email=?',[email]);
    if(!rows.length){ await conn.end(); return res.status(401).json({error:'invalid'}); }
    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if(!ok){ await conn.end(); return res.status(401).json({error:'invalid'}); }
    if(!u.approved) { await conn.end(); return res.status(403).json({error:'account not approved'}); }
    await conn.end();
    const token = sign({ email, role: u.role });
    res.json({ token });
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

// PRODUCTS
app.post('/api/products', auth, upload.single('image'), async (req,res)=>{
  try{
    const tokenEmail = req.user && req.user.email;
    const conn = await getConn();
    const [mrows] = await conn.query('SELECT * FROM merchants WHERE owner_email=?',[tokenEmail]);
    let merchant;
    if(!mrows.length){
      const [r] = await conn.query('INSERT INTO merchants(name,api_key,owner_email) VALUES(?,?,?)',[tokenEmail+"'s shop", 'mk_'+nanoid(20), tokenEmail]);
      merchant = { id: r.insertId, fee_percent:0.0599, fee_fixed_cents:200 };
    } else merchant = mrows[0];
    const { title, description, site, support_email, price_cents } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    const [p] = await conn.query('INSERT INTO products(merchant_id,title,description,image,site,support_email,price_cents) VALUES(?,?,?,?,?,?,?)',
      [merchant.id, title, description, image, site, support_email, parseInt(price_cents||0)]);
    await conn.end();
    res.json({ id: p.insertId, merchant_id: merchant.id, title });
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

app.get('/api/products', async (req,res)=>{
  try{
    const conn = await getConn();
    const [rows] = await conn.query('SELECT p.*, m.name as merchant_name FROM products p LEFT JOIN merchants m ON m.id=p.merchant_id ORDER BY p.created_at DESC');
    await conn.end();
    res.json(rows);
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

// Checkout
app.post('/api/checkout/:productId', async (req,res)=>{
  try{
    const productId = parseInt(req.params.productId);
    const conn = await getConn();
    const [prows] = await conn.query('SELECT p.*, m.fee_percent, m.fee_fixed_cents FROM products p LEFT JOIN merchants m ON m.id=p.merchant_id WHERE p.id=?',[productId]);
    if(!prows.length){ await conn.end(); return res.status(404).json({error:'not found'}); }
    const product = prows[0];
    const { email, name, cpf, phone } = req.body;
    const txid = 'tx_' + nanoid(12);
    await conn.query('INSERT INTO transactions(id,merchant_id,product_id,amount_cents,status,customer_email,customer_name,customer_cpf) VALUES(?,?,?,?,?,?,?,?)',
      [txid, product.merchant_id, product.id, product.price_cents, 'created', email, name, cpf]);
    const payment_data = {
      transaction_amount: product.price_cents/100,
      payment_method_id: "pix",
      payer: {
        email: email,
        first_name: name || 'Cliente'
      }
    };
    const mpRes = await mercadopago.payment.create(payment_data).catch(e=>({error:'mp error', e}));
    const qr = (mpRes && mpRes.response && mpRes.response.point_of_interaction && mpRes.response.point_of_interaction.transaction_data && mpRes.response.point_of_interaction.transaction_data.qr_code) || null;
    await conn.end();
    res.json({ txid, qr, mp: mpRes && mpRes.response });
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

app.get('/api/transactions', auth, async (req,res)=>{
  try{
    const conn = await getConn();
    const [rows] = await conn.query('SELECT t.*, p.title as product_title FROM transactions t LEFT JOIN products p ON p.id=t.product_id ORDER BY t.created_at DESC');
    await conn.end();
    res.json(rows);
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

// Withdrawals
app.post('/api/withdrawals', auth, async (req, res) => {
  try{
    const { amount, method='pix', destination_info = {} } = req.body;
    const amountCents = toCents(amount);
    if(amountCents <= 0) return res.status(400).json({ error:'valor inválido' });
    const conn = await getConn();
    const [mrows] = await conn.query('SELECT * FROM merchants WHERE owner_email=?',[req.user.email]);
    if(!mrows.length){ await conn.end(); return res.status(404).json({ error:'merchant not found' }); }
    const merchant = mrows[0];
    if(merchant.withdrawal_locked){ await conn.end(); return res.status(403).json({ error:'withdrawals locked for this merchant' }); }
    if((merchant.balance_cents||0) < amountCents){ await conn.end(); return res.status(400).json({ error:'saldo insuficiente' }); }
    const feeCents = calcFeeCents(amountCents, merchant);
    const netCents = amountCents - feeCents;
    await conn.query('INSERT INTO withdrawals(merchant_id, requested_cents, fee_cents, net_cents, method, destination_info, status) VALUES(?,?,?,?,?,?,?)',
      [merchant.id, amountCents, feeCents, netCents, method, JSON.stringify(destination_info||{}), 'pending']);
    await conn.end();
    res.json({ ok:true, requested_cents:amountCents, fee_cents:feeCents, net_cents:netCents });
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});



// Merchant endpoints - get merchant by logged user and update destination (PIX)
app.get('/api/merchant/me', auth, async (req, res) => {
  try {
    const conn = await getConn();
    const [mrows] = await conn.query('SELECT * FROM merchants WHERE owner_email=?', [req.user.email]);
    await conn.end();
    if (!mrows.length) return res.status(404).json({ error: 'merchant not found' });
    const m = mrows[0];
    // parse destination_info if exists
    try { m.destination_info = m.destination_info ? JSON.parse(m.destination_info) : {}; } catch(e){ m.destination_info = {}; }
    res.json(m);
  } catch (e) {
    console.error(e); res.status(500).json({ error: e.message });
  }
});

app.post('/api/merchant/me/destination', auth, async (req, res) => {
  try {
    const { destination } = req.body; // destination is an object e.g. { pix_key: 'abc', name: '', cpf: '' }
    const conn = await getConn();
    const [mrows] = await conn.query('SELECT * FROM merchants WHERE owner_email=?', [req.user.email]);
    if (!mrows.length) { await conn.end(); return res.status(404).json({ error: 'merchant not found' }); }
    const merchant = mrows[0];
    await conn.query('UPDATE merchants SET destination_info=? WHERE id=?', [JSON.stringify(destination||{}), merchant.id]);
    await conn.end();
    res.json({ ok: true });
  } catch (e) {
    console.error(e); res.status(500).json({ error: e.message });
  }
});

app.get('/api/withdrawals', auth, async (req,res)=>{
  try{
    const conn = await getConn();
    const [mrows] = await conn.query('SELECT * FROM merchants WHERE owner_email=?',[req.user.email]);
    if(!mrows.length){ await conn.end(); return res.status(404).json({error:'merchant not found'}); }
    const merchant = mrows[0];
    const [rows] = await conn.query('SELECT * FROM withdrawals WHERE merchant_id=? ORDER BY created_at DESC',[merchant.id]);
    await conn.end();
    res.json(rows);
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

// Admin utilities
function adminOnly(req,res,next){
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@vorkspay.local';
  if(!req.user) return res.status(403).json({ error:'forbidden' });
  if(req.user.email !== adminEmail && req.user.role !== 'admin') return res.status(403).json({ error:'forbidden' });
  next();
}

app.get('/api/admin/withdrawals', auth, adminOnly, async (req,res)=>{
  try{ const conn = await getConn(); const [rows] = await conn.query('SELECT w.*, m.name as merchant_name, m.owner_email FROM withdrawals w LEFT JOIN merchants m ON m.id=w.merchant_id ORDER BY w.created_at DESC'); await conn.end(); res.json(rows);}catch(e){console.error(e);res.status(500).json({error:e.message});}
});

app.post('/api/admin/withdrawals/:id/approve', auth, adminOnly, async (req,res)=>{
  const id = req.params.id;
  try{
    const conn = await getConn();
    const [wrows] = await conn.query('SELECT * FROM withdrawals WHERE id=?',[id]);
    if(!wrows.length){ await conn.end(); return res.status(404).json({error:'not found'}); }
    const w = wrows[0];
    if(w.status!=='pending'){ await conn.end(); return res.status(400).json({error:'invalid status'}); }
    const [mrows] = await conn.query('SELECT * FROM merchants WHERE id=?',[w.merchant_id]);
    if(!mrows.length){ await conn.end(); return res.status(404).json({error:'merchant not found'}); }
    const merchant = mrows[0];
    if((merchant.balance_cents||0) < w.requested_cents){ await conn.end(); return res.status(400).json({error:'saldo insuficiente'}); }
    const newBal = (merchant.balance_cents||0) - w.requested_cents;
    await conn.query('UPDATE merchants SET balance_cents=? WHERE id=?',[newBal, merchant.id]);
    await conn.query('UPDATE withdrawals SET status=?, paid_at=NOW() WHERE id=?',['paid', id]);
    await conn.end();
    res.json({ ok:true });
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

app.post('/api/admin/withdrawals/:id/reject', auth, adminOnly, async (req,res)=>{
  const id = req.params.id; const { note } = req.body||{};
  try{ const conn = await getConn(); const [wrows] = await conn.query('SELECT * FROM withdrawals WHERE id=?',[id]); if(!wrows.length){ await conn.end(); return res.status(404).json({error:'not found'});} await conn.query('UPDATE withdrawals SET status=?, admin_note=? WHERE id=?',['rejected', note||'', id]); await conn.end(); res.json({ok:true}); }catch(e){console.error(e);res.status(500).json({error:e.message});}
});

// Admin: users
app.get('/api/admin/users', auth, adminOnly, async (req,res)=>{
  try{ const conn = await getConn(); const [rows] = await conn.query('SELECT id,email,full_name,cpf,phone,street,number,complement,cep,apartment,city,state,approved,role,created_at FROM users ORDER BY created_at DESC'); await conn.end(); res.json(rows);}catch(e){console.error(e);res.status(500).json({error:e.message});}
});
app.post('/api/admin/users/:id/approve', auth, adminOnly, async (req,res)=>{ const id=req.params.id; try{ const conn=await getConn(); await conn.query('UPDATE users SET approved=1 WHERE id=?',[id]); await conn.end(); res.json({ok:true}); }catch(e){console.error(e);res.status(500).json({error:e.message});} });
app.post('/api/admin/users/:id/promote', auth, adminOnly, async (req,res)=>{ const id=req.params.id; try{ const conn=await getConn(); await conn.query("UPDATE users SET role='admin' WHERE id=?",[id]); await conn.end(); res.json({ok:true}); }catch(e){console.error(e);res.status(500).json({error:e.message});} });

app.post('/api/admin/merchant/:id/fees', auth, adminOnly, async (req,res)=>{
  const id = req.params.id; const { fee_percent, fee_fixed_cents } = req.body;
  try{ const conn = await getConn(); await conn.query('UPDATE merchants SET fee_percent=?, fee_fixed_cents=? WHERE id=?',[fee_percent, fee_fixed_cents, id]); await conn.end(); res.json({ok:true}); }catch(e){console.error(e);res.status(500).json({error:e.message});}
});
app.post('/api/admin/merchant/:id/lock', auth, adminOnly, async (req,res)=>{
  const id = req.params.id; const { lock } = req.body;
  try{ const conn = await getConn(); await conn.query('UPDATE merchants SET withdrawal_locked=? WHERE id=?',[lock?1:0, id]); await conn.end(); res.json({ok:true}); }catch(e){console.error(e);res.status(500).json({error:e.message});}
});

app.get('/api/admin/stats', auth, adminOnly, async (req,res)=>{
  try{ const conn = await getConn(); const [[t]] = await conn.query('SELECT COUNT(*) as total FROM transactions').then(r=>[r[0]]); const [[p]] = await conn.query("SELECT COUNT(*) as paid FROM transactions WHERE status='paid'").then(r=>[r[0]]); const [[c]] = await conn.query("SELECT COUNT(*) as created FROM transactions WHERE status='created'").then(r=>[r[0]]); const [[r]] = await conn.query("SELECT COUNT(*) as refused FROM transactions WHERE status='refused'").then(r=>[r[0]]); await conn.end(); res.json({ total:t.total, paid:p.paid, created:c.created, refused:r.refused }); }catch(e){console.error(e);res.status(500).json({error:e.message});}
});

app.get('/', (req,res)=>res.json({ ok:true }));

const PORT = process.env.PORT || 3333;
app.listen(PORT, ()=>console.log('Vorkspay backend running on', PORT));
