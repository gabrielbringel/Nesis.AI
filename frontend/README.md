# NesisAI — Sidebar (Chrome Extension)

Sidebar React do NesisAI, embarcada como extensão Chrome (Manifest V3 + Side Panel API). A mesma SPA roda também como site standalone via Vite, o que mantém o ciclo de UI rápido sem precisar reinstalar a extensão a cada mudança.

---

## Desenvolvimento (SPA standalone)

Para iterar na UI sem o overhead da extensão:

```sh
npm install
npm run dev
```

Abre em [http://localhost:5173](http://localhost:5173). Nesse modo a SPA preenche toda a janela do navegador (esperado — sem o Chrome controlando o panel, ela ocupa o viewport inteiro). A chamada para `POST /api/v1/analyze` é proxiada para `http://localhost:8000` via Vite.

---

## Build e instalação como extensão Chrome

```sh
npm run build:extension
```

Gera `frontend/dist/` com:

```
dist/
├── manifest.json
├── background.js
├── index.html
├── assets/
│   ├── index-<hash>.js
│   └── index-<hash>.css
└── icons/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    └── icon-128.png
```

Para instalar:

1. Abrir `chrome://extensions`
2. Ativar **Modo do desenvolvedor** (canto superior direito)
3. Clicar **Carregar sem compactação**
4. Selecionar a pasta `frontend/dist/`

---

## Ativação automática

Após instalar, navegar para qualquer URL que case com `host_permissions` no `manifest.json` abre o side panel automaticamente:

- `https://*.esusaps.gov.br/*`
- `https://*.saude.gov.br/*`

Como **fallback manual**, clicar no ícone da extensão na barra de ferramentas também abre o side panel em qualquer aba.

---

## ⚠️ Placeholders a substituir antes da demo

As URLs do eSUS em **dois lugares** são placeholders e precisam ser ajustadas para o domínio real do eSUS APS quando ele for confirmado:

1. `public/manifest.json` → chave `host_permissions`
2. `public/background.js` → constante `ESUS_URL_PATTERNS`

Os dois precisam casar. Há um `TODO` explícito no topo de `background.js`.

---

## Regenerar ícones

Os PNGs em `public/icons/` são gerados a partir do path SVG do `NesisMark`:

```sh
npm run generate:icons
```

Editar `scripts/generate-icons.mjs` se a marca mudar.

---

## Stack

- React 18 + TypeScript + Vite (`base: './'` para paths relativos no bundle)
- Tailwind CSS para utilitários (cores e tipografia via CSS vars em `src/index.css`)
- Google Fonts: Instrument Serif, DM Sans, DM Mono
- Manifest V3, Side Panel API, service worker

---

## Não implementado nesta task

- Content script para scraping do DOM do eSUS
- Comunicação `chrome.runtime.sendMessage` entre content script e sidebar
- Captura real de dados de prescrição (atualmente o payload é mockado em `src/mock.ts`)
