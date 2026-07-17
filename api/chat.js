// api/chat.js - Rota Serverless para processamento de IA (Abacus.ai API Gateway)
// ATENÇÃO: configure a variável de ambiente ABACUS_API_KEY no Vercel.
// Não deixe chaves hardcoded no código.

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

  // Leitura estrita da chave da Abacus.ai da variável de ambiente
  const apiKey = process.env.ABACUS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Configuração ausente: variável de ambiente ABACUS_API_KEY não definida.' });
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
    // Resposta de segurança imediata — deve ser priorizada e enviada sem conteúdo devocional
    const safetyReply = `Se você está em risco imediato ou pensando em se machucar, entre em contato agora com o CVV (Centro de Valorização da Vida) pelo número 188, ou ligue para o serviço de emergência local. Procure ajuda profissional imediatamente. Se possível, converse com alguém de confiança neste momento.`;
    return res.status(200).json({ reply: safetyReply, safety: true });
  }

  // System prompt fixo (regra de 4 passos + restrições)
  const systemPrompt = `
Siga sempre a estrutura de 4 passos em TODAS as respostas:

1) Validar e acolher a emoção do usuário com empatia (frase curta).
2) Trazer uma palavra de ânimo e esperança, ancorada na soberania e no amor de Deus (curta e reconfortante).
3) Indicar e citar UMA passagem bíblica reconfortante e pertinente ao tema mencionado (cite referência e um versículo curto; no máximo 1 versículo).
4) Fazer UMA pergunta reflexiva final, breve, que ajude a acalmar os pensamentos.

Restrições obrigatórias:
- Nunca emitir diagnóstico, avaliação de risco ou linguagem clínica.
- Nunca desencorajar a busca por ajuda profissional; se o relato indicar sofrimento intenso, incentive buscar ajuda profissional.
- Em caso de menção de ideação suicida, autoagressão ou risco iminente, retornar IMEDIATAMENTE a mensagem padrão de emergência (número CVV 188 e serviço de emergência local) — NÃO inclua conteúdo devocional antes da mensagem de segurança.
- Mantenha o tom acolhedor, respeitoso e sucinto. Respostas devem ser curtas (ideal 3–6 frases) e não devem conter longos sermões.
- Ao citar a passagem bíblica, inclua a referência e apenas até 1-2 frases do versículo.
- Se o usuário pedir aconselhamento técnico ou factual (ex.: "quanto é 1+1?"), responda de forma direta e objetiva; em seguida, ofereça uma frase empática curta e uma pergunta reflexiva (siga os 4 passos mas seja breve no passo 2 e 3 quando a pergunta for factual).

Responda em português.
`.trim();

  // Payload para a API Abacus.ai (OpenAI-compatible). Ajuste "model" conforme sua conta.
  const url = 'https://api.abacus.ai/v1/chat/completions';
  const payload = {
    model: 'gemini-1.5-flash', // ALTERE para o ID do modelo disponível na sua conta Abacus.ai se necessário
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 400
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro Abacus API:', response.status, errText);
      return res.status(response.status).json({ error: 'Erro na API do Abacus.ai: ' + errText });
    }

    const data = await response.json();

    // Compatibilidade com estrutura de resposta OpenAI-compatible
    let replyText = '';
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      replyText = data.choices[0].message.content;
    } else if (data.choices && data.choices[0] && data.choices[0].text) {
      // fallback para algumas APIs que retornam text
      replyText = data.choices[0].text;
    } else if (data.error) {
      console.error('Resposta inesperada da API Abacus:', data);
      return res.status(500).json({ error: 'Resposta inesperada da API Abacus.' });
    } else {
      replyText = '';
    }

    // Segurança adicional: caso o modelo tente incluir instruções clínicas ou diagnóstico, removemos
    const forbiddenClinical = [/diagnóstico/i, /avaliação de risco/i, /tracei um plano/i];
    const hasForbidden = forbiddenClinical.some(rx => rx.test(replyText));
    if (hasForbidden) {
      // Substitui por mensagem neutra reforçando busca por ajuda profissional
      replyText = 'Sinto muito que você esteja passando por isso. Recomendo que procure ajuda profissional imediatamente. Se estiver em risco, ligue para o CVV (188) ou o serviço de emergência local.';
    }

    return res.status(200).json({ reply: replyText, safety: false });
  } catch (error) {
    console.error('Erro na função Serverless Abacus:', error);
    return res.status(500).json({ error: 'Erro interno ao processar a mensagem: ' + error.message });
  }
}