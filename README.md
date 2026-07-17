# ALIVIO da Alma

O ALIVIO da Alma é um utilitário web voltado a bem-estar emocional e apoio espiritual, que simula um diálogo acolhedor unindo escuta ativa (base de psicologia) a passagens bíblicas contextualizadas ao relato do usuário.

---

## 🏗️ Arquitetura

| Camada | Tecnologia | Descrição |
|--------|-----------|-----------|
| **Frontend** | HTML + CSS + JavaScript puro | Aplicação estática servida pela Vercel |
| **Backend** | Vercel Serverless Functions | Rota `/api/chat.js` que processa as mensagens via OpenRouter |
| **IA** | OpenRouter API (modelos gratuitos) | Cadeia de fallback com múltiplos modelos |
| **Fallback Local** | `window.ai` (Chrome) | Tentativa de IA local antes de chamar o backend |

### Fluxo de Funcionamento
1. Usuário digita mensagem no chat
2. `app.js` tenta usar `window.ai` (IA local do Chrome) primeiro
3. Se `window.ai` não estiver disponível, faz fallback para `/api/chat.js` (OpenRouter)
4. O backend tenta até 4 modelos gratuitos em sequência antes de desistir
5. Se TODOS os modelos falharem, retorna mensagem amigável de indisponibilidade (sem erro técnico na tela)

---

## 📁 Estrutura de Arquivos

```
c:\Alivio da Alma\
├── api/
│   └── chat.js              # Backend serverless (OpenRouter API + sanitização)
├── DOC/                     # Documentação interna
├── index.html               # Página principal com chat
├── app.js                   # Lógica do frontend (chat, window.ai, fallback API)
├── style.css                # Estilos visuais (tema claro rosa & cinza)
├── contato.html             # Página de contato
├── politica-de-privacidade.html  # Política de privacidade (LGPD/GDPR)
├── termos-de-uso.html       # Termos de uso
├── favicon.svg              # Ícone do site
├── logo_alivio_alma.svg     # Logo SVG
├── ad_banner_topo.svg       # Banner publicitário superior (728x90)
├── ad_banner_lateral.svg    # Banner publicitário lateral (300x250)
├── AGENTS.md                # Regras persistentes para agentes de IA
└── README.md                # Este arquivo
```

---

## ⚙️ Variáveis de Ambiente (Vercel)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `OPENROUTER_API_KEY` | ✅ Sim | Chave da API do OpenRouter |
| `OPENROUTER_MODEL` | ❌ Não | Modelo preferido (default: `openrouter/free`) |
| `SITE_URL` | ❌ Não | URL do site (default: `https://aliviodaalma.com.br`) |
| `SITE_NAME` | ❌ Não | Nome do site (default: `Alívio da Alma`) |

---

## 🤖 Modelos de IA (Fallback)

O backend tenta os modelos na seguinte ordem. Se um falhar (por qualquer motivo: 404, 429, 503, falta de créditos), tenta o próximo automaticamente:

1. `openrouter/free` (roteador automático gratuito)
2. `google/gemini-2.5-flash:free`
3. `meta-llama/llama-3.3-70b-instruct:free`
4. `meta-llama/llama-3-8b-instruct:free`

