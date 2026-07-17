/**
 * app.js - Alívio da Alma Client-side Application
 * Powered by Local window.ai (Gemini Nano) / Prompt API
 */

// Configurações
const MAX_CONTEXT_INTERACTIONS = 10;
const AD_REFRESH_INTERVAL_MS = 90000; // 90 segundos

// Estado da Aplicação
let contextBuffer = []; // Armazena objetos { role: 'user'|'model', content: string }
let aiSession = null;
let adRefreshTimer = null;
let disclaimerAccepted = false;

// Palavras-chave para Detecção de Crise (Ideação suicida/Automutilação)
const CRISIS_KEYWORDS = [
  'suicid', 'me matar', 'fim da minha vida', 'tirar minha vida', 'dar fim a tudo',
  'desespero extremo', 'automutila', 'cortar meu', 'me cortar', 'quero morrer',
  'queria morrer', 'nao quero mais viver', 'nao aguento mais viver'
];

// Resposta Padrão de Crise (CVV)
const CRISIS_RESPONSE = `Compreendo que você esteja passando por um momento de profunda dor e sofrimento. Quero que saiba que você não está sozinho e que a sua vida tem um valor imenso.

Em momentos de angústia intensa, é fundamental contar com o apoio de quem pode ajudar de verdade. Por favor, entre em contato imediatamente com o **Centro de Valorização da Vida (CVV)** ligando para o número **188**. O atendimento é gratuito, confidencial e está disponível 24 horas por dia.

Se você estiver em perigo imediato, por favor, ligue para o SAMU (192) ou dirija-se ao pronto-socorro mais próximo. Há pessoas preparadas para te acolher e passar por isso junto com você.`;

// Elementos do DOM
const elements = {
  disclaimerOverlay: document.getElementById('disclaimerOverlay'),
  acceptDisclaimerBtn: document.getElementById('acceptDisclaimerBtn'),
  statusBadge: document.getElementById('statusBadge'),
  statusText: document.getElementById('statusText'),
  chatBox: document.getElementById('chatBox'),
  chatInput: document.getElementById('chatInput'),
  sendBtn: document.getElementById('sendBtn'),
  flagsInstructions: document.getElementById('flagsInstructions'),
  gptTopAd: document.getElementById('gptTopAd'),
  gptSidebarAd: document.getElementById('gptSidebarAd')
};

// Prompt de Sistema
const SYSTEM_PROMPT = `Você é o "ALIVIO", um assistente de apoio emocional e espiritual acolhedor, empático e de fé cristã. 
Sua missão é ouvir ativamente o usuário e trazer conforto.

Para cada mensagem enviada pelo usuário, você DEVE obrigatoriamente seguir estes 4 passos na sua resposta:
1. Validar e acolher a emoção ou dor relatada pelo usuário com profunda empatia humana.
2. Trazer uma palavra de ânimo, esperança e amor, ancorada na soberania e no amor de Deus.
3. Indicar e citar por extenso uma passagem bíblica reconfortante que se conecte diretamente com a queixa ou sentimento relatado pelo usuário (por exemplo, Salmos, Mateus, etc.).
4. Concluir com uma pergunta reflexiva final suave, ajudando o usuário a acalmar seus pensamentos e meditar.

Diretrizes Críticas:
- Use um tom calmo, acolhedor e consolador. Nunca julgue.
- Nunca faça diagnósticos de saúde mental, tratamentos médicos ou clínicos.
- Não desencoraje a busca por ajuda médica ou psicológica profissional.
- Se o usuário demonstrar sinais graves de risco à vida, priorize orientar a busca pelo CVV (188) ou ajuda profissional.
- Mantenha respostas concisas, calorosas e fáceis de ler no chat.`;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkDisclaimer();
  initAdRefresh();
});

