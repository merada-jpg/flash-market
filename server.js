const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'flash_market_super_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// قاعدة بيانات مؤقتة في الذاكرة
const db = {
  users: [
    { id: 1, email: 'admin@flashmarket.com', passwordHash: bcrypt.hashSync('Admin123456!', 10), role: 'ADMIN', store_name: 'الإدارة المركزية' },
    { id: 2, email: 'seller@store.com', passwordHash: bcrypt.hashSync('Seller123456!', 10), role: 'SELLER', store_name: 'متجر التقنية' }
  ],
  products: [
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'flash-market-dev-secret-CHANGE-IN-PRODUCTION';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ══════════════════════════════════════════════════════════════
// DATABASE
// ══════════════════════════════════════════════════════════════
const DB_FILE = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SELLER',
    store_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    vendor_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    guest_state TEXT NOT NULL,
    guest_municipality TEXT NOT NULL,
    guest_address TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'PENDING',
    idempotency_key TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    name TEXT NOT NULL,
    vendor_id INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    vendor_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function getAsync(sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}
function allAsync(sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}
function runAsync(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// ══════════════════════════════════════════════════════════════
// SEED DATA
// ══════════════════════════════════════════════════════════════
async function seedDatabase() {
  const admin = await getAsync("SELECT id FROM users WHERE email = ?", ['admin@flashmarket.com']);
  if (admin) return; // already seeded

  const adminHash = await bcrypt.hash('Admin@123456', 10);
  const vendorHash = await bcrypt.hash('Vendor@12345', 10);
  const vendor2Hash = await bcrypt.hash('Vendor2@1234', 10);

  await runAsync(
    "INSERT INTO users (email, password_hash, role, store_name) VALUES (?, ?, ?, ?)",
    ['admin@flashmarket.com', adminHash, 'ADMIN', 'Flash Market HQ']
  );
  const vendor1 = await runAsync(
    "INSERT INTO users (email, password_hash, role, store_name) VALUES (?, ?, ?, ?)",
    ['vendor@flashmarket.com', vendorHash, 'SELLER', 'متجر التقنية الحديثة']
  );
  const vendor2 = await runAsync(
    "INSERT INTO users (email, password_hash, role, store_name) VALUES (?, ?, ?, ?)",
    ['vendor2@flashmarket.com', vendor2Hash, 'SELLER', 'متجر الأزياء']
  );

  // Products for vendor 1
  await runAsync(
    "INSERT INTO products (name, description, price, stock, image, vendor_id) VALUES (?, ?, ?, ?, ?, ?)",
    ['iPhone 15 Pro', 'أحدث هاتف من آبل مع معالج A17 Pro', 145000, 5, 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=500', vendor1.id]
  );
  await runAsync(
    "INSERT INTO products (name, description, price, stock, image, vendor_id) VALUES (?, ?, ?, ?, ?, ?)",
    ['سماعات AirPods Pro', 'سماعات لاسلكية مع إلغاء الضوضاء النشطة', 25000, 12, 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500', vendor1.id]
  );
  await runAsync(
    "INSERT INTO products (name, description, price, stock, image, vendor_id) VALUES (?, ?, ?, ?, ?, ?)",
    ['ماك بوك برو 14"', 'حاسوب محمول للمحترفين مع شريحة M3', 220000, 3, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=500', vendor1.id]
  );

  // Products for vendor 2
  await runAsync(
    "INSERT INTO products (name, description, price, stock, image, vendor_id) VALUES (?, ?, ?, ?, ?, ?)",
    ['ساعة ذكية Ultra', 'ساعة رياضية مقاومة للماء مع GPS', 45000, 8, 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500', vendor2.id]
  );
  await runAsync(
    "INSERT INTO products (name, description, price, stock, image, vendor_id) VALUES (?, ?, ?, ?, ?, ?)",
    ['نظارة شمسية فاخرة', 'نظارة بولارايزد مع حماية UV400', 8500, 20, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500', vendor2.id]
  );

  console.log('✅ Database seeded with demo data');
}

// ══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ══════════════════════════════════════════════════════════════
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, storeName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await getAsync("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const result = await runAsync(
      "INSERT INTO users (email, password_hash, role, store_name) VALUES (?, ?, ?, ?)",
      [email, hash, 'SELLER', storeName || ('متجر ' + email.split('@')[0])]
    );

    const token = jwt.sign({ userId: result.id, role: 'SELLER' }, JWT_SECRET, { expiresIn: '7d' });
    const user = await getAsync("SELECT id, email, role, store_name FROM users WHERE id = ?", [result.id]);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getAsync("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, store_name: user.store_name }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await getAsync("SELECT id, email, role, store_name FROM users WHERE id = ?", [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { storeName, oldPassword, newPassword } = req.body;
    const user = await getAsync("SELECT * FROM users WHERE id = ?", [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let updates = [], params = [];
    if (storeName) { updates.push('store_name = ?'); params.push(storeName); }
    if (oldPassword && newPassword) {
      const valid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Current password incorrect' });
      updates.push('password_hash = ?');
      params.push(await bcrypt.hash(newPassword, 10));
    }
    if (updates.length) {
      params.push(req.userId);
      await runAsync(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    const updated = await getAsync("SELECT id, email, role, store_name FROM users WHERE id = ?", [req.userId]);
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// PRODUCTS ROUTES
// ══════════════════════════════════════════════════════════════
app.get('/api/products', async (req, res) => {
  try {
    const products = await allAsync(
      "SELECT p.*, u.store_name as vendor_store_name, u.email as vendor_email FROM products p JOIN users u ON p.vendor_id = u.id",
      []
    );
    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, stock, image } = req.body;
    const result = await runAsync(
      "INSERT INTO products (name, description, price, stock, image, vendor_id) VALUES (?, ?, ?, ?, ?, ?)",
      [name, description || '', price, stock || 0, image || '', req.userId]
    );
    res.json({ id: result.id, message: 'Product created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const product = await getAsync("SELECT vendor_id FROM products WHERE id = ?", [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.vendor_id !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await runAsync("DELETE FROM products WHERE id = ?", [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// ORDERS ROUTES
// ══════════════════════════════════════════════════════════════
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    let orders;
    if (req.userRole === 'ADMIN') {
      orders = await allAsync("SELECT * FROM orders ORDER BY id DESC LIMIT 100", []);
    } else {
      orders = await allAsync(
        `SELECT DISTINCT o.* FROM orders o 
         JOIN order_items oi ON o.id = oi.order_id 
         WHERE oi.vendor_id = ? ORDER BY o.id DESC`,
        [req.userId]
      );
    }
    for (const order of orders) {
      order.items = await allAsync("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
    }
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { guestName, guestPhone, guestState, guestMunicipality, guestAddress, items } = req.body;
    const idemKey = req.headers['idempotency-key'] || crypto.randomUUID();

    // Idempotency check
    const existing = await getAsync("SELECT id FROM orders WHERE idempotency_key = ?", [idemKey]);
    if (existing) return res.json({ orderId: existing.id, message: 'Order already processed' });

    // Validate items
    if (!items || !items.length) return res.status(400).json({ error: 'No items' });

    let total = 0;
    for (const item of items) total += ((item.price || 0) * (item.quantity || 0));

    const result = await runAsync(
      `INSERT INTO orders (guest_name, guest_phone, guest_state, guest_municipality, guest_address, total_amount, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [guestName, guestPhone, guestState, guestMunicipality, guestAddress, total, idemKey]
    );

    for (const item of items) {
      await runAsync(
        "INSERT INTO order_items (order_id, product_id, quantity, price, name, vendor_id) VALUES (?, ?, ?, ?, ?, ?)",
        [result.id, item.productId, item.quantity, item.price, item.name, item.vendorId]
      );
      // Decrement stock
      await runAsync("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.productId]);
    }

    res.json({ orderId: result.id, message: 'Order created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// STAFF ROUTES
// ══════════════════════════════════════════════════════════════
app.get('/api/staff', authMiddleware, async (req, res) => {
  try {
    const staff = await allAsync("SELECT * FROM staff WHERE vendor_id = ?", [req.userId]);
    res.json({ staff });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/staff', authMiddleware, async (req, res) => {
  try {
    const { email, name, role } = req.body;
    const result = await runAsync(
      "INSERT INTO staff (email, name, role, vendor_id) VALUES (?, ?, ?, ?)",
      [email, name, role, req.userId]
    );
    res.json({ id: result.id, message: 'Staff added' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/staff/:id', authMiddleware, async (req, res) => {
  try {
    await runAsync("DELETE FROM staff WHERE id = ? AND vendor_id = ?", [req.params.id, req.userId]);
    res.json({ message: 'Staff removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// STATIC FILES
// ══════════════════════════════════════════════════════════════
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'flash_market.html');
  if (require('fs').existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.send('<h1>Flash Market Server Running</h1><p>Place flash_market.html in this folder.</p>');
  }
});

// ══════════════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════════════
seedDatabase().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ⚡ Flash Market Server v1.0 — Running                    ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  URL: http://localhost:' + PORT.toString().padEnd(35, ' ') + '║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  🔑 Demo Accounts:                                         ║');
    console.log('║     Admin:  admin@flashmarket.com / Admin@123456          ║');
    console.log('║     Vendor: vendor@flashmarket.com / Vendor@12345         ║');
    console.log('║     Vendor2: vendor2@flashmarket.com / Vendor2@1234       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
  });
});

    { id: 101, name: 'سماعات لاسلكية Pro', price: 89.99, stock: 15, vendor_id: 2, vendor_store_name: 'متجر التقنية', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500' },
    { id: 102, name: 'ساعة ذكية Sport', price: 120.00, stock: 8, vendor_id: 2, vendor_store_name: 'متجر التقنية', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500' }
  ],
  orders: [],
  processedKeys: new Set()
};

// Middleware للتحقق من JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'غير مصرح - الرمز مفقود' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'جلسة غير صالحة أو منتهية' });
    req.user = user;
    next();
  });
};

// --- AUTH ENDPOINTS ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = (email || '').toLowerCase();
  const user = db.users.find(u => u.email === cleanEmail);
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, store_name: user.store_name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, store_name: user.store_name } });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, storeName } = req.body;
  const cleanEmail = (email || '').toLowerCase();
  if (db.users.some(u => u.email === cleanEmail)) {
    return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
  }
  const newUser = {
    id: Date.now(),
    email: cleanEmail,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'SELLER',
    store_name: storeName || `متجر ${cleanEmail.split('@')[0]}`
  };
  db.users.push(newUser);
  const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, store_name: newUser.store_name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: newUser.id, email: newUser.email, role: newUser.role, store_name: newUser.store_name } });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// --- PRODUCTS ENDPOINTS ---
app.get('/api/products', (req, res) => {
  res.json({ products: db.products });
});

app.post('/api/products', authenticateToken, (req, res) => {
  const { name, price, stock, image } = req.body;
  const newProduct = {
    id: Date.now(),
' + Date.now(), guestName, guestPhone, items, total, createdAt: new Date() };
  db.orders.push(newOrder);

  if (idemKey) db.processedKeys.add(idemKey);
  res.status(201).json({ success: true, orderId: newOrder.id, total });
});

app.get('/api/orders', authenticateToken, (req, res) => {
  res.json({ orders: db.orders });
});

app.listen(PORT, () => {
  console.log(`⚡ Flash Market Server running on http://localhost:${PORT}`);
});
