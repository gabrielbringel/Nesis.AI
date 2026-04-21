# Nesis.AI — Frontend v0.1

Interface web do **Nesis.AI**, sistema de análise inteligente de prontuários do eSUS para detecção de interações medicamentosas e erros de prescrição.

## Stack

- **React 18** + **TypeScript**
- **Vite** (build e dev server)
- **Tailwind CSS** + componentes estilo shadcn/ui
- **React Router v6** (roteamento)
- **Zustand** (estado global + persistência)
- **Axios** (HTTP client com interceptors)
- **Recharts** (gráficos)
- **Lucide React** (ícones)
- **react-hot-toast** (notificações)

## Pré-requisitos

- Node.js 18+ e npm

## Instalação

```bash
cd frontend
npm install
```

## Execução

```bash
npm run dev
```

Acesse `http://localhost:5173` no navegador.

Para entrar na plataforma: qualquer e-mail + senha (autenticação mockada).

## Scripts

| Script          | Descrição                               |
| --------------- | --------------------------------------- |
| `npm run dev`   | Inicia o servidor de desenvolvimento    |
| `npm run build` | Gera build de produção em `dist/`       |
| `npm run preview` | Visualiza o build de produção         |
| `npm run lint`  | Roda ESLint                             |
| `npm run format`| Formata o código com Prettier           |

## Estrutura

```
src/
  assets/               arquivos estáticos
  components/
    ui/                 componentes reutilizáveis (Button, Card, Badge, ...)
    layout/             Sidebar, Topbar, Layout, ProtectedRoute
  pages/
    Login/
    Dashboard/
    Pacientes/
    Analise/            NovaAnalise (wizard) + ResultadoAnalise
    Historico/
    Configuracoes/
  services/             camada de API (axios)
  store/                Zustand stores (auth, analysis)
  types/                interfaces TypeScript
  utils/                helpers (cn, format)
  mocks/                dados fictícios
  router/               definição de rotas
```

## Funcionalidades

- **Login** com validação de campos (autenticação mockada)
- **Dashboard** com cards de resumo, gráfico de 7 dias e lista das últimas análises
- **Pacientes**: tabela com busca por nome/CNS e paginação
- **Nova Análise**: wizard de 3 etapas (paciente → prontuário → revisão)
- **Resultado da Análise**: medicamentos extraídos, alertas de interação, erros de prescrição e accordion com texto original
- **Histórico** com filtros por paciente e severidade
- **Configurações** com toggles de notificação

## Integração futura com backend

O arquivo [src/services/api.ts](src/services/api.ts) contém a instância do axios com interceptors prontos para:

- Injetar `Authorization: Bearer <token>` em cada request
- Redirecionar para `/login` em caso de 401

Configure a URL base via variável de ambiente:

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8000
```

## Notas de acessibilidade

- Labels em todos os inputs
- `aria-label` em botões de ação apenas com ícone
- Foco visível com `ring-brand-500`
- Toggle de notificações com `role="switch"` + `aria-checked`

## Licença

Projeto interno de demonstração.
