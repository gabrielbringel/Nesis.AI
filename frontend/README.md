# NesisAI — Frontend (Chrome Extension)

Sidebar React do NesisAI, empacotada como extensão Chrome (Manifest V3 + Side Panel API). A mesma SPA roda como site standalone via Vite para iteração rápida de UI.

## Desenvolvimento (SPA standalone)

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. Nesse modo a SPA preenche o viewport inteiro (esperado — sem o Chrome controlando o panel). Chamadas para `POST /api/v1/analyze` esperam o backend em `http://localhost:8000`.

## Build e instalação como extensão

```bash
npm run build:extension
```

Gera `frontend/dist/`. Para instalar:

1. Abrir `chrome://extensions`
2. Ativar **Modo do desenvolvedor**
3. Clicar **Carregar sem compactação**
4. Selecionar a pasta `frontend/dist/`

## Ativação automática

Navegar para qualquer URL que case com `host_permissions` no `manifest.json` abre o side panel automaticamente:

- `https://*.esusaps.gov.br/*`
- `https://*.saude.gov.br/*`
- `http://*/lista-atendimento/atendimento*`
- `http://localhost/*` (desenvolvimento)

Clicar no ícone da extensão na barra também abre o side panel em qualquer aba.

## Estrutura

```
frontend/
├── src/
│   ├── components/             # UI da sidebar (AlertCard, Drawer, states/…)
│   ├── hooks/                  # useSidebar (fluxo principal), useDrawer
│   ├── scraper/
│   │   └── esus-scraper.ts     # XPaths e fallback heurístico do DOM eSUS
│   ├── stores/
│   │   ├── settingsStore.ts    # autoRead, darkMode (localStorage)
│   │   └── historyStore.ts     # histórico de análises (localStorage)
│   ├── utils/                  # Formatação, agregação, normalização
│   └── data/seedHistory.ts     # 10 registros seed para demonstração
├── public/
│   ├── manifest.json           # Manifest V3 (sidePanel + host_permissions)
│   ├── background.js           # Service worker
│   └── icons/                  # PNGs gerados a partir do NesisMark
└── scripts/
    └── generate-icons.mjs      # npm run generate:icons
```

## Fluxo de estados da sidebar

```
idle → lendo → analisando → resultado
                                ↑
                                └── reanalisar (sem novo scraping,
                                    com dados editados pelo médico)
```

## Stack

- React 18 + TypeScript + Vite (`base: './'` para paths relativos no bundle)
- Tailwind CSS (utilitários apenas)
- Google Fonts: Instrument Serif, DM Sans, DM Mono
- Manifest V3, Side Panel API, service worker

## Regenerar ícones

```bash
npm run generate:icons
```

Editar `scripts/generate-icons.mjs` se a marca mudar.

## Persistência

Histórico e configurações ficam em `localStorage` — não há backend para isso. O botão **Redefinir memória** (em SettingsView) limpa ambos.
