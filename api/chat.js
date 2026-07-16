// api/chat.js - Rota Serverless para processamento de IA (Gemini API Proxy)

export default async function handler(req, res) {
  // CORS Headers simples para permitir chamadas locais e do domínio oficial
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { prompt } = req.body;
  
  // A chave de API deve ser configurada no painel da Vercel/Netlify como variável de ambiente GEMINI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Configuração ausente: GEMINI_API_KEY não definida.' });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Corpo da requisição inválido: prompt ausente.' });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    // Estrutura oficial da requisição do Gemini 1.5
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Erro na API do Gemini: ' + errText });
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
      const replyText = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ reply: replyText });
    } else {
      return res.status(500).json({ error: 'Estrutura de resposta inválida do Gemini.' });
    }
  } catch (error) {
    console.error('Erro na função Serverless:', error);
    return res.status(500).json({ error: 'Erro interno ao processar a mensagem: ' + error.message });
  }
}
