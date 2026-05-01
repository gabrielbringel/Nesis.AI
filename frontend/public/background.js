// Service worker da extensão NesisAI (Manifest V3).
//
// TODO: substituir ESUS_URL_PATTERNS pelas URLs reais da página de cadastro
// do paciente no eSUS quando o domínio for confirmado. Os padrões abaixo são
// PLACEHOLDERS — devem casar com manifest.json > host_permissions.

const ESUS_URL_PATTERNS = [
  /^https:\/\/.*\.esusaps\.gov\.br\//,
  /^https:\/\/.*\.saude\.gov\.br\//,
  /^http:\/\/.*\/lista-atendimento\/atendimento.*$/,
  /^http:\/\/localhost:\d+\//,
  /^http:\/\/127\.0\.0\.1:\d+\//
]

// Fallback manual: clicar no ícone da extensão abre o side panel.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[NesisAI] setPanelBehavior falhou:', err))

