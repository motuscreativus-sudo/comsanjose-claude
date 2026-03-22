// ============================================================
// Vercel Serverless Function — Proxy hacia Google Apps Script
// Ruta del archivo: api/proxy.js
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxLCVkF_jA5Py2JRmaOaUBtk9bRxcTntaJ2rNouaaeuR2b1Xnr8lsHZEH-A4XfrZhNzlA/exec';

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    let gasUrl = GAS_URL;
    let fetchOptions = { redirect: 'follow' };

    if (req.method === 'GET') {
      const qs = new URLSearchParams(req.query).toString();
      if (qs) gasUrl = `${GAS_URL}?${qs}`;
      fetchOptions.method = 'GET';

    } else if (req.method === 'POST') {
      fetchOptions.method = 'POST';
      fetchOptions.body = typeof req.body === 'string'
        ? req.body
        : new URLSearchParams(req.body).toString();
    }

    const response = await fetch(gasUrl, fetchOptions);
    const text = await response.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('GAS devolvió no-JSON:', text.substring(0, 200));
      return res.status(502).json({ success: false, error: 'Respuesta inválida del servidor' });
    }

    return res.status(200).json(json);

  } catch (err) {
    console.error('Proxy error:', err.message);
    return res.status(500).json({ success: false, error: 'Error del proxy: ' + err.message });
  }
}
// ============================================================
// Netlify Function — Proxy hacia Google Apps Script
// Ruta del archivo: netlify/functions/proxy.js
// ============================================================
// Esta función actúa como intermediario entre el frontend y GAS,
// resolviendo el bloqueo CORB/CORS del navegador. Todas las
// peticiones pasan por el servidor de Netlify, no por el navegador.
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxZ9BbFl8bGAy6t-RAgUFJJd7Dfh6R1MGerTEPDwEIoVG697TQ8Re2lIPftCphY9h_BsQ/exec';

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Responder preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  try {
    let gasUrl = GAS_URL;
    let fetchOptions = { redirect: 'follow' };

    if (event.httpMethod === 'GET') {
      // Pasar query string al GAS
      const qs = event.rawQuery || event.queryStringParameters
        ? new URLSearchParams(event.queryStringParameters).toString()
        : '';
      if (qs) gasUrl = `${GAS_URL}?${qs}`;
      fetchOptions.method = 'GET';

    } else if (event.httpMethod === 'POST') {
      fetchOptions.method = 'POST';
      fetchOptions.body = event.body;
      // No enviamos Content-Type para evitar preflight en GAS
    }

    const response = await fetch(gasUrl, fetchOptions);
    const text = await response.text();

    // Verificar que la respuesta sea JSON válido
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('GAS devolvió no-JSON:', text.substring(0, 200));
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Respuesta inválida del servidor' })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(json)
    };

  } catch (err) {
    console.error('Proxy error:', err.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Error del proxy: ' + err.message })
    };
  }
};
