// api/proxy.js
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfVAfCT0v9l9Wu263VGJCr93g6xdbkvwcpXLwoEyeO2U5TsdUTtDrfjskrqXY8_IJc_g/exec';

module.exports = async (req, res) => {
  // Manejar CORS Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Solo se permite POST' });
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(req.body),
      headers: { 'Content-Type': 'application/json' }
    });

    const text = await response.text();

    try {
      const data = JSON.parse(text);
      res.status(200).json(data);
    } catch (e) {
      console.error('Respuesta de Google no es JSON:', text);
      res.status(500).json({ success: false, error: 'Google envió una respuesta no válida' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error de conexión con el proxy' });
  }
};
