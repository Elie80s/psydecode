// Payment Service - Secure Server-Side Integration
// Handles card and mobile money payment sessions

const BASE_URL = 'https://api.saspay.me/api/v1';

/**
 * Creates a hosted checkout session
 */
async function createCheckoutSession({
  apiKey,
  orderId,
  productName,
  productId,
  priceEur,
  customerName,
  customerEmail,
  customerPhone,
  returnUrl,
  currency = 'EUR',
  rate = 655.957,
  country = null,
  paymentMethod = 'card'
}) {
  if (!apiKey) {
    throw new Error('API key is missing');
  }

  // Calculate amount based on payment method and currency
  let amountStr;
  let finalCurrency = (currency || 'EUR').toUpperCase();

  // If card payment or EUR currency: charge directly in EUR
  if (paymentMethod === 'card' || finalCurrency === 'EUR') {
    amountStr = Number(priceEur).toFixed(2);
    finalCurrency = 'EUR';
  } else if (finalCurrency === 'USD') {
    amountStr = Number(priceEur).toFixed(2);
  } else if (finalCurrency === 'XOF') {
    // Round to clean integer for CFA Francs (Mobile Money)
    const xofAmount = Math.round(Number(priceEur) * Number(rate));
    amountStr = `${xofAmount}.00`;
  } else {
    // Default fallback
    amountStr = Number(priceEur).toFixed(2);
    finalCurrency = 'EUR';
  }

  // Normalise phone number only if provided
  let phone = (customerPhone || '').trim();
  if (phone) {
    if (!phone.startsWith('+')) {
      if (phone.startsWith('00')) {
        phone = '+' + phone.substring(2);
      } else if (country === 'BJ' && (phone.length === 8 || phone.length === 10)) {
        phone = '+229' + phone;
      }
    }
  }

  const payload = {
    amount: amountStr,
    currency: finalCurrency,
    description: productName || 'Commande PsyDécode',
    customer_name: customerName || 'Client PsyDécode',
    customer_email: customerEmail,
    customer_phone: phone || '',
    return_url: returnUrl,
    metadata: {
      orderId: String(orderId),
      productId: String(productId || ''),
      paymentMethod: paymentMethod || 'card'
    }
  };

  // Only pass country if explicitly defined (e.g. 'FR', 'BJ', 'CI')
  if (country && typeof country === 'string' && country.trim().length === 2) {
    payload.country = country.trim().toUpperCase();
  }

  const response = await fetch(`${BASE_URL}/checkout-sessions/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || (data.errors ? JSON.stringify(data.errors) : `HTTP ${response.status}`);
    throw new Error(`Erreur passerelle de paiement: ${errorMsg}`);
  }

  const session = data.data || data;

  return {
    sessionId: session.id,
    checkoutUrl: session.checkout_url || session.url,
    amount: amountStr,
    currency: finalCurrency,
    status: session.status || 'PENDING'
  };
}

/**
 * Checks the status of a checkout session
 */
async function checkCheckoutStatus(apiKey, sessionId) {
  if (!apiKey || !sessionId) {
    throw new Error('API key and sessionId are required');
  }

  const response = await fetch(`${BASE_URL}/checkout-sessions/${sessionId}/status/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  const result = data.data || data;
  const status = (result.status || '').toUpperCase();
  const isPaid = status === 'PAID' || status === 'SUCCESS' || status === 'COMPLETED';

  return {
    id: result.id,
    status: result.status,
    isPaid: isPaid,
    paidAt: result.paid_at || null
  };
}

module.exports = {
  createCheckoutSession,
  checkCheckoutStatus
};
