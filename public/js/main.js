// PsyDécode - Main Interactive Script
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initNewsletterForms();
  initArticleLikes();
  initCheckoutModals();
  initScrollReveal();
});

// Toast notification helper
function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bg = type === 'success' ? '#141414' : '#2b1010';
  const border = type === 'success' ? '#B8821E' : '#ef4444';
  const icon = type === 'success' ? '✓' : '⚠';

  toast.style.cssText = `
    background: ${bg};
    color: #fff;
    border-left: 4px solid ${border};
    border-radius: 6px;
    padding: 14px 20px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: fadeInUp 0.3s ease forwards;
    pointer-events: auto;
    max-width: 380px;
  `;
  toast.innerHTML = `<span style="color:${border}; font-weight:bold; font-size:16px;">${icon}</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Navbar scroll & mobile toggle
function initNavbar() {
  const nav = document.querySelector('nav');
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });
  }

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
  }
}

// Newsletter subscription handler
function initNewsletterForms() {
  const forms = document.querySelectorAll('.newsletter-form, form[action="#newsletter"]');
  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      if (!emailInput || !emailInput.value) return;

      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value.trim() })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Bienvenue dans le cercle privé PsyDécode ! Surveillez vos emails.', 'success');
          emailInput.value = '';
        } else {
          showToast(data.error || 'Erreur lors de l\'inscription', 'error');
        }
      } catch (err) {
        showToast('Erreur de connexion avec le serveur', 'error');
      }
    });
  });
}

// Article Likes counter
function initArticleLikes() {
  document.addEventListener('click', async (e) => {
    const likeBtn = e.target.closest('.btn-like');
    if (!likeBtn) return;

    const articleId = likeBtn.dataset.id;
    if (!articleId) return;

    try {
      const res = await fetch(`/api/articles/${articleId}/like`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        const countSpan = likeBtn.querySelector('.like-count');
        if (countSpan) countSpan.textContent = data.likes;
        likeBtn.classList.add('liked');
        showToast('Merci pour votre soutien !', 'success');
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  });
}

// Checkout simulation modal
function initCheckoutModals() {
  document.addEventListener('click', (e) => {
    const orderBtn = e.target.closest('.btn-buy');
    if (!orderBtn) return;

    const prodId = orderBtn.dataset.id;
    const prodName = orderBtn.dataset.name;
    const prodPrice = orderBtn.dataset.price;

    openCheckoutModal(prodId, prodName, prodPrice);
  });
}

// ------------------- GEOLOCATION & COUNTRY DETECTION -------------------
function detectVisitorLocation() {
  const cached = sessionStorage.getItem('psy_user_geo');
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
  const lang = (navigator.language || '').toLowerCase();

  // African Mobile Money zone mapping
  const momoTimezones = {
    'africa/porto-novo': { country: 'BJ', name: 'Bénin', dial: '+229', placeholder: '+229 01 XX XX XX XX' },
    'africa/cotonou': { country: 'BJ', name: 'Bénin', dial: '+229', placeholder: '+229 01 XX XX XX XX' },
    'africa/abidjan': { country: 'CI', name: 'Côte d\'Ivoire', dial: '+225', placeholder: '+225 07 XX XX XX XX' },
    'africa/dakar': { country: 'SN', name: 'Sénégal', dial: '+221', placeholder: '+221 77 XX XX XX XX' },
    'africa/lome': { country: 'TG', name: 'Togo', dial: '+228', placeholder: '+228 90 XX XX XX XX' },
    'africa/ouagadougou': { country: 'BF', name: 'Burkina Faso', dial: '+226', placeholder: '+226 70 XX XX XX XX' },
    'africa/douala': { country: 'CM', name: 'Cameroun', dial: '+237', placeholder: '+237 6 XX XX XX XX' },
    'africa/bamako': { country: 'ML', name: 'Mali', dial: '+223', placeholder: '+223 XX XX XX XX' },
    'africa/niamey': { country: 'NE', name: 'Niger', dial: '+227', placeholder: '+227 XX XX XX XX' },
    'africa/libreville': { country: 'GA', name: 'Gabon', dial: '+241', placeholder: '+241 XX XX XX XX' },
    'africa/brazzaville': { country: 'CG', name: 'Congo', dial: '+242', placeholder: '+242 XX XX XX XX' },
    'africa/kinshasa': { country: 'CD', name: 'RDC', dial: '+243', placeholder: '+243 XX XX XX XX' },
    'africa/conakry': { country: 'GN', name: 'Guinée', dial: '+224', placeholder: '+224 XX XX XX XX' }
  };

  if (momoTimezones[tz]) {
    const geo = { isMomoZone: true, ...momoTimezones[tz] };
    sessionStorage.setItem('psy_user_geo', JSON.stringify(geo));
    return geo;
  }

  // European, American, International: Carte Bancaire Only!
  let country = 'FR';
  let dial = '+33';
  let name = 'France';
  let placeholder = '06 12 34 56 78';

  if (tz.includes('paris')) { country = 'FR'; dial = '+33'; name = 'France'; }
  else if (tz.includes('brussels')) { country = 'BE'; dial = '+32'; name = 'Belgique'; }
  else if (tz.includes('zurich') || tz.includes('geneva')) { country = 'CH'; dial = '+41'; name = 'Suisse'; }
  else if (tz.includes('montreal') || tz.includes('toronto')) { country = 'CA'; dial = '+1'; name = 'Canada'; }
  else if (lang.includes('be')) { country = 'BE'; dial = '+32'; name = 'Belgique'; }
  else if (lang.includes('ch')) { country = 'CH'; dial = '+41'; name = 'Suisse'; }
  else if (lang.includes('ca')) { country = 'CA'; dial = '+1'; name = 'Canada'; }

  const geo = {
    isMomoZone: false,
    country: country,
    name: name,
    dial: dial,
    placeholder: placeholder
  };

  sessionStorage.setItem('psy_user_geo', JSON.stringify(geo));
  return geo;
}

// ------------------- ADAPTIVE CHECKOUT MODAL -------------------
function openCheckoutModal(id, name, price) {
  let modal = document.getElementById('checkout-modal');
  if (modal) modal.remove();

  const userGeo = detectVisitorLocation();
  // By default: if in Africa MoMo zone -> 'momo', otherwise -> 'card'
  let currentMethod = userGeo.isMomoZone ? 'momo' : 'card';
  let selectedCountry = userGeo.country || (currentMethod === 'momo' ? 'BJ' : 'FR');

  const xofPrice = Math.round(Number(price) * 655.957).toLocaleString('fr-FR');

  modal = document.createElement('div');
  modal.id = 'checkout-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000; padding: 20px; animation: fadeIn 0.25s ease;
  `;

  function renderModalContent() {
    const isCard = currentMethod === 'card';

    modal.innerHTML = `
      <div style="background: #181410; border: 1px solid rgba(184,130,30,0.4); border-radius: 12px; width: 100%; max-width: 470px; padding: 30px; box-shadow: 0 25px 60px rgba(0,0,0,0.85); position: relative; color: #fff;">
        <button id="close-modal" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: #888; font-size: 22px; cursor: pointer; line-height: 1;">&times;</button>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="background: rgba(184,130,30,0.15); color: #E8A93C; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(184,130,30,0.3);">Téléchargement Immédiat</span>
          <h3 style="font-family: 'Playfair Display', serif; font-size: 22px; margin: 10px 0 4px; color: #fff;">${name}</h3>
          <p style="color: #E8A93C; font-size: 26px; font-weight: 700; margin: 0;">
            ${price} € 
            ${!isCard ? `<span style="font-size: 14px; color: #ccc; font-weight: normal;">(~${xofPrice} FCFA)</span>` : `<span style="font-size: 13px; color: #888; font-weight: normal;">(TTC)</span>`}
          </p>
        </div>

        <!-- Mode de paiement & Sélecteur -->
        ${userGeo.isMomoZone ? `
          <div style="display: flex; gap: 8px; margin-bottom: 16px; background: #221a12; padding: 4px; border-radius: 8px; border: 1px solid #3d2f21;">
            <button type="button" id="tab-btn-momo" style="flex: 1; padding: 8px 10px; font-size: 12px; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; ${!isCard ? 'background: linear-gradient(135deg, #B8821E, #E8A93C); color: #111;' : 'background: transparent; color: #aaa;'}">
              📱 Mobile Money
            </button>
            <button type="button" id="tab-btn-card" style="flex: 1; padding: 8px 10px; font-size: 12px; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; ${isCard ? 'background: linear-gradient(135deg, #B8821E, #E8A93C); color: #111;' : 'background: transparent; color: #aaa;'}">
              💳 Carte Bancaire
            </button>
          </div>
        ` : ''}

        <!-- Reassurance Badge Adapté -->
        <div style="display:flex; align-items:center; justify-content:center; gap:8px; padding:10px 14px; background:rgba(232,169,60,0.06); border:1px solid rgba(232,169,60,0.2); border-radius:8px; font-size:12px; color:#ddd; margin-bottom: 16px;">
          ${isCard ? `
            <span>💳 <strong>Carte Bancaire</strong> (Visa, Mastercard, CB)</span>
            <span style="color:#666;">•</span>
            <span>🔒 <strong>3D-Secure SSL</strong></span>
          ` : `
            <span>📱 <strong>MTN, Moov, Wave, Celtiis</strong></span>
            <span style="color:#666;">•</span>
            <span>🔒 <strong>SSL 256-bit</strong></span>
          `}
        </div>

        <form id="checkout-form" style="display: flex; flex-direction: column; gap: 13px;">
          <div>
            <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 5px;">Votre Nom & Prénom</label>
            <input type="text" id="cust-name" required placeholder="Alexandre Martin" style="width: 100%; padding: 11px 12px; border-radius: 6px; background: #241e17; border: 1px solid #443729; color: #fff; font-size: 14px;">
          </div>

          <div>
            <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 5px;">Email de réception de votre accès</label>
            <input type="email" id="cust-email" required placeholder="votre.email@domaine.com" style="width: 100%; padding: 11px 12px; border-radius: 6px; background: #241e17; border: 1px solid #443729; color: #fff; font-size: 14px;">
          </div>

          ${!isCard ? `
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <label style="font-size: 12px; color: #aaa;">Pays Mobile Money</label>
                <select id="cust-country" style="background: #241e17; color: #E8A93C; border: 1px solid #443729; border-radius: 4px; padding: 2px 6px; font-size: 11.5px;">
                  <option value="BJ" ${selectedCountry === 'BJ' ? 'selected' : ''}>🇧🇯 Bénin (+229)</option>
                  <option value="CI" ${selectedCountry === 'CI' ? 'selected' : ''}>🇨🇮 Côte d'Ivoire (+225)</option>
                  <option value="SN" ${selectedCountry === 'SN' ? 'selected' : ''}>🇸🇳 Sénégal (+221)</option>
                  <option value="TG" ${selectedCountry === 'TG' ? 'selected' : ''}>🇹🇬 Togo (+228)</option>
                  <option value="CM" ${selectedCountry === 'CM' ? 'selected' : ''}>🇨🇲 Cameroun (+237)</option>
                  <option value="BF" ${selectedCountry === 'BF' ? 'selected' : ''}>🇧🇫 Burkina Faso (+226)</option>
                </select>
              </div>
              <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 5px;">Numéro Mobile Money (pour validation)</label>
              <input type="tel" id="cust-phone" required placeholder="${userGeo.placeholder || '+229 01 XX XX XX XX'}" style="width: 100%; padding: 11px 12px; border-radius: 6px; background: #241e17; border: 1px solid #443729; color: #fff; font-size: 14px;">
            </div>
          ` : `
            <div>
              <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 5px;">Numéro de mobile <span style="color:#777; font-weight:normal;">(optionnel, pour confirmation SMS)</span></label>
              <input type="tel" id="cust-phone" placeholder="06 12 34 56 78" style="width: 100%; padding: 11px 12px; border-radius: 6px; background: #241e17; border: 1px solid #443729; color: #fff; font-size: 14px;">
            </div>
          `}

          <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 11px; color: #bbb; cursor: pointer; line-height: 1.4; margin-top: 2px;">
            <input type="checkbox" id="accept-cgv" required checked style="accent-color: #B8821E; margin-top: 2px;">
            <span>J'accepte sans réserve les <a href="/cgv" target="_blank" style="color: #E8A93C; text-decoration: underline;">CGV</a> et je renonce expressément à mon droit de rétractation pour le téléchargement immédiat.</span>
          </label>

          <button type="submit" id="btn-submit-order" style="background: linear-gradient(135deg, #B8821E, #E8A93C); color: #111; font-weight: 700; border: none; padding: 14px; border-radius: 6px; font-size: 14.5px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(184,130,30,0.35); margin-top: 4px;">
            ${isCard ? `🔒 Payer par Carte Bancaire (${price} €)` : `📱 Payer avec Mobile Money (${price} €)`}
          </button>
        </form>

        <!-- Toggle manuel discret si hors zone -->
        ${!userGeo.isMomoZone ? `
          <div style="text-align: center; margin-top: 14px;">
            <button type="button" id="switch-to-momo-link" style="background: none; border: none; color: #888; font-size: 11.5px; cursor: pointer; text-decoration: underline; padding: 0;">
              ${isCard ? '🌍 Vous résidez en Afrique et préférez Mobile Money ? Cliquez ici' : '← Revenir au paiement par Carte Bancaire'}
            </button>
          </div>
        ` : ''}

        <!-- Success & Redirect Card -->
        <div id="checkout-redirecting" style="display: none; text-align: center; padding: 20px 0;">
          <div style="width: 48px; height: 48px; border-radius: 50%; border: 3px solid #E8A93C; border-top-color: transparent; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
          <h4 style="font-size: 18px; font-family: 'Playfair Display', serif; margin-bottom: 8px;">Connexion sécurisée en cours...</h4>
          <p style="color: #aaa; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">Redirection vers votre interface de paiement bancaire sécurisée.</p>
          <a id="btn-fallback-redirect" href="#" target="_top" style="display: block; background: #241e17; border: 1px solid #B8821E; color: #E8A93C; padding: 12px; border-radius: 6px; font-weight: 600; font-size: 13.5px; text-decoration: none;">
            👉 Cliquez ici si vous n'êtes pas redirigé(e) automatiquement
          </a>
        </div>
      </div>
    `;

    // Bind Close
    modal.querySelector('#close-modal').addEventListener('click', () => modal.remove());

    // Bind Tabs if visible
    const tabMomo = modal.querySelector('#tab-btn-momo');
    const tabCard = modal.querySelector('#tab-btn-card');
    if (tabMomo && tabCard) {
      tabMomo.addEventListener('click', () => { currentMethod = 'momo'; renderModalContent(); });
      tabCard.addEventListener('click', () => { currentMethod = 'card'; renderModalContent(); });
    }

    // Bind link toggle
    const toggleLink = modal.querySelector('#switch-to-momo-link');
    if (toggleLink) {
      toggleLink.addEventListener('click', () => {
        currentMethod = currentMethod === 'card' ? 'momo' : 'card';
        renderModalContent();
      });
    }

    // Bind country select
    const countrySelect = modal.querySelector('#cust-country');
    if (countrySelect) {
      countrySelect.addEventListener('change', (e) => {
        selectedCountry = e.target.value;
      });
    }

    // Bind Form Submit
    const form = modal.querySelector('#checkout-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSubmit = modal.querySelector('#btn-submit-order');
      btnSubmit.disabled = true;
      btnSubmit.textContent = '🔒 Connexion sécurisée au paiement...';

      const custName = modal.querySelector('#cust-name').value;
      const custEmail = modal.querySelector('#cust-email').value;
      const custPhone = modal.querySelector('#cust-phone') ? modal.querySelector('#cust-phone').value : '';

      try {
        const res = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: id,
            name: custName,
            email: custEmail,
            phone: custPhone,
            country: selectedCountry,
            paymentMethod: currentMethod
          })
        });
        const data = await res.json();

        if (res.ok && data.checkoutUrl) {
          form.style.display = 'none';
          const redirectBox = modal.querySelector('#checkout-redirecting');
          redirectBox.style.display = 'block';
          const directBtn = modal.querySelector('#btn-fallback-redirect');
          directBtn.href = data.checkoutUrl;

          // Immediate navigation
          setTimeout(() => {
            window.location.href = data.checkoutUrl;
          }, 300);
          return;
        }

        if (res.ok && data.success) {
          // Simulation / Instant unlock
          modal.remove();
          window.location.href = `/commande-validee?order_id=${data.orderId || ''}`;
        } else {
          showToast(data.error || 'Erreur lors de l\'initialisation du paiement', 'error');
          btnSubmit.disabled = false;
          btnSubmit.textContent = isCard ? `🔒 Payer par Carte Bancaire (${price} €)` : `📱 Payer avec Mobile Money (${price} €)`;
        }
      } catch (err) {
        showToast('Erreur de connexion', 'error');
        btnSubmit.disabled = false;
        btnSubmit.textContent = isCard ? `🔒 Payer par Carte Bancaire (${price} €)` : `📱 Payer avec Mobile Money (${price} €)`;
      }
    });
  }

  renderModalContent();
  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Scroll reveal animations
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  reveals.forEach(el => observer.observe(el));
}
