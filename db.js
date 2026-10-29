const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'psydecode.db');
const db = new Database(DB_PATH);

// Enable WAL mode for high performance & concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ------------------- SCHEMA INITIALIZATION -------------------
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT,
      category TEXT DEFAULT 'psychologie',
      categoryName TEXT DEFAULT 'Psychologie',
      readTime TEXT DEFAULT '5 min',
      date TEXT,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      popular INTEGER DEFAULT 0,
      image TEXT,
      tags TEXT,
      content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subtitle TEXT,
      format TEXT DEFAULT 'E-book PDF',
      price REAL NOT NULL,
      originalPrice REAL,
      badge TEXT,
      category TEXT DEFAULT 'ebook',
      image TEXT,
      description TEXT,
      features TEXT,
      downloadUrl TEXT,
      salesCount INTEGER DEFAULT 0,
      rating REAL DEFAULT 5.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      date TEXT,
      source TEXT DEFAULT 'Site Web',
      status TEXT DEFAULT 'Actif',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      orderId TEXT UNIQUE,
      productId TEXT,
      productName TEXT,
      amount REAL,
      customerEmail TEXT,
      customerName TEXT,
      customerPhone TEXT,
      sessionId TEXT,
      accessCode TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      subject TEXT,
      message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
    CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date);
    CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
  `);

  try { db.exec('ALTER TABLE orders ADD COLUMN customerPhone TEXT'); } catch(e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN sessionId TEXT'); } catch(e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN country TEXT'); } catch(e) {}
  try { db.exec('ALTER TABLE orders ADD COLUMN paymentMethod TEXT'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_orders_orderId ON orders(orderId)'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_orders_sessionId ON orders(sessionId)'); } catch(e) {}

  migrateFromJsonIfEmpty();
}

// ------------------- DATA MIGRATION FROM JSON -------------------
function migrateFromJsonIfEmpty() {
  // 1. Articles Migration
  const countArticles = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
  if (countArticles === 0) {
    const articlesJsonPath = path.join(DATA_DIR, 'articles.json');
    if (fs.existsSync(articlesJsonPath)) {
      try {
        const raw = fs.readFileSync(articlesJsonPath, 'utf8');
        const articles = JSON.parse(raw);
        const insert = db.prepare(`
          INSERT INTO articles (id, slug, title, excerpt, category, categoryName, readTime, date, views, likes, featured, popular, image, tags, content)
          VALUES (@id, @slug, @title, @excerpt, @category, @categoryName, @readTime, @date, @views, @likes, @featured, @popular, @image, @tags, @content)
        `);
        const insertMany = db.transaction((items) => {
          for (const item of items) {
            insert.run({
              id: String(item.id),
              slug: item.slug || String(item.id),
              title: item.title,
              excerpt: item.excerpt || '',
              category: item.category || 'psychologie',
              categoryName: item.categoryName || 'Psychologie',
              readTime: item.readTime || '5 min',
              date: item.date || new Date().toISOString().split('T')[0],
              views: item.views || 0,
              likes: item.likes || 0,
              featured: item.featured ? 1 : 0,
              popular: item.popular ? 1 : 0,
              image: item.image || '/images/article-seduction.jpg',
              tags: JSON.stringify(item.tags || []),
              content: item.content || ''
            });
          }
        });
        insertMany(articles);
        console.log(`[SQLite] Migrated ${articles.length} articles from JSON`);
      } catch (e) {
        console.error('[SQLite] Error migrating articles.json:', e);
      }
    }
  }

  // 2. Products Migration
  const countProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (countProducts === 0) {
    const productsJsonPath = path.join(DATA_DIR, 'products.json');
    if (fs.existsSync(productsJsonPath)) {
      try {
        const raw = fs.readFileSync(productsJsonPath, 'utf8');
        const products = JSON.parse(raw);
        const insert = db.prepare(`
          INSERT INTO products (id, name, subtitle, format, price, originalPrice, badge, category, image, description, features, downloadUrl, salesCount, rating)
          VALUES (@id, @name, @subtitle, @format, @price, @originalPrice, @badge, @category, @image, @description, @features, @downloadUrl, @salesCount, @rating)
        `);
        const insertMany = db.transaction((items) => {
          for (const item of items) {
            insert.run({
              id: String(item.id),
              name: item.name,
              subtitle: item.subtitle || '',
              format: item.format || 'E-book PDF',
              price: Number(item.price || 0),
              originalPrice: item.originalPrice !== null && item.originalPrice !== undefined ? Number(item.originalPrice) : null,
              badge: item.badge || '',
              category: item.category || 'ebook',
              image: item.image || '/images/article-seduction.jpg',
              description: item.description || '',
              features: JSON.stringify(item.features || []),
              downloadUrl: item.downloadUrl || '#download',
              salesCount: item.salesCount || 0,
              rating: item.rating || 5.0
            });
          }
        });
        insertMany(products);
        console.log(`[SQLite] Migrated ${products.length} products from JSON`);
      } catch (e) {
        console.error('[SQLite] Error migrating products.json:', e);
      }
    }
  }

  // 3. Subscribers Migration
  const countSubscribers = db.prepare('SELECT COUNT(*) as count FROM subscribers').get().count;
  if (countSubscribers === 0) {
    const subscribersJsonPath = path.join(DATA_DIR, 'subscribers.json');
    if (fs.existsSync(subscribersJsonPath)) {
      try {
        const raw = fs.readFileSync(subscribersJsonPath, 'utf8');
        const subscribers = JSON.parse(raw);
        const insert = db.prepare(`
          INSERT OR IGNORE INTO subscribers (id, email, date, source, status)
          VALUES (@id, @email, @date, @source, @status)
        `);
        const insertMany = db.transaction((items) => {
          for (const item of items) {
            insert.run({
              id: String(item.id),
              email: (item.email || '').toLowerCase().trim(),
              date: item.date || new Date().toISOString(),
              source: item.source || 'Site Web',
              status: item.status || 'Actif'
            });
          }
        });
        insertMany(subscribers);
        console.log(`[SQLite] Migrated ${subscribers.length} subscribers from JSON`);
      } catch (e) {
        console.error('[SQLite] Error migrating subscribers.json:', e);
      }
    }
  }

  // 4. Settings Migration
  const countSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
  if (countSettings === 0) {
    const settingsJsonPath = path.join(DATA_DIR, 'settings.json');
    let settingsObj = {
      siteName: "PsyDécode Club",
      tagline: "Psychologie Comportementale & Art de l'Attraction",
      tiktokHandle: "@psydecode",
      tiktokUrl: "https://www.tiktok.com",
      tiktokFollowers: "250K+",
      tiktokLikes: "4.8M",
      topBannerText: "⚡ Accès privé : Téléchargez le Guide de Séduction Silencieuse à -45% aujourd'hui !",
      topBannerLink: "/boutique.html",
      contactEmail: "contact@psydecode.club"
    };
    if (fs.existsSync(settingsJsonPath)) {
      try {
        const raw = fs.readFileSync(settingsJsonPath, 'utf8');
        settingsObj = { ...settingsObj, ...JSON.parse(raw) };
      } catch (e) {
        console.error('[SQLite] Error reading settings.json:', e);
      }
    }
    const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const insertMany = db.transaction((entries) => {
      for (const [k, v] of entries) {
        insertSetting.run(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    });
    insertMany(Object.entries(settingsObj));
    console.log('[SQLite] Migrated default settings to SQLite');
  }
}

// ------------------- FORMATTING HELPERS -------------------
function formatArticle(row) {
  if (!row) return null;
  let tags = [];
  try {
    tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []);
  } catch (e) {
    tags = row.tags ? row.tags.split(',').map(t => t.trim()) : [];
  }
  return {
    ...row,
    featured: Boolean(row.featured),
    popular: Boolean(row.popular),
    tags
  };
}

function formatProduct(row) {
  if (!row) return null;
  let features = [];
  try {
    features = typeof row.features === 'string' ? JSON.parse(row.features) : (row.features || []);
  } catch (e) {
    features = row.features ? row.features.split('\n').filter(Boolean) : [];
  }
  return {
    ...row,
    price: Number(row.price),
    originalPrice: row.originalPrice !== null && row.originalPrice !== undefined ? Number(row.originalPrice) : null,
    salesCount: Number(row.salesCount || 0),
    rating: Number(row.rating || 5.0),
    features
  };
}

// ------------------- ARTICLES API -------------------
function getArticles({ category, search, featured, sort } = {}) {
  let query = 'SELECT * FROM articles WHERE 1=1';
  const params = [];

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (featured === 'true' || featured === true) {
    query += ' AND featured = 1';
  }

  if (search) {
    query += ' AND (LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ? OR LOWER(tags) LIKE ?)';
    const term = `%${search.toLowerCase()}%`;
    params.push(term, term, term);
  }

  if (sort === 'views') {
    query += ' ORDER BY views DESC, date DESC';
  } else {
    query += ' ORDER BY date DESC, created_at DESC';
  }

  const rows = db.prepare(query).all(...params);
  return rows.map(formatArticle);
}

function getArticleByIdOrSlug(idOrSlug) {
  const row = db.prepare('SELECT * FROM articles WHERE id = ? OR slug = ?').get(String(idOrSlug), String(idOrSlug));
  return formatArticle(row);
}

function createArticle(data) {
  const id = Date.now().toString();
  const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `article-${id}`;
  const tagsJson = JSON.stringify(
    Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',').map(t => t.trim()) : ['Psychologie'])
  );

  const stmt = db.prepare(`
    INSERT INTO articles (id, slug, title, excerpt, category, categoryName, readTime, date, views, likes, featured, popular, image, tags, content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    slug,
    data.title,
    data.excerpt || data.title,
    data.category || 'psychologie',
    data.categoryName || 'Psychologie',
    data.readTime || '5 min',
    data.date || new Date().toISOString().split('T')[0],
    data.views || 0,
    data.likes || 0,
    data.featured ? 1 : 0,
    data.popular ? 1 : 0,
    data.image || '/images/article-seduction.jpg',
    tagsJson,
    data.content || ''
  );

  return getArticleByIdOrSlug(id);
}

