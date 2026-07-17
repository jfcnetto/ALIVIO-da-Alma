# Regras do Projeto ALIVIO da Alma

Este arquivo serve como instrução de contexto persistente para futuros agentes de IA neste repositório. Toda vez que iniciarmos uma nova tarefa, siga as diretrizes abaixo.

---

## 🎨 Identidade Visual e Layout

- **Paleta de Cores (Clara & Alta Legibilidade)**:
  - Fundo geral claro: `#F8FAFC`
  - Fundo do container e cards: `#FFFFFF`
  - Balão do bot (Acolhimento): `#FCE7F3` (rosa claro pastel) com texto escuro
  - Texto principal (corpo): `#1E293B` (cinza escuro de alto contraste)
  - Cores de destaque (botões, links importantes): `#DB2777` (rosa escuro / magenta suave)
- **Navegação Uniforme**:
  - Cabeçalho com logo SVG clicável apontando para `index.html`.
  - Links superiores: `Início`, `Privacidade`, `Termos`, `Contato`.
  - Rodapé idêntico em todas as páginas com o menu contendo `Início`, `Política de Privacidade`, `Termos de Uso` e `Contato`.
- **Publicidade Padronizada**:
  - Banner superior responsivo de `728x90` (`ad_banner_topo.svg`).
  - Banner lateral na sidebar de `300x250` (`ad_banner_lateral.svg`).
- **Favicon**:
  - Utilizar sempre o arquivo `favicon.svg` na tag `<head>` de todas as páginas.

---

## 🧠 Integração de IA (Abacus.ai RouteLLM)

- **Backend Serverless (`api/chat.js`)**:
  - A rota está no padrão de funções serverless da Vercel.
  - URL da API do Abacus.ai: `https://routellm.abacus.ai/v1/chat/completions` (RouteLLM para contas Self-Serve).
  - Autenticação obrigatória: Enviar a variável `ABACUS_API_KEY` (armazenada em ambiente seguro de produção na Vercel) no cabeçalho `'Authorization': 'Bearer ' + apiKey`.
  - Modelo padrão: `'route-llm'` (permite que o Abacus selecione o modelo de maior performance ou use o Gemini 1.5/3.1 com base nas regras do workspace).
- **Prompt de Sistema**:
  - Deve conter estritamente as regras de acolhimento em 4 passos (Validar sentimento com empatia, trazer mensagem bíblica com até 1 versículo e finalizar com pergunta reflexiva curta).
  - Nunca emitir diagnósticos médicos ou terapêuticos.
  - Segurança automática para ideação de crise redirecionando imediatamente para o CVV 188.

---

## 🔒 Princípios de Privacidade (GDPR / LGPD)

- As interações não devem ser persistidas em bancos de dados públicos ou arquivos de log, ocorrendo estritamente na memória RAM da aba ativa do navegador para total privacidade dos usuários.
