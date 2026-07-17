// api/chat.js - Rota Serverless para processamento de IA (Abacus.ai API Gateway)

export default async function handler(req, res) {
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
  
  // Usamos a chave de API do Abacus.ai fornecida
  const apiKey = process.env.ABACUS_API_KEY || "s2_3d65c00b8dea4dcd8a1619b282400047";

  if (!apiKey) {
    return res.status(500).json({ error: 'Configuração ausente: chave do Abacus.ai não definida.' });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Corpo da requisição inválido: prompt ausente.' });
  }

  try {
    // Chamada ao endpoint OpenAI-compatible do Abacus.ai
    const url = 'https://api.abacus.ai/v1/chat/completions';
    
    const payload = {
      model: "gemini-1.5-flash", // Utiliza o Gemini 1.5 Flash pela rede de alta performance do Abacus
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 600
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Erro na API do Abacus.ai: ' + errText });
    }

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const replyText = data.choices[0].message.content;
      return res.status(200).json({ reply: replyText });
    } else {
      return res.status(500).json({ error: 'Estrutura de resposta inválida da API do Abacus.' });
    }
  } catch (error) {
    console.error('Erro na função Serverless Abacus:', error);
    return res.status(500).json({ error: 'Erro interno ao processar a mensagem: ' + error.message });
  }
}
