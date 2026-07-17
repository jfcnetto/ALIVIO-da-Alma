// api/chat.js - Rota Serverless para processamento de IA (OpenRouter API — tier gratuito)
// ATENÇÃO: configure a variável de ambiente OPENROUTER_API_KEY no Vercel (ambiente Production).
// Não deixe chaves hardcoded no código.
//
// Opcionais:
//   SITE_URL  -> ex.: https://aliviodaalma.com.br
//   SITE_NAME -> ex.: Alívio da Alma
//
// Para aumentar de fato a cota diária (50 -> 1000 req/dia), compre US$10 de crédito
// uma única vez em https://openrouter.ai/credits (não expira, é decisão de conta, não de código).

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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Configuração ausente: variável de ambiente OPENROUTER_API_KEY não definida.' });
  }

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Corpo da requisição inválido: prompt ausente.' });
  }

  // Lista simples de palavras-chave sinalizando ideação suicida / autoagressão ou risco iminente
  const riskKeywords = [
    'suicídio', 'suicidio', 'me matar', 'quero morrer', 'quero me matar', 'acabar com minha vida',
    'me machucar', 'me ferir', 'tirar a minha vida', 'ideação suicida', 'ideacao suicida', 'me matar hoje'
  ];

  const promptLower = prompt.toLowerCase();
  const foundRisk = riskKeywords.some(k => promptLower.includes(k));

  if (foundRisk) {
    const safetyReply = `Se você está em risco imediato ou pensando em se machucar, entre em contato agora com o CVV (Centro de Valorização da Vida) pelo número 188, ou ligue para o serviço de emergência local. Procure ajuda profissional imediatamente. Se possível, converse com alguém de confiança neste momento.`;
    return res.status(200).json({ reply: safetyReply, safety: true });
  }

  const systemPrompt = `
REGRAS DE FORMATO (OBEDEÇA RIGOROSAMENTE):
- Responda EXCLUSIVAMENTE em português brasileiro. NUNCA use inglês.
- NUNCA exiba raciocínio interno, planejamento ou anotações. Envie APENAS a resposta final.
- Resposta CURTA: no MÁXIMO 4 linhas. Seja breve como numa conversa real entre duas pessoas.
- Tom CONVERSACIONAL: fale como um amigo acolhedor e sábio, não como um robô ou palestrante. Use linguagem natural e calorosa.
- SEMPRE termine com uma pergunta curta para manter o diálogo fluindo.
- NÃO rotule passos ("Passo 1", "Passo 2"). Flua naturalmente.

PAPEL:
Você é um conselheiro de apoio emocional do ALIVIO da Alma. Escute com empatia, valide sentimentos e incentive a conversa. Quando houver dor profunda, pode incluir 1 versículo bíblico curto de forma natural — mas NÃO force em toda resposta.

RESTRIÇÕES:
- Sem diagnósticos ou linguagem clínica.
- Se houver sofrimento intenso, sugira buscar um profissional.
- Em menção de suicídio ou autoagressão, retorne APENAS mensagem de emergência com CVV 188.
`.trim();

  const url = 'https://openrouter.ai/api/v1/chat/completions';

  // Cadeia de fallback: se o roteador automático ou um modelo específico estiver
  // sobrecarregado (429), tenta o próximo da lista antes de desistir.
  // A lista de modelos :free muda com o tempo — confira a atual em openrouter.ai/models?max_price=0
  const FALLBACK_MODELS = [
    process.env.OPENROUTER_MODEL || 'openrouter/free',
    'deepseek/deepseek-chat-v3-0324:free',
    'meta-llama/llama-4-maverick:free',
    'google/gemini-2.0-flash-exp:free'
  ];

  async function callOpenRouter(model, prompt) {
    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 300
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.SITE_URL || 'https://aliviodaalma.com.br',
        'X-Title': process.env.SITE_NAME || 'Alívio da Alma'
      },
      body: JSON.stringify(payload)
    });

    return response;
  }

  try {
    let response = null;
    let lastErrText = '';
    let lastStatus = 500;

    for (const model of FALLBACK_MODELS) {
      response = await callOpenRouter(model, prompt);

      if (response.ok) break; // sucesso, sai do loop

      lastStatus = response.status;
      lastErrText = await response.text();
      console.error(`Erro OpenRouter (modelo ${model}):`, lastStatus, lastErrText);

      // 429 = rate limit / sobrecarga: tenta o próximo modelo da lista.
      // Qualquer outro erro (401, 400, etc.) não vai se resolver trocando de modelo: para o loop.
      if (lastStatus !== 429) break;
    }

    if (!response.ok) {
      // Mensagem amigável para rate limit; técnica para os demais casos (aparece nos logs da Vercel)
      if (lastStatus === 429) {
        return res.status(429).json({
          error: 'Estamos com alta demanda no momento. Por favor, aguarde um instante e tente novamente.'
        });
      }
      return res.status(lastStatus).json({ error: 'Erro na API do OpenRouter: ' + lastErrText });
    }

    const data = await response.json();

    let replyText = '';
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      replyText = data.choices[0].message.content;
    } else if (data.choices && data.choices[0] && data.choices[0].text) {
      replyText = data.choices[0].text;
    } else if (data.error) {
      console.error('Resposta inesperada da API OpenRouter:', data);
      return res.status(500).json({ error: 'Resposta inesperada da API OpenRouter.' });
    } else {
      replyText = '';
    }

    // ── Sanitização: remove lixo/metadados que modelos gratuitos às vezes vazam ──
    const junkPatterns = [
      /User Safety\s*:\s*\w+/gi,                  // "User Safety: safe"
      /Safety\s*:\s*\w+/gi,                        // "Safety: safe"
      /\bsafe\b\s*$/gi,                            // "safe" solto no final
      /Content Safety\s*:\s*\w+/gi,                // "Content Safety: safe"
      /\[?\/?INST\]?/gi,                           // tokens de instrução [INST] [/INST]
      /<\|.*?\|>/g,                                // tokens especiais <|end|>, <|assistant|>
      /```[\s\S]*?```/g,                           // blocos de código acidentais
      /^(Step|Passo|Check|Note|Let me|We need|We must|I need|I will|Here)[^\n]*$/gim,  // raciocínio interno em inglês
      /^\s*\d+\)\s*(Acolhimento|Conforto|Elemento|Reflexão)[^\n]*$/gim,               // rótulos de passos
      /---+/g,                                     // separadores
    ];

    for (const pattern of junkPatterns) {
      replyText = replyText.replace(pattern, '');
    }

    // Remove linhas em branco extras resultantes da limpeza
    replyText = replyText.replace(/\n{3,}/g, '\n\n').trim();

    const forbiddenClinical = [/diagnóstico/i, /avaliação de risco/i, /tracei um plano/i];
    const hasForbidden = forbiddenClinical.some(rx => rx.test(replyText));
    if (hasForbidden) {
      replyText = 'Sinto muito que você esteja passando por isso. Recomendo que procure ajuda profissional imediatamente. Se estiver em risco, ligue para o CVV (188) ou o serviço de emergência local.';
    }

    return res.status(200).json({ reply: replyText, safety: false });
  } catch (error) {
    console.error('Erro na função Serverless OpenRouter:', error);
    return res.status(500).json({ error: 'Erro interno ao processar a mensagem: ' + error.message });
  }
}