function updateArticle(id, data) {
  const existing = getArticleByIdOrSlug(id);
  if (!existing) return null;

  const merged = { ...existing, ...data };
  const tagsJson = JSON.stringify(
    Array.isArray(merged.tags) ? merged.tags : (merged.tags ? String(merged.tags).split(',').map(t => t.trim()) : [])
  );

  const stmt = db.prepare(`
    UPDATE articles SET
      slug = ?,
      title = ?,
      excerpt = ?,
      category = ?,
      categoryName = ?,
      readTime = ?,
      date = ?,
      featured = ?,
      popular = ?,
      image = ?,
      tags = ?,
      content = ?
    WHERE id = ?
  `);

  stmt.run(
    merged.slug,
    merged.title,
    merged.excerpt,
    merged.category,
    merged.categoryName,
    merged.readTime,
    merged.date,
    merged.featured ? 1 : 0,
    merged.popular ? 1 : 0,
    merged.image,
    tagsJson,
    merged.content,
    String(id)
  );

  return getArticleByIdOrSlug(id);
}

function deleteArticle(id) {
  const info = db.prepare('DELETE FROM articles WHERE id = ?').run(String(id));
  return info.changes > 0;
}

function incrementArticleViews(idOrSlug) {
  db.prepare('UPDATE articles SET views = views + 1 WHERE id = ? OR slug = ?').run(String(idOrSlug), String(idOrSlug));
  return getArticleByIdOrSlug(idOrSlug);
}