// Configura eventos de escuta
function setupEventListeners() {
  elements.acceptDisclaimerBtn.addEventListener('click', acceptDisclaimer);
  
  elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  elements.sendBtn.addEventListener('click', sendMessage);

  // Monitora visibilidade da aba para controle de anúncios (RN05)
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

// Verifica se o disclaimer já foi aceito na aba ativa
function checkDisclaimer() {
  if (sessionStorage.getItem('alivio_disclaimer_accepted') === 'true') {
    elements.disclaimerOverlay.style.display = 'none';
    disclaimerAccepted = true;
    checkAiAvailability();
  }
}

// Aceita o disclaimer
function acceptDisclaimer() {
  sessionStorage.setItem('alivio_disclaimer_accepted', 'true');
  elements.disclaimerOverlay.style.display = 'none';
  disclaimerAccepted = true;
  checkAiAvailability();
}

// Atualiza o indicador de status da IA na interface (RN06)
function updateStatus(state, text) {
  elements.statusBadge.className = `status-badge status-${state}`;
  elements.statusText.textContent = text;
  
  if (state === 'online') {
    elements.chatInput.removeAttribute('disabled');
    elements.sendBtn.removeAttribute('disabled');
    elements.flagsInstructions.style.display = 'none';
  } else {
    elements.chatInput.setAttribute('disabled', 'true');
    elements.sendBtn.setAttribute('disabled', 'true');
    if (state === 'error') {
      elements.flagsInstructions.style.display = 'block';
    }
  }
}

// Valida suporte ao window.ai / Prompt API com fallback automático sem setup
async function checkAiAvailability() {
  if (!disclaimerAccepted) return;
  
  updateStatus('verifying', 'Verificando IA Local...');
  
  try {
    if (typeof window.ai === 'undefined' || typeof window.ai.assistant === 'undefined') {
      throw new Error('window.ai desativado ou incompatível');
    }
    
    updateStatus('downloading', 'Iniciando Modelo local...');
    
    const capabilities = await window.ai.assistant.capabilities();
    if (capabilities.available === 'no') {
      throw new Error('Modelo Gemini Nano não disponível.');
    }

    aiSession = await window.ai.assistant.create({
      systemPrompt: SYSTEM_PROMPT
    });
    
    updateStatus('online', 'ALIVIO Online (Local)');
  } catch (err) {
    console.warn('Erro ao conectar ao modelo local window.ai. Ativando fallback automático em nuvem:', err);
    // Ativação automática e silenciosa do fallback
    updateStatus('online', 'ALIVIO Online (Seguro)');
  }
}

// Fallback gratuito da API do Gemini via HTTP (Serverless Proxy)
async function callGeminiFallbackAPI(promptWithContext) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: promptWithContext })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || 'Falha no gateway do chat');
  }

  const data = await response.json();
  if (data.reply) {
    return data.reply;
  } else {
    throw new Error('Resposta do gateway vazia');
  }
}

