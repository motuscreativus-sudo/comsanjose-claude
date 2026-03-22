// api/proxy.js
export default async function handler(req, res) {
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfVAfCT0v9l9Wu263VGJCr93g6xdbkvwcpXLwoEyeO2U5TsdUTtDrfjskrqXY8_IJc_g/exec';

  // Manejar el preflight de CORS (por si acaso)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido' });
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(req.body),
      headers: { 'Content-Type': 'application/json' }
    });

    // IMPORTANTE: Leemos el texto primero para depurar si no es JSON
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      return res.status(200).json(data);
    } catch (parseError) {
      console.error('La respuesta de Google no es JSON:', text);
      return res.status(500).json({ 
        success: false, 
        error: 'Respuesta inválida del servidor central.',
        details: text.substring(0, 100) 
      });
    }

  } catch (error) {
    console.error('Error en Proxy:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error de conexión con el proxy.' 
    });
  }
}
