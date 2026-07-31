# NesisAI — Frontend (Chrome Extension)

NesisAI's React interface is packaged as a Chrome Manifest V3 extension using the Side Panel API. It is designed to read a patient encounter page in Brazil's e-SUS APS primary-care record system.

For Brazilian health care terminology, see the [Brazilian Health Care Context](../README.md#brazilian-health-care-context) section in the main README.

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`, as required by the installed Vite 8 release
- npm
- Google Chrome with Side Panel API support
- The NesisAI backend at `http://localhost:8000` for live analysis

## Browser UI Development

```bash
cd frontend
npm install
npm run dev
```

Vite serves the interface at `http://localhost:5173`. This mode is useful for layout work, but e-SUS scraping requires Chrome extension APIs and therefore only works when the built extension is loaded in Chrome.

## Build and Install the Extension

```bash
npm run build:extension
```

This creates `frontend/dist/`.

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `frontend/dist/` directory.
5. Open an eligible e-SUS APS encounter page.
6. Select the NesisAI extension icon to open its side panel.

Chrome's extension icon opens the panel because `background.js` calls `setPanelBehavior({ openPanelOnActionClick: true })`. The current service worker does not automatically open the panel when the user navigates to a matching URL.

## URL Access and Scraping

The manifest grants access to these development and candidate deployment patterns:

```text
https://*.esusaps.gov.br/*
https://*.saude.gov.br/*
http://*/lista-atendimento/atendimento*
http://localhost/*
http://localhost:8080/*
http://127.0.0.1/*
```

These host permissions are broader than the scraper's runtime eligibility check. The current UI only starts scraping when the active tab URL contains:

```text
lista-atendimento/atendimento
```

The URL patterns in `background.js` are placeholders and are not currently used to open or enable the panel. Confirm the production e-SUS deployment URLs before relying on these patterns outside a demo.

If **Automatic reading** is enabled in settings, the extension starts reading when the side-panel UI loads on an eligible encounter page. The setting does not open the panel itself.

## Project Structure

```text
frontend/
├── src/
│   ├── components/             # Side-panel UI, drawer, and view states
│   ├── hooks/
│   │   ├── useSidebar.ts       # Scraping, API call, and main state flow
│   │   └── useDrawer.ts
│   ├── scraper/
│   │   └── esus-scraper.ts     # Mapped XPaths and heuristic DOM fallback
│   ├── stores/
│   │   ├── settingsStore.ts    # autoRead and darkMode in localStorage
│   │   └── historyStore.ts     # Local analysis history
│   ├── utils/
│   └── data/seedHistory.ts     # Demo history records
├── public/
│   ├── manifest.json           # Manifest V3 permissions and side panel
│   ├── background.js           # Extension service worker
│   └── icons/
└── scripts/
    └── generate-icons.mjs
```

## Main UI Flow

```text
idle
  |
  v
reading ---> incomplete data
  |
  v
analyzing
  |
  +----> results
  +----> no alerts
  +----> error

wrong domain and manual data entry are additional branches.
```

Reanalysis uses the physician-edited payload and does not scrape the page again.

## API Integration

The extension sends requests directly to:

```text
POST http://localhost:8000/api/v1/analyze
```

The endpoint URL is currently hard-coded in `src/hooks/useSidebar.ts`. The Vite development proxy for `/api` does not affect this request.

## Technology Stack

- React 18
- TypeScript
- Vite 8 with `base: './'` for extension-relative asset paths
- Tailwind CSS
- Instrument Serif, DM Sans, and DM Mono
- Chrome Manifest V3, Side Panel API, service worker, tabs, and scripting APIs

## Generate Icons

```bash
npm run generate:icons
```

The script writes the extension PNG assets under `public/icons/`.

## Local Persistence

Analysis history and settings are stored in the extension's `localStorage`; there is no backend synchronization. **Reset memory** clears both stores.

The settings store includes `darkMode`, but the project's current design remains light-only.