// Simulador local inteligente aprimorado para o MVP
// Analisa a mensagem atual e o histórico para gerar respostas variadas e empáticas de escuta ativa
function simulateFaithfulResponse(context) {
  const lastUserMsg = contextBuffer.filter(i => i.role === 'user').pop()?.content || "";
  const normalized = lastUserMsg.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Lista de interações anteriores para evitar repetir o mesmo fluxo
  const totalUserMsgs = contextBuffer.filter(i => i.role === 'user').length;
  
  // 1. ANSIEDADE / PREOCUPAÇÃO / MEDO
  if (normalized.includes("ansied") || normalized.includes("ansioso") || normalized.includes("preocupado") || normalized.includes("medo") || normalized.includes("receio") || normalized.includes("futuro")) {
    if (totalUserMsgs <= 2) {
      return `Compreendo perfeitamente a sua ansiedade e o peso que você está carregando em seu coração neste momento. É muito difícil quando os pensamentos não param.

Lembre-se de que o amor de Deus é um porto seguro e soberano. Ele cuida de cada detalhe e conhece as suas aflições antes mesmo de você falar.

Como está escrito em **Filipenses 4:6-7**: "Não andeis ansiosos por coisa alguma; antes em tudo sejam os vossos pedidos conhecidos diante de Deus pela oração e súplica com ações de graças; e a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos pensamentos em Cristo Jesus."

O que você acha de respirar fundo agora e me dizer: qual é a principal preocupação que está tirando o seu sono hoje?`;
    } else {
      return `Eu te entendo... A ansiedade tenta nos fazer sentir que estamos sozinhos na tempestade, mas a presença de Deus é constante. Ele acalma o mar agitado dentro de nós.

Jesus nos ensina em **Mateus 6:34** a não nos preocuparmos com o amanhã, pois o amanhã cuidará de si mesmo. Basta a cada dia o seu próprio mal. Ele nos chama a confiar no cuidado diário do Pai.

Como você se sente ao tentar entregar esse controle nas mãos de Deus? O que é mais difícil para você soltar neste momento?`;
    }
  }
  
  // 2. TRISTEZA / DESÂNIMO / CHORO / CANSADO
  if (normalized.includes("trist") || normalized.includes("desanimo") || normalized.includes("chora") || normalized.includes("choro") || normalized.includes("cansa") || normalized.includes("esgotado")) {
    if (totalUserMsgs <= 2) {
      return `Sinto muito pela dor e pela tristeza profunda que você está sentindo agora. Acolho o seu choro e quero que saiba que suas lágrimas não passam despercebidas pelo Senhor.

Há esperança e amor guardados para você. Deus está bem perto daqueles que têm o coração quebrantado e salva os de espírito abatido.

Como nos conforta o **Salmo 34:18**: "Perto está o Senhor dos que têm o coração quebrantado, e salva os de espírito abatido."

Você gostaria de compartilhar comigo o que trouxe essa nuvem de desânimo ao seu coração hoje?`;
    } else {
      return `Eu compreendo e acolho o seu cansaço. Às vezes o silêncio e o choro são a única oração que conseguimos expressar, e Deus entende cada lágrima.

O **Salmo 30:5** nos lembra que "o choro pode durar uma noite, mas a alegria vem pela manhã." Essa noite vai passar, meu irmão. O Senhor renovará as suas forças.

Olhando para essa situação que te cansa, o que você acha que traria um pouco de alívio ou paz para a sua mente agora?`;
    }
  }

  // 3. SOLIDÃO / ABANDONO / NINGUÉM
  if (normalized.includes("sozinho") || normalized.includes("solidao") || normalized.includes("abandonado") || normalized.includes("ninguem se importa")) {
    return `Essa sensação de solidão pode ser muito dolorosa, mas quero te lembrar que você nunca está de fato sozinho. Deus caminha ao seu lado em cada passo desse vale escuro.

Ele nos promete em **Hebreus 13:5**: "Nunca te deixarei, nunca te abandonarei." E também em **Isaías 41:10**, Ele diz para não termos medo, pois Ele é o nosso Deus e nos segura com Sua mão vitoriosa.

Mesmo quando as pessoas ao seu redor falham, o amor de Deus permanece. O que essa solidão tem dito ao seu coração ultimamente?`;
  }

  // 4. CULPA / PERDÃO / ERRO / PECADO
  if (normalized.includes("culpa") || normalized.includes("errei") || normalized.includes("arrependido") || normalized.includes("perdao") || normalized.includes("pequei")) {
    return `Acolho o seu arrependimento. A culpa tenta nos afastar do Pai, mas o amor de Deus é redentor e Ele está sempre pronto a perdoar e restaurar quem se aproxima com o coração sincero.

A Palavra nos assegura em **1 João 1:9**: "Se confessarmos os nossos pecados, ele é fiel e justo para nos perdoar os pecados e nos purificar de toda injustiça." Não há erro que o sacrifício de Jesus não cubra.

Você consegue sentir e aceitar essa graça sobre a sua vida hoje? O que você sente que precisa perdoar em si mesmo?`;
  }

  // 5. RESPOSTA DE SEGUIMENTO GERAL (Evitando repetição infinita no fluxo da conversa)
  if (totalUserMsgs > 1) {
    const responses = [
      `Agradeço por abrir o seu coração comigo assim. Percebo que há muito sentimento guardado dentro de você. Deus está ouvindo com amor e paciência. Como nos diz o **Salmo 62:8**, devemos derramar o coração diante dEle, pois Ele é o nosso refúgio. O que mais tem passado pela sua mente nesta noite?`,
      
      `Entendo... Suas palavras revelam uma busca sincera por paz. Jesus nos prometeu em **João 14:27**: "Deixo-vos a paz, a minha paz vos dou; não vo-la dou como o mundo a dá." É uma paz que guarda nossa alma mesmo na tormenta. Como você acha que essa paz pode se manifestar na sua vida prática hoje?`,
      
      `Estou aqui te ouvindo com carinho. É importante colocar esses sentimentos para fora. A Bíblia diz no **Salmo 46:1** que "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia." O que te ajudaria a sentir esse socorro bem de perto agora?`
    ];
    // Escolhe uma resposta baseada no número de mensagens para variar sempre
    return responses[(totalUserMsgs - 2) % responses.length];
  }

  // 6. RESPOSTA DE ENTRADA PADRÃO
  return `Acolho o seu desabafo e compreendo que o seu coração esteja buscando respostas e conforto neste momento. Obrigado por compartilhar isso comigo.

Quero te lembrar que Deus está no controle de todas as coisas e o amor dEle por você é infinito e inabalável. Há esperança e uma palavra de paz para a sua jornada.

Lembre-se do que Jesus nos diz em **Mateus 11:28**: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei."

O que está pesando mais em seus ombros hoje que você gostaria de colocar diante de Deus em oração?`;
}

