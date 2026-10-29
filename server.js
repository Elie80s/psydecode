const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const db = require('./db');
const payment = require('./payment');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

// Helper to parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.epub': 'application/epub+zip',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Filename');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Response helpers
  const jsonResponse = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify(data));
  };

  const errorResponse = (message, status = 400) => {
    jsonResponse({ error: message }, status);
  };

  // ---------------- API ROUTES (POWERED BY SQLITE) ----------------
  if (pathname.startsWith('/api/')) {
    try {
      // 0. DB STATUS
      if (pathname === '/api/db-status' && method === 'GET') {
        return jsonResponse({
          engine: 'SQLite 3 (better-sqlite3)',
          databaseFile: 'data/psydecode.db',
          mode: 'WAL (Write-Ahead Logging)',
          status: 'online',
          stats: db.getStats()
        });
      }

      // 1. ARTICLES
      if (pathname === '/api/articles' && method === 'GET') {
        const { category, search, featured, sort } = parsedUrl.query;
        const articles = db.getArticles({ category, search, featured, sort });
        return jsonResponse(articles);
      }

      if (pathname.startsWith('/api/articles/') && method === 'GET') {
        const idOrSlug = pathname.replace('/api/articles/', '');
        const article = db.incrementArticleViews(idOrSlug);
        if (!article) return errorResponse('Article introuvable', 404);
        return jsonResponse(article);
      }

      if (pathname === '/api/articles' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.title || !body.content) {
          return errorResponse('Le titre et le contenu sont requis');
        }
        const newArticle = db.createArticle(body);
        return jsonResponse({ success: true, article: newArticle }, 201);
      }

      if (pathname.startsWith('/api/articles/') && method === 'PUT') {
        const id = pathname.replace('/api/articles/', '');
        const body = await parseBody(req);
        const updated = db.updateArticle(id, body);
        if (!updated) return errorResponse('Article non trouvé', 404);
        return jsonResponse({ success: true, article: updated });
      }

      if (pathname.startsWith('/api/articles/') && method === 'DELETE') {
        const id = pathname.replace('/api/articles/', '');
        const deleted = db.deleteArticle(id);
        if (!deleted) return errorResponse('Article introuvable', 404);
        return jsonResponse({ success: true, message: 'Article supprimé avec succès' });
      }

      if (pathname.match(/^\/api\/articles\/([^/]+)\/like$/) && method === 'POST') {
        const match = pathname.match(/^\/api\/articles\/([^/]+)\/like$/);
        const id = match[1];
        const likes = db.incrementArticleLikes(id);
        return jsonResponse({ success: true, likes });
      }

      // 2. PRODUCTS
      if (pathname === '/api/products' && method === 'GET') {
        const { category } = parsedUrl.query;
        const products = db.getProducts(category);
        return jsonResponse(products);
      }

      if (pathname.startsWith('/api/products/') && method === 'GET') {
        const id = pathname.replace('/api/products/', '');
        const product = db.getProductById(id);
        if (!product) return errorResponse('Produit introuvable', 404);
        return jsonResponse(product);
      }

      if (pathname === '/api/products' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.name || !body.price) {
          return errorResponse('Le nom et le prix du produit sont requis');
        }
        const newProduct = db.createProduct(body);
        return jsonResponse({ success: true, product: newProduct }, 201);
      }

      if (pathname.startsWith('/api/products/') && method === 'PUT') {
        const id = pathname.replace('/api/products/', '');
        const body = await parseBody(req);
        const updated = db.updateProduct(id, body);
        if (!updated) return errorResponse('Produit introuvable', 404);
        return jsonResponse({ success: true, product: updated });
      }

      if (pathname.startsWith('/api/products/') && method === 'DELETE') {
        const id = pathname.replace('/api/products/', '');
        const deleted = db.deleteProduct(id);
        if (!deleted) return errorResponse('Produit non trouvé', 404);
        return jsonResponse({ success: true, message: 'Produit supprimé' });
      }

      // 3. SUBSCRIBERS
      if (pathname === '/api/subscribers' && method === 'GET') {
        const subscribers = db.getSubscribers();
        return jsonResponse(subscribers);
      }

      if ((pathname === '/api/subscribers' || pathname === '/api/newsletter') && method === 'POST') {
        const body = await parseBody(req);
        const email = (body.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) {
          return errorResponse('Veuillez entrer une adresse email valide');
        }

        const resSub = db.addSubscriber({ email, source: body.source || 'Site Web' });
        if (!resSub.created) {
          return jsonResponse({ success: true, message: 'Vous êtes déjà inscrit ! Merci de votre fidélité.' });
        }
        return jsonResponse({ success: true, message: 'Félicitations ! Vous êtes bien inscrit aux e-mails privés PsyDécode.' });
      }

      if (pathname.startsWith('/api/subscribers/') && method === 'DELETE') {
        const id = pathname.replace('/api/subscribers/', '');
        const deleted = db.deleteSubscriber(id);
        return jsonResponse({ success: true, message: 'Abonné supprimé' });
      }

      // 4. SETTINGS
      if (pathname === '/api/settings' && method === 'GET') {
        const settings = db.getSettings();
        return jsonResponse(settings);
      }

      if (pathname === '/api/settings' && method === 'POST') {
        const body = await parseBody(req);
        const updated = db.updateSettings(body);
        return jsonResponse({ success: true, settings: updated });
      }

      // 5. GLOBAL STATS
      if (pathname === '/api/stats' && method === 'GET') {
        const stats = db.getStats();
        return jsonResponse(stats);
      }

      // 6. ORDERS & CHECKOUT TRACKING API
      if (pathname === '/api/orders' && method === 'GET') {
        const orders = db.getOrders();
        const stats = db.getOrderStats();
        return jsonResponse({ success: true, orders, stats });
      }

      if (pathname === '/api/orders/verify-status' && method === 'POST') {
        const body = await parseBody(req);
        const orderId = body.orderId;
        if (!orderId) return errorResponse('Identifiant de commande requis');
        let order = db.getOrderByOrderId(orderId);
        if (!order) return errorResponse('Commande introuvable', 404);

        const settings = db.getSettings();
        if (order.sessionId && settings.paymentApiKey && order.status !== 'completed') {
          try {
            const check = await payment.checkCheckoutStatus(settings.paymentApiKey, order.sessionId);
            if (check.isPaid) {
              order = db.updateOrderStatus(order.orderId, 'completed');
              if (order.productId) db.incrementProductSales(order.productId);
            }
          } catch (e) {
            console.error('[Verify Status Error]', e.message);
          }
        }
        return jsonResponse({ success: true, order });
      }

      if (pathname === '/api/orders/mark-completed' && method === 'POST') {
        const body = await parseBody(req);
        const orderId = body.orderId;
        if (!orderId) return errorResponse('Identifiant de commande requis');
        const updated = db.updateOrderStatus(orderId, 'completed');
        if (updated && updated.productId) db.incrementProductSales(updated.productId);
        return jsonResponse({ success: true, order: updated });
      }

      // CREATE CHECKOUT (Adaptive Card & Mobile Money)
      if (pathname === '/api/create-checkout' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.productId) {
          return errorResponse('Identifiant du produit requis');
        }

        const product = db.getProductById(body.productId);
        if (!product) {
          return errorResponse('Produit introuvable', 404);
        }

        const orderId = 'CMD-' + Math.floor(100000 + Math.random() * 900000);
        const accessCode = 'PSY-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const settings = db.getSettings();

        const host = req.headers.host || 'localhost:3000';
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const baseUrl = `${protocol}://${host}`;
        const returnUrl = `${baseUrl}/commande-validee?order_id=${orderId}`;

        // Determine payment method and country
        const reqCountry = (body.country || '').trim().toUpperCase();
        const paymentMethod = body.paymentMethod === 'momo' ? 'momo' : 'card';
        const currency = paymentMethod === 'card' ? 'EUR' : (settings.paymentCurrency || 'XOF');

        // Check if payment gateway is active with an API key configured
        const isGatewayActive = settings.paymentProvider === 'gateway' && settings.paymentApiKey && settings.paymentApiKey.trim().startsWith('sk_');

        if (isGatewayActive) {
          try {
            const session = await payment.createCheckoutSession({
              apiKey: settings.paymentApiKey,
              orderId,
              productName: product.name,
              productId: product.id,
              priceEur: product.price,
              customerName: body.name || 'Client PsyDécode',
              customerEmail: body.email || 'client@psydecode.club',
              customerPhone: body.phone || '',
              returnUrl,
              currency,
              rate: parseFloat(settings.paymentConversionRate) || 655.957,
              country: reqCountry || (paymentMethod === 'momo' ? 'BJ' : null),
              paymentMethod
            });

            db.addOrder({
              orderId,
              productId: product.id,
              productName: product.name,
              amount: product.price,
              customerEmail: body.email,
              customerName: body.name,
              customerPhone: body.phone || null,
              country: reqCountry || (paymentMethod === 'card' ? 'FR' : 'BJ'),
              paymentMethod: paymentMethod,
              sessionId: session.sessionId,
              accessCode,
              status: 'pending'
            });

            return jsonResponse({
              success: true,
              checkoutUrl: session.checkoutUrl,
              sessionId: session.sessionId,
              orderId: orderId
            });
          } catch (payErr) {
            console.error('[Payment Gateway Error]', payErr.message);
            return errorResponse('Impossible d\'initier la session de paiement sécurisée: ' + payErr.message, 502);
          }
        }

        // Mode Simulation par défaut (si aucune clé API active)
        db.incrementProductSales(body.productId);
        db.addOrder({
          orderId,
          productId: body.productId,
          productName: product.name,
          amount: product.price,
          customerEmail: body.email,
          customerName: body.name,
          customerPhone: body.phone || null,
          country: reqCountry || 'FR',
          paymentMethod: paymentMethod,
          sessionId: null,
          accessCode,
          status: 'completed'
        });

        return jsonResponse({
          success: true,
          simulated: true,
          orderId,
          accessCode,
          message: 'Commande validée avec succès ! Votre accès a été débloqué immédiatement.',
          downloadUrl: product.downloadUrl || '/images/article-seduction.jpg'
        });
      }

      // 6b. CHECKOUT STATUS CHECK
      if (pathname === '/api/checkout-status' && method === 'GET') {
        const { session_id, order_id } = parsedUrl.query;
        let order = null;
        if (order_id) order = db.getOrderByOrderId(order_id);
        else if (session_id) order = db.getOrderBySessionId(session_id);

        if (!order) {
          return errorResponse('Commande introuvable', 404);
        }

        const product = order.productId ? db.getProductById(order.productId) : null;
        const downloadUrl = (product && product.downloadUrl) || '/images/article-seduction.jpg';

        if (order.status === 'completed') {
          return jsonResponse({
            success: true,
            status: 'completed',
            orderId: order.orderId,
            accessCode: order.accessCode,
            productName: order.productName,
            downloadUrl
          });
        }

        const settings = db.getSettings();
        if (order.sessionId && settings.paymentApiKey) {
          try {
            const check = await payment.checkCheckoutStatus(settings.paymentApiKey, order.sessionId);
            if (check.isPaid) {
              db.updateOrderStatus(order.orderId, 'completed');
              if (order.productId) db.incrementProductSales(order.productId);
              return jsonResponse({
                success: true,
                status: 'completed',
                orderId: order.orderId,
                accessCode: order.accessCode,
                productName: order.productName,
                downloadUrl
              });
            } else {
              return jsonResponse({
                success: true,
                status: check.status || 'pending',
                orderId: order.orderId
              });
            }
          } catch (err) {
            console.error('[Status Check Error]', err.message);
          }
        }

        return jsonResponse({
          success: true,
          status: order.status,
          orderId: order.orderId
        });
      }

      // 6c. WEBHOOK RECEIVER
      if (pathname === '/api/webhook/payment' && method === 'POST') {
        const body = await parseBody(req);
        const data = body.data || body;
        const sessionId = data.id || (data.session && data.session.id);
        const orderId = (data.metadata && data.metadata.orderId) || (data.session && data.session.metadata && data.session.metadata.orderId);

        let order = null;
        if (orderId) order = db.getOrderByOrderId(orderId);
        else if (sessionId) order = db.getOrderBySessionId(sessionId);

        if (order && order.status !== 'completed') {
          db.updateOrderStatus(order.orderId, 'completed');
          if (order.productId) db.incrementProductSales(order.productId);
          console.log(`[Payment Webhook] Order ${order.orderId} marked as completed`);
        }

        return jsonResponse({ received: true });
      }

      // 6d. LEGACY ORDER SIMULATION
      if (pathname === '/api/order-simulation' && method === 'POST') {
        const body = await parseBody(req);
        const settings = db.getSettings();
        const isGatewayActive = settings.paymentProvider === 'gateway' && settings.paymentApiKey && settings.paymentApiKey.trim().startsWith('sk_');

        if (isGatewayActive && body.productId) {
          const product = db.getProductById(body.productId);
          if (product) {
            const orderId = 'CMD-' + Math.floor(100000 + Math.random() * 900000);
            const accessCode = 'PSY-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const host = req.headers.host || 'localhost:3000';
            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const baseUrl = `${protocol}://${host}`;
            const returnUrl = `${baseUrl}/commande-validee?order_id=${orderId}`;

            try {
              const session = await payment.createCheckoutSession({
                apiKey: settings.paymentApiKey,
                orderId,
                productName: product.name,
                productId: product.id,
                priceEur: product.price,
                customerName: body.name || 'Client PsyDécode',
                customerEmail: body.email || 'client@psydecode.club',
                customerPhone: body.phone || '',
                returnUrl,
                currency: settings.paymentCurrency || 'XOF',
                rate: parseFloat(settings.paymentConversionRate) || 655.957
              });

              db.addOrder({
                orderId,
                productId: product.id,
                productName: product.name,
                amount: product.price,
                customerEmail: body.email,
                customerName: body.name,
                customerPhone: body.phone,
                sessionId: session.sessionId,
                accessCode,
                status: 'pending'
              });

              return jsonResponse({
                success: true,
                checkoutUrl: session.checkoutUrl,
                sessionId: session.sessionId,
                orderId: orderId
              });
            } catch (err) {
              console.error('[Fallback Gateway Error]', err.message);
            }
          }
        }

        const orderId = 'CMD-' + Math.floor(100000 + Math.random() * 900000);
        const accessCode = 'PSY-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        let productName = 'Guide / E-book PsyDécode';
        let amount = 27;

        if (body.productId) {
          const prod = db.getProductById(body.productId);
          if (prod) {
            db.incrementProductSales(body.productId);
            productName = prod.name;
            amount = prod.price;
          }
        }

        db.addOrder({
          orderId,
          productId: body.productId,
          productName,
          amount,
          customerEmail: body.email,
          customerName: body.name,
          customerPhone: body.phone,
          sessionId: null,
          accessCode,
          status: 'completed'
        });

        return jsonResponse({
          success: true,
          orderId,
          accessCode,
          message: 'Commande validée avec succès ! Votre accès a été débloqué immédiatement.',
          downloadUrl: '/images/article-seduction.jpg'
        });
      }

      // 7. CONTACT / SUPPORT
      if (pathname === '/api/contact' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.email || !body.message) {
          return errorResponse('Veuillez renseigner votre email et votre message');
        }
        db.addContactMessage(body);
        return jsonResponse({
          success: true,
          message: 'Votre message a bien été transmis à l\'équipe PsyDécode. Nous vous répondrons sous 24 à 48 heures ouvrées.'
        });
      }

      // 8. FILE UPLOADS (E-books, Audio, Video, Images)
      if (pathname === '/api/upload' && method === 'POST') {
        const uploadDir = path.join(PUBLIC_DIR, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Case A: Raw binary stream with 'x-filename' header
        if (req.headers['x-filename']) {
          const rawName = decodeURIComponent(req.headers['x-filename']);
          const ext = path.extname(rawName).toLowerCase();
          const baseName = path.basename(rawName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `${Date.now()}_${baseName}${ext}`;
          const targetPath = path.join(uploadDir, filename);
          const writeStream = fs.createWriteStream(targetPath);

          req.pipe(writeStream);
          return new Promise((resolve) => {
            writeStream.on('finish', () => {
              const stats = fs.statSync(targetPath);
              jsonResponse({
                success: true,
                url: `/uploads/${filename}`,
                name: filename,
                originalName: rawName,
                size: stats.size,
                ext: ext
              }, 201);
              resolve();
            });
            writeStream.on('error', (err) => {
              errorResponse('Erreur lors de l\'enregistrement: ' + err.message, 500);
              resolve();
            });
          });
        }

        // Case B: JSON body with base64 data
        const body = await parseBody(req);
        if (!body.filename || !body.data) {
          return errorResponse('Nom de fichier et données requis');
        }

        const rawName = body.filename;
        const ext = path.extname(rawName).toLowerCase();
        const baseName = path.basename(rawName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${Date.now()}_${baseName}${ext}`;
        const targetPath = path.join(uploadDir, filename);

        let buffer;
        if (body.data.includes(';base64,')) {
          buffer = Buffer.from(body.data.split(';base64,')[1], 'base64');
        } else {
          buffer = Buffer.from(body.data, 'base64');
        }

        fs.writeFileSync(targetPath, buffer);
        return jsonResponse({
          success: true,
          url: `/uploads/${filename}`,
          name: filename,
          originalName: rawName,
          size: buffer.length,
          ext: ext
        }, 201);
      }

      // 9. LIST UPLOADED FILES
      if (pathname === '/api/uploads' && method === 'GET') {
        const uploadDir = path.join(PUBLIC_DIR, 'uploads');
        if (!fs.existsSync(uploadDir)) return jsonResponse([]);

        const files = fs.readdirSync(uploadDir);
        const list = files.map(file => {
          try {
            const stats = fs.statSync(path.join(uploadDir, file));
            const ext = path.extname(file).toLowerCase();
            let type = 'autre';
            if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) type = 'image';
            else if (['.pdf', '.epub'].includes(ext)) type = 'ebook';
            else if (['.mp3', '.wav', '.m4a'].includes(ext)) type = 'audio';
            else if (['.mp4', '.webm', '.mov'].includes(ext)) type = 'video';

            return {
              name: file,
              url: `/uploads/${file}`,
              size: stats.size,
              date: stats.mtime,
              type: type,
              ext: ext
            };
          } catch (e) {
            return null;
          }
        }).filter(Boolean);

        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        return jsonResponse(list);
      }

      // 10. DELETE UPLOADED FILE
      if (pathname.startsWith('/api/uploads/') && method === 'DELETE') {
        const fileName = path.basename(pathname.replace('/api/uploads/', ''));
        const targetPath = path.join(PUBLIC_DIR, 'uploads', fileName);
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
          return jsonResponse({ success: true, message: 'Fichier supprimé' });
        }
        return errorResponse('Fichier introuvable', 404);
      }

      return errorResponse('Route API non trouvée', 404);
    } catch (apiErr) {
      console.error('[API Error]', apiErr);
      return errorResponse('Erreur interne du serveur: ' + apiErr.message, 500);
    }
  }

  // ---------------- STATIC FILES SERVING ----------------
  // Clean URL aliases
  if (pathname === '/' || pathname === '/index') pathname = '/index.html';
  else if (pathname === '/admin') pathname = '/admin.html';
  else if (pathname === '/articles') pathname = '/articles.html';
  else if (pathname === '/article') pathname = '/article.html';
  else if (pathname === '/boutique') pathname = '/boutique.html';
  else if (pathname === '/a-propos') pathname = '/a-propos.html';
  else if (pathname === '/contact') pathname = '/contact.html';
  else if (pathname === '/commande-validee') pathname = '/commande-validee.html';
  else if (pathname === '/cgv' || pathname === '/mentions-legales' || pathname === '/confidentialite') pathname = '/cgv.html';

  let filePath = path.join(PUBLIC_DIR, pathname);

  // Security check to prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Accès interdit');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>Page non trouvée — PsyDécode</title>
          <link rel="stylesheet" href="/css/style.css">
          <style>
            .not-found { min-height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem; font-family: 'DM Sans', sans-serif; }
            .not-found h1 { font-size: 5rem; margin-bottom: 1rem; color: #d4af37; font-family: 'Playfair Display', serif; }
            .not-found p { font-size: 1.25rem; color: #888; margin-bottom: 2rem; max-width: 500px; }
          </style>
        </head>
        <body class="theme-dark" style="background:#0c0a08; color:#fff;">
          <div class="not-found">
            <h1>404</h1>
            <p>La page demandée est introuvable ou a été déplacée.</p>
            <a href="/" style="background:#B8821E; color:#111; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600;">Retourner à l'accueil</a>
          </div>
        </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // HTTP Caching Headers
    const isImage = ext.match(/\.(jpg|jpeg|png|webp|gif|svg|ico)$/);
    const isFont = ext.match(/\.(woff|woff2)$/);

    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Last-Modified': stats.mtime.toUTCString()
    };

    if (isImage || isFont) {
      headers['Cache-Control'] = 'public, max-age=604800';
    } else {
      // Force no-cache for scripts and HTML so updates apply instantly
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }

    // 304 Not Modified conditional check
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime) {
      res.writeHead(304, headers);
      res.end();
      return;
    }

    // Range requests for video and audio streaming
    const range = req.headers.range;
    if (range && stats.size > 0 && ext.match(/\.(mp4|webm|mov|mp3|wav|m4a)$/)) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800'
      });
      fileStream.pipe(res);
      return;
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[PsyDécode] Server running with SQLite database at http://localhost:${PORT}`);
  console.log(`[PsyDécode] Admin Studio: http://localhost:${PORT}/admin`);
});
