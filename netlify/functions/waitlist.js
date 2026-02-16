// ═══════════════════════════════════════════════════════
// DraftCrypto — Waitlist Netlify Function
// Proxies email signups to Google Apps Script (Sheet)
// The Apps Script URL is stored as env var, never exposed to browser
// ═══════════════════════════════════════════════════════

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Validate env var exists
  const webhookUrl = process.env.WAITLIST_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('WAITLIST_WEBHOOK_URL not configured');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Waitlist not configured' }),
    };
  }

  try {
    const { email, referralCode, source } = JSON.parse(event.body || '{}');

    // Basic email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email address' }),
      };
    }

    // Forward to Google Apps Script
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        referralCode: referralCode || '',
        source: source || 'website',
        userAgent: event.headers['user-agent'] || '',
        ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || '',
      }),
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        position: data.position || Math.floor(Math.random() * 200) + 50,
      }),
    };
  } catch (err) {
    console.error('Waitlist error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Something went wrong. Try again.' }),
    };
  }
};
