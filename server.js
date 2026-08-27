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
    name,
    price: parseFloat(price),
    stock: parseInt(stock),
    vendor_id: req.user.id,
    vendor_store_name: req.user.store_name,
    image: image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500'
  };
  db.products.push(newProduct);
  res.status(201).json({ success: true, product: newProduct });
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
  const prodId = parseInt(req.params.id);
  const index = db.products.findIndex(p => p.id === prodId && (p.vendor_id === req.user.id || req.user.role === 'ADMIN'));
  if (index === -1) return res.status(403).json({ error: 'غير مصرح أو المنتج غير موجود' });
  db.products.splice(index, 1);
  res.json({ success: true });
});

// --- ORDERS & IDEMPOTENCY ENDPOINT ---
app.post('/api/orders', (req, res) => {
  const idemKey = req.headers['idempotency-key'];
  if (idemKey && db.processedKeys.has(idemKey)) {
    return res.status(409).json({ error: 'تم تنفيذ هذا الطلب سابقاً (Idempotency Protect)' });
  }

  const { guestName, guestPhone, items } = req.body;
  let total = 0;

  for (const item of items) {
    const prod = db.products.find(p => p.id === item.productId);
    if (!prod || prod.stock < item.quantity) {
      return res.status(400).json({ error: `المخزون غير كافٍ للمنتج: ${item.name || item.productId}` });
    }
  }

  for (const item of items) {
    const prod = db.products.find(p => p.id === item.productId);
    prod.stock -= item.quantity;
    total += prod.price * item.quantity;
  }

  const newOrder = { id: 'ORD-' + Date.now(), guestName, guestPhone, items, total, createdAt: new Date() };
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