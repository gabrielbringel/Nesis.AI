// Abre o painel lateral ao clicar no ícone da extensão.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[Nesis] setPanelBehavior falhou:', err))
