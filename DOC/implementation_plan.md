# Plano de Implementação — ALIVIO DA ALMA v1.0

Este documento apresenta a especificação técnica e o plano de implementação do **ALIVIO da Alma**, um utilitário web voltado a bem-estar emocional e apoio espiritual que opera inteiramente client-side (Zero Backend) e utiliza a IA local (`window.ai` / Gemini Nano) do Google Chrome.

## User Review Required

> [!IMPORTANT]
> **Políticas do Google AdSense**: Para que o domínio `aliviodaalma.com.br` seja aprovado pelo AdSense, precisamos de páginas reais e indexáveis para Política de Privacidade, Termos de Uso e Contato. Elas serão criadas como arquivos HTML separados e referenciadas no rodapé.
>
> **Dependência de Flag Experimental**: O chat depende da Prompt API do Chrome (`window.ai`). Caso ela esteja desativada ou indisponível, uma interface explicativa com o passo a passo para ativá-la no navegador será apresentada de forma amigável ao usuário.

> [!WARNING]
> **Tratamento de Crises (R02)**: Em caso de menção a ideação suicida, automutilação ou risco grave, a aplicação desviará o fluxo devocional para exibir de forma prioritária o direcionamento de emergência com o CVV (ligue 188).

---

## Engenharia de Prompt (Tom Espiritual & Estrutura de Resposta)

O prompt de sistema injetado no modelo local garantirá que cada resposta siga estritamente a seguinte estrutura e diretrizes de tom:

### 1. Prompt do Sistema (Fixo)
```text
Você é o "ALIVIO", um assistente de apoio emocional e espiritual acolhedor, empático e de fé cristã. 
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
- Mantenha respostas concisas, calorosas e fáceis de ler no chat.
```

---

## Proposed Changes

### Estrutura de Arquivos do Projeto

Pretendemos estruturar o projeto na raiz do workspace `c:\Alivio da Alma` da seguinte forma:
- `[NEW]` [index.html](file:///c:/Alivio_da_Alma/index.html) — Página principal do chat e interface principal.
- `[NEW]` [politica-de-privacidade.html](file:///c:/Alivio_da_Alma/politica-de-privacidade.html) — Página de política de privacidade exigida pelo AdSense.
- `[NEW]` [termos-de-uso.html](file:///c:/Alivio_da_Alma/termos-de-uso.html) — Página de termos de uso e isenções de responsabilidade jurídica.
- `[NEW]` [contato.html](file:///c:/Alivio_da_Alma/contato.html) — Página de contato para feedback e suporte.
- `[NEW]` [app.js](file:///c:/Alivio_da_Alma/app.js) — Lógica principal do chat, gerenciamento do buffer de contexto (10 mensagens), inicialização e verificação de status do `window.ai`, tratamento de crises e refresh programático de anúncios baseado na visibilidade da aba.
- `[NEW]` [style.css](file:///c:/Alivio_da_Alma/style.css) — Customizações de estilo e design system premium.

---

### Detalhamento dos Componentes

#### 1. [index.html](file:///c:/Alivio_da_Alma/index.html)
- Estrutura de chat moderna com estilo refinado (Dark Mode por padrão em tons `slate-900`/`slate-800` com detalhes em `teal-500` e `soft gold` / `amber-400`).
- Modal bloqueante (Disclaimer de Uso) que exige que o usuário clique em "Compreendo e Quero Conversar" antes de acessar a interface.
- Badge dinâmico de status da IA no topo (Verificando, Baixando, Online, Erro).
- Integração simulada do Google Publisher Tag (GPT) para anúncios AdSense no topo (728x90) e na lateral (300x250), respeitando o refresh somente se a aba estiver visível.
- Seção lateral de "Reflexão Diária" para agregar valor e conteúdo orgânico.
- Rodapé com links para as páginas institucionais.

#### 2. [app.js](file:///c:/Alivio_da_Alma/app.js)
- **Gerenciamento do Buffer**: Variável JS em memória RAM que retém até 10 interações. Na chamada à Prompt API do Chrome, o histórico formatado será repassado para dar memória real à conversa.
- **Tratamento de Crise**: Verificação de palavras-chave sensíveis (ex: *suicidio*, *morrer*, *me matar*, *desespero extremo*, *automutilacao*) antes de chamar a Prompt API. Caso detectado, a resposta padrão conterá os dados do CVV (188) destacados de forma clara.
- **Status do Modelo**: Fluxo assíncrono para verificar `window.ai`. Se indisponível, exibe o painel de instruções passo a passo para habilitar no Chrome.
- **Refresh de Anúncios**: Lógica com `setInterval` a cada 90s, pausado se `document.visibilityState !== 'visible'`.

#### 3. [politica-de-privacidade.html](file:///c:/Alivio_da_Alma/politica-de-privacidade.html), [termos-de-uso.html](file:///c:/Alivio_da_Alma/termos-de-uso.html), [contato.html](file:///c:/Alivio_da_Alma/contato.html)
- Páginas com layout e design system unificados para profissionalismo e elegibilidade no AdSense.

---

## Verification Plan

### Manual Verification
- Carregar `index.html` e verificar se o disclaimer bloqueante aparece corretamente.
- Confirmar se o modal desaparece e permite interações após o consentimento.
- Validar se o status do `window.ai` transiciona corretamente dependendo do suporte do navegador.
- Testar a inserção de mensagens e o tratamento de crise digitando palavras sensíveis.
- Testar se os links no rodapé abrem as páginas reais correspondentes.
- Inspecionar console e logs para assegurar que nenhum dado é enviado para servidores externos.
