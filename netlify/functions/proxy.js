// ============================================================
// Netlify Function — Proxy hacia Google Apps Script
// Ruta del archivo: netlify/functions/proxy.js
// ============================================================
// Esta función actúa como intermediario entre el frontend y GAS,
// resolviendo el bloqueo CORB/CORS del navegador. Todas las
// peticiones pasan por el servidor de Netlify, no por el navegador.
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwUlVreMf_EvIgtVXSu7l6iFmHQ4ENO3GMw0kndDbGwA7SQcMZFapxbYIxhQouwsKn4GQ/exec';

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
