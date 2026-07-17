// gdpr.js — Sistema de Consentimento de Cookies (GDPR/LGPD)
// Autocontido: injeta HTML, CSS e lógica no DOM automaticamente.
// Basta adicionar <script src="gdpr.js" defer></script> em cada página.

(function () {
  'use strict';

  const CONSENT_KEY = 'alivio_cookie_consent';
  const CONSENT_VERSION = '1.0';

  // ── CSS do Banner ──
  const styles = `
    .gdpr-overlay {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 1.25rem 1.5rem;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.25);
      font-family: 'Inter', sans-serif;
      color: #F1F5F9;
      animation: gdprSlideUp 0.4s ease-out;
    }
    @keyframes gdprSlideUp {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .gdpr-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
    }
    .gdpr-text {
      flex: 1;
      min-width: 280px;
      font-size: 0.85rem;
      line-height: 1.55;
      color: #CBD5E1;
    }
    .gdpr-text a {
      color: #F9A8D4;
      text-decoration: underline;
    }
    .gdpr-text strong {
      color: #FFFFFF;
    }
    .gdpr-buttons {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .gdpr-btn {
      padding: 0.6rem 1.2rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .gdpr-btn-accept {
      background: #DB2777;
      color: #FFFFFF;
    }
    .gdpr-btn-accept:hover {
      background: #BE185D;
    }
    .gdpr-btn-necessary {
      background: transparent;
      color: #F1F5F9;
      border: 1px solid #64748B;
    }
    .gdpr-btn-necessary:hover {
      background: rgba(255,255,255,0.08);
    }
    .gdpr-btn-config {
      background: transparent;
      color: #94A3B8;
      border: 1px solid transparent;
      font-size: 0.8rem;
      text-decoration: underline;
    }
    .gdpr-btn-config:hover {
      color: #F1F5F9;
    }

    /* Painel de configurações detalhadas */
    .gdpr-config-panel {
      display: none;
      width: 100%;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #334155;
    }
    .gdpr-config-panel.active {
      display: block;
    }
    .gdpr-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
    }
    .gdpr-option label {
      font-size: 0.82rem;
      color: #CBD5E1;
      cursor: pointer;
    }
    .gdpr-option label strong {
      color: #F1F5F9;
    }
    .gdpr-toggle {
      position: relative;
      width: 40px;
      height: 22px;
      flex-shrink: 0;
    }
    .gdpr-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .gdpr-slider {
      position: absolute;
      inset: 0;
      background: #475569;
      border-radius: 11px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .gdpr-slider::before {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      left: 3px;
      bottom: 3px;
      background: #FFFFFF;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .gdpr-toggle input:checked + .gdpr-slider {
      background: #DB2777;
    }
    .gdpr-toggle input:checked + .gdpr-slider::before {
      transform: translateX(18px);
    }
    .gdpr-toggle input:disabled + .gdpr-slider {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Botão flutuante para reabrir preferências */
    .gdpr-reopen-btn {
      position: fixed;
      bottom: 1rem;
      left: 1rem;
      z-index: 99998;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #1E293B;
      border: 1px solid #334155;
      color: #94A3B8;
      font-size: 1.2rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      transition: all 0.2s;
    }
    .gdpr-reopen-btn:hover {
      background: #334155;
      color: #F1F5F9;
    }

    @media (max-width: 600px) {
      .gdpr-overlay {
        padding: 1rem;
      }
      .gdpr-container {
        flex-direction: column;
        align-items: stretch;
      }
      .gdpr-buttons {
        flex-direction: column;
      }
      .gdpr-btn {
        width: 100%;
        text-align: center;
      }
    }
  `;

  // ── HTML do Banner ──
  function createBannerHTML() {
    return `
      <div class="gdpr-overlay" id="gdprBanner" role="dialog" aria-label="Consentimento de cookies">
        <div class="gdpr-container">
          <div class="gdpr-text">
            <strong>🍪 Sua privacidade é importante para nós</strong><br>
            Utilizamos cookies essenciais para o funcionamento do site e cookies opcionais para publicidade (Google AdSense).
            Nenhum dado de conversa é armazenado — tudo ocorre na memória do seu navegador.
            Ao aceitar, você concorda com a nossa
            <a href="politica-de-privacidade.html">Política de Privacidade</a> (LGPD/GDPR).
          </div>
          <div class="gdpr-buttons">
            <button class="gdpr-btn gdpr-btn-accept" id="gdprAcceptAll">Aceitar todos</button>
            <button class="gdpr-btn gdpr-btn-necessary" id="gdprNecessaryOnly">Apenas essenciais</button>
            <button class="gdpr-btn gdpr-btn-config" id="gdprToggleConfig">Personalizar</button>
          </div>
          <div class="gdpr-config-panel" id="gdprConfigPanel">
            <div class="gdpr-option">
              <div class="gdpr-toggle">
                <input type="checkbox" id="gdprNecessary" checked disabled>
                <span class="gdpr-slider"></span>
              </div>
              <label for="gdprNecessary"><strong>Essenciais</strong> — Necessários para o funcionamento básico do site (sempre ativos).</label>
            </div>
            <div class="gdpr-option">
              <div class="gdpr-toggle">
                <input type="checkbox" id="gdprAnalytics">
                <span class="gdpr-slider"></span>
              </div>
              <label for="gdprAnalytics"><strong>Análise</strong> — Nos ajudam a entender como o site é utilizado (anônimo).</label>
            </div>
            <div class="gdpr-option">
              <div class="gdpr-toggle">
                <input type="checkbox" id="gdprMarketing">
                <span class="gdpr-slider"></span>
              </div>
              <label for="gdprMarketing"><strong>Publicidade</strong> — Permitem exibir anúncios relevantes do Google AdSense.</label>
            </div>
            <div style="margin-top: 0.75rem;">
              <button class="gdpr-btn gdpr-btn-accept" id="gdprSaveConfig">Salvar preferências</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Lógica ──

  function getConsent() {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.version !== CONSENT_VERSION) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function setConsent(necessary, analytics, marketing) {
    const data = {
      version: CONSENT_VERSION,
      necessary: true, // Sempre true
      analytics: !!analytics,
      marketing: !!marketing,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
    applyConsent(data);
    hideBanner();
  }

  function applyConsent(data) {
    // Se marketing está ativo, libera scripts de publicidade
    if (data.marketing) {
      enableAdScripts();
    } else {
      disableAdScripts();
    }

    // Se analytics está ativo, libera scripts de análise
    if (data.analytics) {
      enableAnalytics();
    }
  }

  function enableAdScripts() {
    // Reativa containers de anúncios se existirem
    document.querySelectorAll('.ad-container').forEach(function (el) {
      el.style.display = '';
    });
  }

  function disableAdScripts() {
    // Oculta containers de anúncios
    document.querySelectorAll('.ad-container').forEach(function (el) {
      el.style.display = 'none';
    });
  }

  function enableAnalytics() {
    // Placeholder: caso queira adicionar Google Analytics ou similar no futuro
    // window.dataLayer = window.dataLayer || [];
    // function gtag(){ dataLayer.push(arguments); }
    // gtag('js', new Date());
    // gtag('config', 'G-XXXXXXXXXX');
  }

  function hideBanner() {
    var banner = document.getElementById('gdprBanner');
    if (banner) {
      banner.style.animation = 'none';
      banner.style.transform = 'translateY(100%)';
      banner.style.opacity = '0';
      banner.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      setTimeout(function () {
        banner.remove();
      }, 350);
    }
    showReopenButton();
  }

  function showBanner() {
    // Remove banner antigo se existir
    var old = document.getElementById('gdprBanner');
    if (old) old.remove();

    // Remove botão reabrir se existir
    var reopenBtn = document.getElementById('gdprReopenBtn');
    if (reopenBtn) reopenBtn.remove();

    // Injeta o banner
    document.body.insertAdjacentHTML('beforeend', createBannerHTML());

    // Event listeners
    document.getElementById('gdprAcceptAll').addEventListener('click', function () {
      setConsent(true, true, true);
    });

    document.getElementById('gdprNecessaryOnly').addEventListener('click', function () {
      setConsent(true, false, false);
    });

    document.getElementById('gdprToggleConfig').addEventListener('click', function () {
      var panel = document.getElementById('gdprConfigPanel');
      panel.classList.toggle('active');
      this.textContent = panel.classList.contains('active') ? 'Fechar' : 'Personalizar';
    });

    document.getElementById('gdprSaveConfig').addEventListener('click', function () {
      var analytics = document.getElementById('gdprAnalytics').checked;
      var marketing = document.getElementById('gdprMarketing').checked;
      setConsent(true, analytics, marketing);
    });
  }

  function showReopenButton() {
    if (document.getElementById('gdprReopenBtn')) return;

    var btn = document.createElement('button');
    btn.id = 'gdprReopenBtn';
    btn.className = 'gdpr-reopen-btn';
    btn.title = 'Configurar cookies';
    btn.setAttribute('aria-label', 'Configurar preferências de cookies');
    btn.innerHTML = '🍪';
    btn.addEventListener('click', function () {
      btn.remove();
      showBanner();
      // Preenche os toggles com as preferências atuais
      var consent = getConsent();
      if (consent) {
        var analyticsToggle = document.getElementById('gdprAnalytics');
        var marketingToggle = document.getElementById('gdprMarketing');
        if (analyticsToggle) analyticsToggle.checked = consent.analytics;
        if (marketingToggle) marketingToggle.checked = consent.marketing;
      }
    });
    document.body.appendChild(btn);
  }

  // ── Inicialização ──
  function init() {
    // Injeta CSS
    var styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Verifica consentimento existente
    var consent = getConsent();
    if (consent) {
      // Já consentiu: aplica preferências e mostra botão para reconfigurar
      applyConsent(consent);
      showReopenButton();
    } else {
      // Primeira visita: bloqueia anúncios e mostra banner
      disableAdScripts();
      showBanner();
    }
  }

  // Aguarda DOM carregado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
