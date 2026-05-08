# NesisAI

Copiloto clínico que utiliza IA para detectar erros de prescrição e interações medicamentosas em tempo real, integrado ao prontuário do eSUS APS através de uma extensão Chrome.

## Sobre o Projeto

NesisAI é um sistema de apoio à decisão clínica (CDSS) para médicos da Atenção Primária à Saúde (APS) do SUS. Atua como sidebar ao lado do prontuário do eSUS APS e oferece:

1. **Detecção Automática de Prontuários**: extensão Chrome reconhece a página do eSUS APS e extrai dados clínicos do paciente e da prescrição em tempo real.
2. **Análise Híbrida LLM + RAG**: motor de IA que combina Google Gemini com base de conhecimento cardiovascular indexada em pgvector.
3. **Alertas Classificados por Severidade**: feedback exibido como GRAVE, MODERADO ou LEVE, com recomendação clínica e citação explícita da fonte.
4. **Revisão Humana**: gaveta lateral editável que permite ao médico corrigir os dados scrapeados e reanalisar.

> **Sobre o eSUS APS**: o eSUS APS é o sistema de prontuário eletrônico oficial do Ministério da Saúde do Brasil, utilizado pela APS em milhares de Unidades Básicas. A extensão NesisAI foi projetada para integrar-se nativamente ao fluxo de trabalho médico, sem substituí-lo.

## Funcionalidades Principais

- Detecção automática do prontuário do eSUS APS via `host_permissions` (Manifest V3)
- Scraping estruturado do DOM com XPaths mapeados e fallback heurístico
- Normalização de nomes comerciais → DCB via LLM
- Verificação clínica com Gemini 2.5 Flash + RAG sobre base cardiovascular (41 entradas)
- Classificação automática por severidade (GRAVE / MODERADO / LEVE) com fonte citada
- Gaveta lateral editável para correção de dados e reanálise sem novo scraping
- Histórico de análises e configurações persistidos localmente (`localStorage`)

## Tecnologias Utilizadas

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Banco de Dados**: PostgreSQL 16 + pgvector
- **ORM**: SQLAlchemy 2 (async) + Alembic
- **IA**: Google Gemini 2.5 Flash + `models/gemini-embedding-001`
- **RAG**: LangChain + langchain-postgres

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Estilização**: Tailwind CSS
- **Plataforma**: Chrome Extension Manifest V3 + Side Panel API

### Infraestrutura
- Docker + Docker Compose com named volumes (`pgvector/pgvector:pg16`)

## Como Rodar

### Pré-requisitos

- Docker e Docker Compose
- Node.js 18+
- Google Chrome
- API Key do Google AI Studio

### Backend

```bash
cd backend
cp .env.example .env   # adicionar GEMINI_API_KEY
docker compose up --build
```

Após subir, popular a base de conhecimento:

```bash
docker exec -it backend-backend-1 python scripts/ingest_knowledge.py
```

Para detalhes de configuração, variáveis de ambiente e troubleshooting, ver [`backend/README_DOCKER.md`](backend/README_DOCKER.md).

### Frontend

```bash
cd frontend
npm install
npm run build:extension
```

Em `chrome://extensions` → Modo do desenvolvedor → Carregar sem compactação → selecionar `frontend/dist/`.

Para detalhes de desenvolvimento e build, ver [`frontend/README.md`](frontend/README.md).

## Base de Conhecimento

41 entradas curadas no domínio cardiovascular brasileiro (`backend/data/cardio_knowledge.json`):

| Prefixo | Categoria | Quantidade |
|---|---|---|
| `INT` | Interações medicamentosas | 16 |
| `CON` | Contraindicações | 8 |
| `IDO` | Considerações geriátricas | 8 |
| `REN` | Ajustes por função renal | 5 |
| `SUP` | Alertas de suplementação | 4 |

## Documentação

| Documento | Conteúdo |
|---|---|
| [`backend/README.md`](backend/README.md) | Setup, endpoint principal, validação rápida |
| [`backend/README_DOCKER.md`](backend/README_DOCKER.md) | Docker Compose, volumes, troubleshooting |
| [`backend/README_DEV.md`](backend/README_DEV.md) | Desenvolvimento local, Alembic, testes |
| [`backend/app/motor/README.md`](backend/app/motor/README.md) | Pipeline de IA, modelos, contrato |
| [`frontend/README.md`](frontend/README.md) | Build da extensão, fluxo de estados, estrutura |
| [`CLAUDE.md`](CLAUDE.md) | Contexto técnico, stack v2, regras do projeto |

## Licença

Este projeto foi desenvolvido como projeto de hackathon.
