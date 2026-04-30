// Service worker da extensão NesisAI (Manifest V3).
//
// TODO: substituir ESUS_URL_PATTERNS pelas URLs reais da página de cadastro
// do paciente no eSUS quando o domínio for confirmado. Os padrões abaixo são
// PLACEHOLDERS — devem casar com manifest.json > host_permissions.

const ESUS_URL_PATTERNS = [
  /^https:\/\/.*\.esusaps\.gov\.br\//,
  /^https:\/\/.*\.saude\.gov\.br\//,
]

// Fallback manual: clicar no ícone da extensão abre o side panel.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[NesisAI] setPanelBehavior falhou:', err))

// Ativação automática: ao terminar de carregar uma URL do eSUS, abre o panel.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  if (!tab.url) return
  if (!ESUS_URL_PATTERNS.some((re) => re.test(tab.url))) return

  chrome.sidePanel
    .open({ tabId })
    .catch((err) => console.error('[NesisAI] sidePanel.open falhou:', err))
})
