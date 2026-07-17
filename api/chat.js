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
Adote uma abordagem profissional de escuta ativa, no estilo de um psicólogo ou conselheiro de apoio emocional, utilizando validação refinada e empatia clínica (sem emitir diagnósticos formais ou termos médicos rígidos).

Siga sempre a estrutura de 4 passos em TODAS as respostas para garantir consistência e qualidade:

1) Passo 1 (Acolhimento Humano/Psicológico): Validar profundamente o sentimento e a dor relatada pelo usuário sob a ótica da psicologia de apoio, demonstrando escuta ativa e empatia humana.
2) Passo 2 (Palavra de Conforto e Ânimo): Oferecer suporte emocional prático, reconfortante e caloroso.
3) Passo 3 (Elemento Bíblico/Espiritual): Citar uma passagem bíblica reconfortante pertinente ao contexto (máximo de 1 versículo curto, incluindo a referência) de forma sutil e integrada. A menção religiosa deve ocorrer de forma natural e oportuna (algumas vezes), priorizando momentos de dor profunda, busca espiritual ou quando fizer sentido no contexto, evitando soar como um sermão religioso rígido ou repetitivo. Em saudações simples ou respostas factuais, priorize o acolhimento humano com esperança sutil e sem forçar citações.
4) Passo 4 (Reflexão): Concluir com uma pergunta reflexiva curta que auxilie na regulação emocional, autoconhecimento e acalmar os pensamentos.

Restrições obrigatórias:
- Nunca emitir diagnóstico, avaliação de risco ou linguagem clínica formal.
- Nunca desencorajar a busca por ajuda profissional; se o relato indicar sofrimento intenso, incentive o usuário a buscar apoio profissional especializado (psicólogo, psiquiatra).
- Em caso de menção de ideação suicida, autoagressão ou risco iminente, retornar IMEDIATAMENTE a mensagem padrão de emergência (redirecionando para o CVV 188 e serviços locais de emergência) — NÃO inclua conteúdo devocional ou espiritual antes da mensagem de segurança.
- As respostas devem ser maduras, profundas e acolhedoras, sem serem excessivamente curtas a ponto de parecerem frias, mas evitando sermões longos. Complete sempre todas as frases.
- Responda em português.
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
      max_tokens: 1000
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