> **⚠️ IMPORTANTE**: A lista de modelos `:free` muda com o tempo. Confira os disponíveis em [openrouter.ai/models?max_price=0](https://openrouter.ai/models?max_price=0). Se todos forem desativados, atualize a lista em `api/chat.js` na constante `FALLBACK_MODELS`.

---

## 🛡️ Tratamento de Erros e Contingência

### Falta de Créditos / API Offline
- Se TODOS os modelos falharem, o backend retorna status `200` com a mensagem:
  `"Nosso serviço de IA está temporariamente indisponível. Por favor, tente novamente em alguns instantes."`
- O `console.error` nos logs da Vercel mostra o status e detalhes reais para diagnóstico do administrador.
- **Quando os créditos forem adicionados, o sistema volta a funcionar instantaneamente sem mexer no código.**

### Resposta Vazia / Gateway Vazio
- Se a sanitização remover todo o conteúdo da resposta, um fallback amigável em português é retornado automaticamente.

### Vazamento de Raciocínio (Thinking/Chain-of-Thought)
- Modelos gratuitos (especialmente DeepSeek) frequentemente vazam seu raciocínio interno em inglês.
- O backend possui sanitização robusta que:
  - Remove tags `<think>...</think>`
  - Detecta e isola texto em português quando misturado com raciocínio em inglês
  - Remove metadados como `"User Safety: safe"`, tokens `[INST]`, `<|end|>`, etc.
  - Remove rótulos de passos ("Passo 1", "Step 2", etc.)

---

## 💬 Regras do Prompt de Sistema

O chatbot segue estas regras (definidas no `systemPrompt` dentro de `api/chat.js`):

- **Idioma**: Exclusivamente português brasileiro
- **Tamanho**: Máximo 4 linhas por resposta
- **Tom**: Conversacional, como um amigo acolhedor e sábio
- **Estrutura**: Sempre termina com uma pergunta curta para manter o diálogo
- **Versículos**: Pode incluir 1 versículo bíblico curto quando houver dor profunda, mas NÃO força em toda resposta
- **Restrições**: Sem diagnósticos médicos ou linguagem clínica

### Lógica de Crise (CVV 188)
- **Bloqueio HARD**: Frases inequívocas de risco iminente (ex: "vou me matar", "vou me suicidar") → Resposta fixa redirecionando para CVV 188 + SAMU 192
- **Primeira menção** de "morrer" ou dor extrema → Acolhe com empatia e muda o assunto naturalmente, SEM mencionar CVV
- **Segunda menção / persistência** → Menciona CVV 188 de forma sutil e breve, sem repetir exaustivamente

---

## 🎨 Identidade Visual

| Elemento | Valor |
|----------|-------|
| Fundo geral | `#F8FAFC` |
| Fundo cards | `#FFFFFF` |
| Balão do bot | `#F1F5F9` (cinza claro) |
| Balão do usuário | `#FCE7F3` (rosa claro) |
| Texto principal | `#1E293B` (alto contraste) |
| Cor de destaque | `#DB2777` (rosa/magenta) |
| Cor dourada | `#D97706` (amber) |
| Fonte títulos | Outfit |
| Fonte corpo | Inter |

---

## 📱 Responsividade Mobile

Correções de viewport aplicadas diretamente no `<head>` do `index.html` para evitar que a tela "sambe" quando o teclado do celular abre:

```css
html, body { overflow-x: hidden; width: 100%; }
main { max-width: 100%; overflow-x: hidden; }
.chat-container { height: calc(100vh - 200px); max-height: 520px; }
@media (max-width: 768px) { .sidebar { display: none; } }
```

### ⚠️ PENDÊNCIA: CSS Responsivo Incompleto
O arquivo `style.css` perdeu os estilos de media queries para mobile durante edições anteriores. Os estilos que faltam no final do `style.css` são:
- `.back-btn:hover` (regra removida acidentalmente)
- `.page-content ul` (propriedades `gap` e `color` removidas)
- Media queries completas para `@media (max-width: 1024px)`, `@media (max-width: 768px)` e `@media (max-width: 480px)`

A correção de emergência está no `<style>` inline do `index.html`, mas o ideal é restaurar as media queries completas no `style.css` numa próxima sessão.

---

## 🔒 Privacidade (LGPD / GDPR)

- **Sistema de Consentimento (gdpr.js)**: Implementado um banner nativo em JS puro que gerencia as preferências de cookies do usuário (Essenciais, Análise e Publicidade).
- **Controle de Anúncios**: O AdSense (se configurado) só é exibido se o usuário aceitar cookies de publicidade.
- As interações do chat **não são persistidas** em bancos de dados ou logs.
- Tudo ocorre na memória RAM da aba ativa do navegador.
- O backend serverless processa e descarta — não armazena histórico.

---

## 🚀 Deploy

O projeto é hospedado na **Vercel**. Para fazer deploy:

1. Faça commit das alterações: `git add . && git commit -m "descrição"`
2. Push para o repositório: `git push`
3. A Vercel faz deploy automático via integração com o GitHub

---

## 📋 Histórico de Alterações (Sessão 17/07/2026)

### Realizados ✅
1. **Prompt de sistema reescrito** — Tom profissional de psicólogo/conselheiro com respostas curtas (máx 4 linhas) e tom conversacional
2. **Sanitização robusta de respostas** — Remove raciocínio em inglês, tags `<think>`, metadados `"User Safety: safe"`, rótulos de passos
3. **Lógica de crise refinada** — CVV 188 mencionado de forma sutil apenas na persistência do tema, não na primeira menção
4. **Modelos de fallback atualizados** — Removido `deepseek-chat-v3-0324:free` (descontinuado), adicionados Gemini 2.5 Flash e Llama 3.3
5. **Loop de fallback resiliente** — Tenta o próximo modelo em QUALQUER tipo de erro (404, 429, 503), não apenas rate limit
6. **Contingência para API offline** — Se todos os modelos falharem, retorna mensagem amigável sem erro técnico na tela
7. **Fallback para resposta vazia** — Se a sanitização esvaziar a resposta, retorna frase acolhedora padrão
8. **Correção de viewport mobile** — Adicionado `<style>` inline no `index.html` para impedir desalinhamento no celular
9. **`max_tokens` reduzido para 300** — Garante brevidade nas respostas
10. **Implementação GDPR/LGPD (`gdpr.js`)** — Sistema nativo de gestão de cookies e consentimento adicionado a todas as páginas.

### Pendentes ⏳
1. **Restaurar media queries completas no `style.css`** — Os blocos de `@media (max-width: 768px)` e `@media (max-width: 480px)` foram perdidos durante edições. O workaround está no `<style>` inline do `index.html` mas deve ser migrado para o CSS.
2. **Restaurar `.back-btn:hover` e `.page-content ul`** no `style.css` — Propriedades removidas acidentalmente.
3. **Deploy e testes** — Fazer deploy na Vercel e testar no celular para validar todas as correções.

---

## 🔑 Para o Próximo Agente / Sessão

1. **Leia este README.md** e o `AGENTS.md` antes de começar qualquer tarefa.
2. **NÃO use bibliotecas Node.js externas** — O projeto é JavaScript puro (exceto o serverless da Vercel que é ES Module nativo).
3. **Ao editar `style.css`**: Cuidado com os blocos de media queries. Faça edições cirúrgicas e verifique que as chaves `{}` estão balanceadas.
4. **Ao editar `api/chat.js`**: O arquivo tem sanitização complexa. Teste alterações localmente antes de fazer deploy.
5. **Modelos gratuitos mudam frequentemente**: Verifique [openrouter.ai/models?max_price=0](https://openrouter.ai/models?max_price=0) se houver erros 404.
