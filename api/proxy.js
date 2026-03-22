// api/proxy.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // URL de tu script de Google (Extraída de tu index.html)
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfVAfCT0v9l9Wu263VGJCr93g6xdbkvwcpXLwoEyeO2U5TsdUTtDrfjskrqXY8_IJc_g/exec';

  // Solo permitimos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido' });
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(req.body),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    
    // Devolvemos la respuesta de Google al frontend
    res.status(200).json(data);
  } catch (error) {
    console.error('Error en Proxy:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error de conexión con el servidor central.' 
    });
  }
};
