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

  // Bloqueio HARD apenas para frases de risco iminente inequívoco.
  // Frases ambíguas ("vontade de morrer", "morrer") são tratadas pelo modelo com acolhimento.
  const riskKeywords = [
    'quero me matar', 'vou me matar', 'me matar hoje', 'me matar agora',
    'vou me suicidar', 'vou cometer suicídio', 'tentei suicídio', 'tentei me matar',
    'planejando me matar', 'acabar com minha vida agora'
  ];

  const promptLower = prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const foundRisk = riskKeywords.some(k => promptLower.includes(k));

  if (foundRisk) {
    const safetyReply = `Eu ouço a sua dor e me preocupo com você. Por favor, ligue agora para o CVV (188) — é gratuito, sigiloso e funciona 24h. Se estiver em risco imediato, chame o SAMU (192). Você não precisa enfrentar isso sozinho. Estou aqui quando quiser continuar conversando.`;
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
- Se o usuário mencionar "morrer", "vontade de morrer" ou dor extrema pela PRIMEIRA vez: acolha com empatia e mude o assunto naturalmente, direcionando para algo positivo ou para o que a pessoa ainda valoriza na vida. NÃO mencione CVV neste momento.
- Se o usuário VOLTAR a falar sobre morrer ou o tema persistir: aí sim, mencione o CVV 188 de forma sutil e breve (ex: "sabia que o CVV 188 pode te ouvir a qualquer hora?"), sem transformar a conversa num aviso repetitivo.
- O foco é SEMPRE manter o diálogo vivo, acolhedor e humano.
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
    // Se a resposta contiver raciocínio do modelo (ex: "Okay, the user said..." ou "First, check the rules"),
    // nós procuramos separar o raciocínio da resposta final real do modelo.
    // Muitos modelos de 'Thinking' (como o DeepSeek R1 ou similar) usam tags <think>...</think>.
    // Modelos que não usam tags às vezes listam o raciocínio no começo e a resposta no final entre aspas ou após quebras de linha.
    
    // 1. Remover tag <think>...</think> se existir
    replyText = replyText.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // 2. Se houver um padrão clássico de texto em inglês analisando as regras (raciocínio exposto sem tags)
    // Procuramos a última parte que realmente se pareça com a resposta final em português.
    // Exemplo: se houver "Final response:", "Possible response:" ou frases longas em inglês antes de uma frase em português.
    if (/[a-zA-Z]{4,}\s+said\s+/i.test(replyText) || /check\s+the\s+rules/i.test(replyText) || /Structure:/i.test(replyText)) {
      // Se detectarmos raciocínio em inglês, vamos tentar encontrar a parte em português que está entre aspas
      // ou após o último parágrafo em inglês.
      const quotesMatch = replyText.match(/"([^"]{10,})"/g);
      if (quotesMatch && quotesMatch.length > 0) {
        // Pega a última frase entre aspas que seja em português
        replyText = quotesMatch[quotesMatch.length - 1].replace(/"/g, '');
      } else {
        // Fallback: se houver linhas em português no final, vamos isolar
        const paragraphs = replyText.split('\n');
        const portugueseParagraphs = paragraphs.filter(p => {
          const cleanP = p.trim();
          if (cleanP.length < 5) return false;
          // Se tiver muitas palavras em inglês comuns nas instruções, descarta
          if (/user\s+said|first\s+check|rules:|Brazilian\s+Portuguese|reflective\s+question|biblical\s+verse|emergency\s+message/i.test(cleanP)) {
            return false;
          }
          return true;
        });
        if (portugueseParagraphs.length > 0) {
          replyText = portugueseParagraphs[portugueseParagraphs.length - 1];
        }
      }
    }

    const junkPatterns = [
      /User Safety\s*:\s*\w+/gi,                  // "User Safety: safe"
      /Safety\s*:\s*\w+/gi,                        // "Safety: safe"
      /\bsafe\b\s*$/gi,                            // "safe" solto no final
      /Content Safety\s*:\s*\w+/gi,                // "Content Safety: safe"
      /\[?\/?INST\]?/gi,                           // tokens de instrução [INST] [/INST]
      /<\|.*?\|>/g,                                // tokens especiais <|end|>, <|assistant|>
      /```[\s\S]*?```/g,                           // blocos de código acidentais
      /^(Step|Passo|Check|Note|Let me|We need|We must|I need|I will|Here|Possible response|Final response|Structure)[^\n]*$/gim,  // raciocínio interno em inglês
      /^\s*\d+\)\s*(Acolhimento|Conforto|Elemento|Reflexão)[^\n]*$/gim,               // rótulos de passos
      /---+/g,                                     // separadores
    ];

    for (const pattern of junkPatterns) {
      replyText = replyText.replace(pattern, '');
    }

    // Remove linhas em branco extras resultantes da limpeza
    replyText = replyText.replace(/\n{3,}/g, '\n\n').trim();

    // Se após toda a limpeza a resposta ficou vazia ou muito curta, coloque um fallback amigável 
    // em vez de quebrar ou dar erro de "Resposta do gateway vazia"
    if (!replyText || replyText.length < 5) {
      replyText = "Compreendo perfeitamente o que você está compartilhando. Gostaria de me contar um pouco mais sobre como tem lidado com isso no seu dia a dia?";
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