function incrementArticleLikes(idOrSlug) {
  db.prepare('UPDATE articles SET likes = likes + 1 WHERE id = ? OR slug = ?').run(String(idOrSlug), String(idOrSlug));
  const row = db.prepare('SELECT likes FROM articles WHERE id = ? OR slug = ?').get(String(idOrSlug), String(idOrSlug));
  return row ? row.likes : 0;
}

// ------------------- PRODUCTS API -------------------
function getProducts(category) {
  let query = 'SELECT * FROM products';
  const params = [];
  if (category && category !== 'all') {
    query += ' WHERE category = ?';
    params.push(category);
  }
  query += ' ORDER BY created_at ASC, id ASC';
  const rows = db.prepare(query).all(...params);
  return rows.map(formatProduct);
}

function getProductById(id) {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(String(id));
  return formatProduct(row);
}

function createProduct(data) {
  const id = 'prod-' + Date.now();
  const featuresJson = JSON.stringify(
    Array.isArray(data.features) ? data.features : (data.features ? String(data.features).split('\n').filter(Boolean) : [])
  );

  const stmt = db.prepare(`
    INSERT INTO products (id, name, subtitle, format, price, originalPrice, badge, category, image, description, features, downloadUrl, salesCount, rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.name,
    data.subtitle || '',
    data.format || 'E-book PDF',
    parseFloat(data.price),
    data.originalPrice ? parseFloat(data.originalPrice) : null,
    data.badge || '',
    data.category || 'ebook',
    data.image || '/images/article-seduction.jpg',
    data.description || '',
    featuresJson,
    data.downloadUrl || '#download',
    0,
    5.0
  );

  return getProductById(id);
}

function updateProduct(id, data) {
  const existing = getProductById(id);
  if (!existing) return null;

  const merged = { ...existing, ...data };
  const featuresJson = JSON.stringify(
    Array.isArray(merged.features) ? merged.features : (merged.features ? String(merged.features).split('\n').filter(Boolean) : [])
  );

  const stmt = db.prepare(`
    UPDATE products SET
      name = ?,
      subtitle = ?,
      format = ?,
      price = ?,
      originalPrice = ?,
      badge = ?,
      category = ?,
      image = ?,
      description = ?,
      features = ?,
      downloadUrl = ?
    WHERE id = ?
  `);

  stmt.run(
    merged.name,
    merged.subtitle,
    merged.format,
    parseFloat(merged.price),
    merged.originalPrice ? parseFloat(merged.originalPrice) : null,
    merged.badge,
    merged.category,
    merged.image,
    merged.description,
    featuresJson,
    merged.downloadUrl,
    String(id)
  );

  return getProductById(id);
}

function deleteProduct(id) {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(String(id));
  return info.changes > 0;
}

function incrementProductSales(id) {
  const info = db.prepare('UPDATE products SET salesCount = salesCount + 1 WHERE id = ?').run(String(id));
  return info.changes > 0;
}

// ------------------- SUBSCRIBERS API -------------------
function getSubscribers() {
  return db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC, date DESC').all();
}

function getSubscriberByEmail(email) {
  return db.prepare('SELECT * FROM subscribers WHERE LOWER(email) = LOWER(?)').get(email.trim());
}

function addSubscriber({ email, source }) {
  const cleanEmail = email.trim().toLowerCase();
  const existing = getSubscriberByEmail(cleanEmail);
  if (existing) {
    return { created: false, subscriber: existing };
  }

  const id = 'sub-' + Date.now();
  const date = new Date().toISOString();
  db.prepare(`
    INSERT INTO subscribers (id, email, date, source, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, cleanEmail, date, source || 'Site Web', 'Actif');

  const subscriber = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(id);
  return { created: true, subscriber };
}

function deleteSubscriber(id) {
  const info = db.prepare('DELETE FROM subscribers WHERE id = ?').run(String(id));
  return info.changes > 0;
}

// ------------------- SETTINGS API -------------------
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch (e) {
      settings[row.key] = row.value;
    }
  }

  // Also include dynamic counts
  const articlesCount = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
  const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  settings.articlesCount = articlesCount;
  settings.productsCount = productsCount;

  return settings;
}