// Envia mensagem e gerencia fluxo do chat
async function sendMessage() {
  const text = elements.chatInput.value.trim();
  if (!text) return;
  
  elements.chatInput.value = '';
  appendMessage('user', text);
  
  // Verifica gatilho de crise
  if (detectCrisis(text)) {
    showTypingIndicator();
    setTimeout(() => {
      removeTypingIndicator();
      appendMessage('bot', CRISIS_RESPONSE, true);
      pushToBuffer('user', text);
      pushToBuffer('model', CRISIS_RESPONSE);
    }, 1000);
    return;
  }

  showTypingIndicator();
  pushToBuffer('user', text);
  
  try {
    const promptInput = formatPromptWithContext();
    let responseText = '';

    if (aiSession) {
      // Executa localmente (window.ai)
      responseText = await aiSession.prompt(promptInput);
    } else {
      // Executa via fallback na nuvem do Gemini
      responseText = await callGeminiFallbackAPI(promptInput);
    }
    
    removeTypingIndicator();
    appendMessage('bot', responseText);
    pushToBuffer('model', responseText);
  } catch (err) {
    console.error('Erro na resposta da IA (Híbrida):', err);
    removeTypingIndicator();
    appendMessage('error', 'Desculpe, ocorreu uma oscilação na conexão. Gostaria de tentar novamente?');
  }
}

// Detecta palavras de crise
function detectCrisis(text) {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return CRISIS_KEYWORDS.some(keyword => normalized.includes(keyword));
}

// Adiciona ao buffer limitando a 10 interações (RN02.1)
function pushToBuffer(role, content) {
  contextBuffer.push({ role, content });
  while (contextBuffer.length > MAX_CONTEXT_INTERACTIONS) {
    contextBuffer.shift(); // Descarta mais antigo
  }
}

// Formata o histórico do buffer para passar ao modelo
function formatPromptWithContext() {
  // Constrói um texto corrido simulando o histórico de conversas para o modelo
  let promptText = '';
  contextBuffer.forEach(item => {
    if (item.role === 'user') {
      promptText += `Usuário: ${item.content}\n`;
    } else {
      promptText += `ALIVIO: ${item.content}\n`;
    }
  });
  promptText += `ALIVIO:`;
  return promptText;
}

// Renderiza balão no chat
function appendMessage(sender, text, isMarkdown = true) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}`;
  
  if (isMarkdown) {
    // Escapa tags HTML padrão antes de aplicar a formatação básica para segurança (evitar XSS)
    let escapedText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
      
    // Formata marcações de negrito (**texto** ou __texto__) para <strong>
    let formattedText = escapedText
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
      
    msgDiv.innerHTML = formattedText;
  } else {
    msgDiv.textContent = text;
    msgDiv.innerHTML = msgDiv.innerHTML.replace(/\n/g, '<br>');
  }
  
  elements.chatBox.appendChild(msgDiv);
  elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
}

// Indicador de digitação
function showTypingIndicator() {
  const indicatorDiv = document.createElement('div');
  indicatorDiv.id = 'typingIndicator';
  indicatorDiv.className = 'message bot';
  
  indicatorDiv.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  
  elements.chatBox.appendChild(indicatorDiv);
  elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.remove();
  }
}

// Inicializa a simulação e o refresh do AdSense
function initAdRefresh() {
  adRefreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      refreshAds();
    }
  }, AD_REFRESH_INTERVAL_MS);
}

// Trata mudança de visibilidade (RN05)
function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    // Se voltou a ficar visível, faz um refresh imediato e reinicia o timer
    refreshAds();
    clearInterval(adRefreshTimer);
    initAdRefresh();
  } else {
    // Pausa o timer
    clearInterval(adRefreshTimer);
  }
}

// Executa refresh visual das tags de anúncio simuladas do AdSense
function refreshAds() {
  console.log('[AdSense] Atualizando blocos de anúncios...');
  
  // Pisca sutilmente o contêiner de anúncios para indicar o refresh visual
  [elements.gptTopAd, elements.gptSidebarAd].forEach(ad => {
    if (ad) {
      ad.style.opacity = '0.5';
      setTimeout(() => {
        ad.style.opacity = '1';
      }, 300);
    }
  });
}
