# Walkthrough — Implementação do ALIVIO DA ALMA v1.0

Todos os arquivos do MVP 1.0 foram criados com sucesso na raiz do workspace do projeto. Abaixo, listamos os componentes construídos de acordo com as regras de negócio especificadas:

## Componentes Implementados

### 1. Interface Principal e Estrutura
- [index.html](file:///c:/Alivio_da_Alma/index.html): Estrutura do chat, modal de disclaimer bloqueante inicial (RN01), sidebar com reflexão diária e cards de privacidade, além dos blocos de anúncios topo (728x90) e lateral (300x250) integrando simulações da biblioteca oficial GPT do Google AdSense.
- [style.css](file:///c:/Alivio_da_Alma/style.css): Implementação do Design System Premium no tom escuro (`slate-900`/`slate-800`), cores de destaque em `teal-500` (cura) e `soft gold` (luz), tipografia estilizada com as fontes *Outfit* e *Inter*, balões de conversa otimizados com efeito de transição, animação de indicador de digitação ("bot digitando") e responsividade completa.

### 2. Logica e Processamento Local da IA
- [app.js](file:///c:/Alivio_da_Alma/app.js):
  - **Status da IA (RN06)**: Monitora `window.ai` e atualiza a badge da UI (Verificando → Baixando → Online ou Recurso Desativado). Mantém a área de digitação bloqueada até que o status seja *Online*.
  - **Buffer de contexto com histórico (RN02.1)**: Mantém uma fila em memória RAM com até 10 mensagens. Quando o usuário envia uma nova entrada, o histórico completo formatado é enviado para a Prompt API, garantindo memória real do diálogo.
  - **Tratamento de Crise (R02)**: Verifica termos críticos e, em caso positivo, desvia imediatamente para instruir sobre o CVV (ligue 188).
  - **Refresh de Anúncios (RN05)**: Atualiza ciclicamente os anúncios a cada 90s, congelando a operação se a aba do navegador for colocada em segundo plano (`document.visibilityState === 'hidden'`).

### 3. Páginas Institucionais para Aprovação no AdSense (RN04)
- [politica-de-privacidade.html](file:///c:/Alivio_da_Alma/politica-de-privacidade.html): Declara o uso de anúncios do AdSense e a ausência de persistência de dados das conversas.
- [termos-de-uso.html](file:///c:/Alivio_da_Alma/termos-de-uso.html): Isenção de responsabilidade médica e terapêutica, orientando em destaque o contato com o CVV (188) em caso de crise.
- [contato.html](file:///c:/Alivio_da_Alma/contato.html): Canal oficial via e-mail `contato@aliviodaalma.com.br` para suporte e feedback.

---

## Verificação dos Critérios de Aceite (QA)

| ID | Critério | Status | Detalhes |
|---|---|---|---|
| **AC01** | Modal de disclaimer é exibido ao carregar a página | **Concluído** | Modal bloqueia a tela com desfoque de fundo. |
| **AC02** | Aceitar o disclaimer libera o chat e persiste na aba ativa | **Concluído** | Salvamento em `sessionStorage` para manter liberado durante a navegação. |
| **AC03** | Sem suporte a `window.ai` exibe instruções de flag | **Concluído** | Painel passo a passo é renderizado automaticamente na tela caso falhe. |
| **AC04** | Se IA estiver disponível, evolui status e habilita o input | **Concluído** | Fluxo de inicialização assíncrono controlado no `app.js`. |
| **AC05** | Fluxo completo de envio de mensagens e balão de digitação | **Concluído** | Adiciona balões na UI e gerencia animação de carregamento antes da resposta da IA. |
| **AC06** | Falhas na chamada à IA exibem balão amigável | **Concluído** | Captura erros no bloco try-catch e informa o usuário sem quebrar o layout. |
| **AC07** | Buffer descarta a interação mais antiga na 11ª mensagem | **Concluído** | Lógica de fila FIFO limitando a 10 itens no array `contextBuffer`. |
| **AC08** | Recarregar apaga o histórico de conversa | **Concluído** | Dados retidos exclusivamente em variáveis JavaScript de RAM. |
| **AC09** | Visibilidade da aba congela refresh de anúncios | **Concluído** | Acoplado com escuta ao evento `visibilitychange`. |
| **AC10** | Links do rodapé direcionam para páginas HTML indexáveis | **Concluído** | Páginas criadas e referenciadas com links relativos corretos. |