function updateSettings(newSettings) {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const updateMany = db.transaction((entries) => {
    for (const [k, v] of entries) {
      if (k === 'articlesCount' || k === 'productsCount') continue;
      stmt.run(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
  });
  updateMany(Object.entries(newSettings));
  return getSettings();
}

// ------------------- ORDERS & STATS -------------------
function addOrder(orderData) {
  const id = 'ord-' + Date.now();
  db.prepare(`
    INSERT INTO orders (id, orderId, productId, productName, amount, customerEmail, customerName, customerPhone, country, paymentMethod, sessionId, accessCode, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    orderData.orderId,
    orderData.productId || null,
    orderData.productName || null,
    parseFloat(orderData.amount || 0),
    orderData.customerEmail || null,
    orderData.customerName || null,
    orderData.customerPhone || null,
    orderData.country || null,
    orderData.paymentMethod || 'card',
    orderData.sessionId || null,
    orderData.accessCode || null,
    orderData.status || 'pending'
  );
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

function getOrderByOrderId(orderId) {
  return db.prepare('SELECT * FROM orders WHERE orderId = ?').get(String(orderId));
}

function getOrderBySessionId(sessionId) {
  return db.prepare('SELECT * FROM orders WHERE sessionId = ?').get(String(sessionId));
}

function updateOrderStatus(orderIdOrSessionId, status) {
  db.prepare('UPDATE orders SET status = ? WHERE orderId = ? OR sessionId = ?').run(
    status,
    String(orderIdOrSessionId),
    String(orderIdOrSessionId)
  );
  return db.prepare('SELECT * FROM orders WHERE orderId = ? OR sessionId = ?').get(
    String(orderIdOrSessionId),
    String(orderIdOrSessionId)
  );
}

function getOrders() {
  return db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
}

function getOrderStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const completed = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalAmount FROM orders WHERE status = 'completed' OR status = 'paid'").get();
  const pending = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get().count;
  return {
    total,
    completed: completed.count,
    pending,
    revenue: completed.totalAmount
  };
}

function addContactMessage({ name, email, subject, message }) {
  const id = 'msg-' + Date.now();
  db.prepare(`
    INSERT INTO contacts (id, name, email, subject, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name || '', email || '', subject || '', message || '');
  return { id, success: true };
}

function getStats() {
  const articlesCount = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
  const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const subscribersCount = db.prepare('SELECT COUNT(*) as count FROM subscribers').get().count;

  const viewsRow = db.prepare('SELECT SUM(views) as totalViews, SUM(likes) as totalLikes FROM articles').get();
  const salesRow = db.prepare('SELECT SUM(salesCount) as totalSales, SUM(salesCount * price) as simulatedRevenue FROM products').get();

  const settings = getSettings();

  return {
    articlesCount,
    productsCount,
    subscribersCount,
    totalViews: viewsRow.totalViews || 0,
    totalLikes: viewsRow.totalLikes || 0,
    totalSales: salesRow.totalSales || 0,
    simulatedRevenue: Math.round(salesRow.simulatedRevenue || 0),
    tiktokFollowers: settings.tiktokFollowers || '250K+'
  };
}

// Initialize on module load
initDb();

module.exports = {
  db,
  initDb,
  // Articles
  getArticles,
  getArticleByIdOrSlug,
  createArticle,
  updateArticle,
  deleteArticle,
  incrementArticleViews,
  incrementArticleLikes,
  // Products
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  incrementProductSales,
  // Subscribers
  getSubscribers,
  getSubscriberByEmail,
  addSubscriber,
  deleteSubscriber,
  // Settings
  getSettings,
  updateSettings,
  // Orders & Contacts
  addOrder,
  getOrders,
  getOrderByOrderId,
  getOrderBySessionId,
  updateOrderStatus,
  addContactMessage,
  // Stats & Orders Tracking
  getStats,
  getOrderStats
};
