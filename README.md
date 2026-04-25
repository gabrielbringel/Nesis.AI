# Nesis.AI — Sistema de Apoio à Decisão Clínica

Ferramenta de apoio para médicos da Atenção Primária à Saúde (APS) do SUS, focada na **detecção de interações medicamentosas** e **erros de prescrição** a partir de prontuários colados diretamente na interface.

A ferramenta opera de forma externa ao eSUS APS — o médico copia o texto ou exporta o XML do prontuário e o insere manualmente. Nenhum dado de saúde trafega para APIs externas; apenas identificadores padronizados (RxNorm ID, SMILES) cruzam a fronteira de privacidade.

---

## Funcionalidades

- **Análise de texto livre** — cole o texto da prescrição; o BioBERTpt extrai medicamentos, doses, frequências e vias automaticamente
- **Análise de XML do eSUS** — parsing direto dos campos de medicação, sem NER
- **Detecção de interações medicamentosas** — três fontes de sinal combinadas em ensemble: base DrugBank/OpenFDA, predição por GNN (ChemicalX) e motor de regras clínicas
- **Alertas graduados** — severidade GRAVE / MODERADA / LEVE com mecanismo, recomendação clínica e evidência citada
- **Normalização de nomes brasileiros** — nomes comerciais e genéricos resolvidos via RxNorm → DrugBank → base ANVISA/BNAFAR local → busca fuzzy
- **Gestão de pacientes** — cadastro e histórico vinculado a análises anteriores
- **Histórico de análises** — todas as análises são persistidas para auditoria e rastreabilidade
- **Configurações por usuário** — threshold de severidade mínima configurável, preferências de exibição
- **Modo de severidade mínima** — alertas LEVE suprimidos por padrão (configurável via `MIN_SEVERITY_TO_ALERT`)
- **Rastreamento de experimentos** — integração opcional com MLflow para log de métricas por execução do pipeline

---

## Arquitetura

```
Nesis.AI/
├── frontend/         # SPA React 18 + Vite (interface médica)
├── frontend-v2/      # Protótipo HTML/CSS/JS (design e telas)
├── backend/          # API REST FastAPI + PostgreSQL
└── motor/            # Motor de IA (NER → normalização → sinais → scoring)
```

O **motor** é independente do backend e pode ser usado como biblioteca Python pura. O backend o consome via Celery para processamento assíncrono de análises pesadas.

---

## Stack

### Frontend (`frontend/`)

| Tecnologia | Versão | Papel |
|---|---|---|
| React | 18.3 | UI declarativa |
| TypeScript | 5.4 | Tipagem estática |
| Vite | 5.3 | Bundler e dev server |
| Tailwind CSS | 3.4 | Utilitários de estilo |
| Zustand | 4.5 | Gerenciamento de estado global |
| React Router DOM | 6.24 | Roteamento SPA |
| Axios | 1.7 | Cliente HTTP |
| Recharts | 2.12 | Gráficos e visualizações |
| Lucide React | 0.400 | Ícones SVG |
| react-hot-toast | 2.4 | Notificações |
| Space Mono | — | Tipografia display/UI |
| JetBrains Mono | — | Tipografia mono/código |

O design segue um sistema **neumórfico** — superfícies extrudadas com sombras suaves internas e externas sobre fundo monocromático (`#E7E5E4`), sem bordas explícitas.

### Frontend v2 (`frontend-v2/`)

Protótipo estático em HTML, CSS e JavaScript vanilla. Contém a landing page, tela de login e dashboard. Sem dependências de build — abre direto no browser.

### Backend (`backend/`)

| Tecnologia | Versão | Papel |
|---|---|---|
| FastAPI | 0.111+ | API REST assíncrona |
| Uvicorn | 0.29+ | ASGI server |
| SQLAlchemy (async) | 2.0+ | ORM assíncrono |
| asyncpg | 0.29+ | Driver PostgreSQL assíncrono |
| Alembic | 1.13+ | Migrações de banco |
| Pydantic v2 | 2.6+ | Validação e serialização |
| pydantic-settings | 2.2+ | Configuração via `.env` |
| httpx | 0.27+ | Cliente HTTP assíncrono |
| MLflow | 2.11+ | Rastreamento de experimentos |
| PostgreSQL 16 + pgvector | — | Banco principal + embeddings |
| Redis 7 | — | Cache de pares de fármacos |

**Módulos de domínio:**

- `app/patients/` — CRUD de pacientes (router, service, schemas, models)
- `app/prescriptions/` — CRUD de prescrições e disparo de análises
- `app/motor/` — adaptador que invoca o motor Python via mock ou Celery

### Motor de IA (`motor/`)

| Tecnologia | Versão | Papel |
|---|---|---|
| Transformers (HuggingFace) | 4.40+ | Carregamento do BioBERTpt |
| PyTorch | 2.2+ | Inferência NER |
| RDKit | 2023.9+ | Manipulação de SMILES/estruturas moleculares |
| ChemicalX (AstraZeneca) | 0.1+ | GNN para predição de interações DDI |
| Neo4j Python Driver | 5.18+ | Consultas ao grafo de interações |
| Pydantic v2 | 2.6+ | Modelos de dados internos |
| python-dotenv | 1.0+ | Variáveis de ambiente |
| MLflow | 2.11+ | Log de métricas por execução |

**Modelos de IA utilizados:**

- `pucpr/biobertpt-all` — único modelo BERT clínico treinado em português brasileiro; usado para NER de medicamentos, doses, frequências e vias
- ChemicalX EPGCNDS — GNN treinada em DDI pela AstraZeneca; generaliza para interações não catalogadas a partir da estrutura molecular (SMILES)

**Bancos de dados de referência:**

- DrugBank XML + OpenFDA → Neo4j (grafo de interações conhecidas e validadas)
- RxNorm API → normalização de nomes para IDs padronizados
- Base ANVISA/BNAFAR local (`data/anvisa_rxnorm_map.csv`) → medicamentos brasileiros ausentes no RxNorm
- PubChem API → obtenção de SMILES para entradas no ChemicalX

---

## Pipeline do Motor de IA

```
Texto do prontuário
       │
       ▼
┌─────────────────────────────────┐
│  Etapa 1 — Extração (BioBERTpt) │  pucpr/biobertpt-all
│  medicamentos · doses · vias    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Etapa 2 — Normalização         │  RxNorm → DrugBank → ANVISA → fuzzy
│  nome comercial → RxNorm ID     │  SMILES via PubChem
│  nome genérico → ATC code       │
└────────────────┬────────────────┘
                 │
        ┌────────┴────────┐
        │   Par de fármacos por combinação (n choose 2)
        │
  ┌─────┴──────┬──────────────┬──────────────┐
  ▼            ▼              ▼
DrugBank    ChemicalX    Regras Clínicas
(Neo4j)      (GNN)        (Python)
  │            │              │
  └─────┬──────┴──────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  Etapa 4 — Scoring Ensemble     │
│  0.40 × DrugBank                │
│  0.30 × ChemicalX               │
│  0.30 × Regras                  │
│                                 │
│  ≥ 0.70 → GRAVE                 │
│  0.40–0.69 → MODERADA           │
│  < 0.40 → LEVE                  │
└────────────────┬────────────────┘
                 │
                 ▼
        Alertas estruturados
  (par, severidade, mecanismo,
   recomendação, evidência, score)
```

**Motor de regras clínicas** (hardcoded, sem ML): dose máxima diária, duplicidade terapêutica por código ATC, contraindicações absolutas, ajuste renal, via de administração inadequada, anticoagulante + antiagregante, IECA em gestante, entre outros.

Os pesos do ensemble são configuráveis via variáveis de ambiente (`DRUGBANK_WEIGHT`, `CHEMICALX_WEIGHT`, `RULES_WEIGHT`) e normalizados automaticamente para somar 1.0.

---

## Configuração e execução

### Pré-requisitos

- Node.js 20+
- Python 3.11+
- Docker e Docker Compose

### Backend + infraestrutura

```bash
cd backend

# Copie e ajuste as variáveis de ambiente
cp .env.example .env

# Suba PostgreSQL e Redis
docker-compose up postgres redis -d

# Instale dependências e aplique migrações
pip install -r requirements.txt
alembic upgrade head

# Inicie o servidor
uvicorn app.main:app --reload --port 8000
```

A documentação interativa da API fica disponível em `http://localhost:8000/docs`.

### Motor de IA

```bash
cd motor

cp .env.example .env
# Ajuste NEO4J_URI, BIOBERTPT_MODEL, CHEMICALX_MODEL_PATH etc.

pip install -r requirements.txt

# Popule o grafo Neo4j com DrugBank + OpenFDA
python scripts/populate_neo4j.py
```

### Frontend

```bash
cd frontend

npm install
npm run dev
# Disponível em http://localhost:5173
```

### Variáveis de ambiente — Motor (`motor/.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `NEO4J_URI` | `bolt://localhost:7687` | Endereço do Neo4j |
| `NEO4J_USER` | `neo4j` | Usuário Neo4j |
| `NEO4J_PASSWORD` | — | Senha Neo4j |
| `BIOBERTPT_MODEL` | `pucpr/biobertpt-all` | Modelo HuggingFace |
| `CHEMICALX_MODEL_PATH` | `models/chemicalx_ddi.pt` | Caminho do modelo GNN |
| `USE_GPU` | `false` | Habilita CUDA |
| `PIPELINE_VERSION` | `0.1.0` | Versão logada no MLflow |
| `MIN_SEVERITY_TO_ALERT` | `MODERADA` | `LEVE` \| `MODERADA` \| `GRAVE` |
| `DRUGBANK_WEIGHT` | `0.40` | Peso do sinal DrugBank |
| `CHEMICALX_WEIGHT` | `0.30` | Peso do sinal ChemicalX |
| `RULES_WEIGHT` | `0.30` | Peso do motor de regras |

### Variáveis de ambiente — Backend (`backend/.env`)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL asyncpg do PostgreSQL |
| `REDIS_URL` | URL do Redis |
| `APP_ENV` | `development` \| `production` |
| `APP_VERSION` | Versão da API |
| `MLFLOW_TRACKING_URI` | URI do servidor MLflow (opcional) |

---

## Testes

```bash
# Backend
cd backend && pytest

# Motor
cd motor && pytest
```

Os testes do motor cobrem: extrator NER, normalização, pipeline completo, motor de regras e scorer ensemble.

---

## Formas de entrada aceitas

| Formato | Mecanismo |
|---|---|
| Texto livre | BioBERTpt (NER) |
| XML do eSUS APS | Parsing estruturado direto nos campos de medicação |
| PDF | OCR + NER (qualidade depende da qualidade do scan) |

---

## Privacidade e conformidade (LGPD)

- Apenas identificadores padronizados (RxNorm ID, SMILES) saem da fronteira de privacidade para consultas a APIs externas (RxNorm, PubChem)
- Dados de pacientes são transmitidos via TLS; o servidor deve estar hospedado no Brasil
- Dados são pseudonimizados antes de qualquer log de auditoria
- Nenhum dado de paciente é usado para retreinar modelos sem consentimento explícito
- Versão desktop futura (Electron) processará tudo localmente, sem que nenhum dado saia do equipamento do médico

---

## Roadmap

| Fase | Entregável | Status |
|---|---|---|
| MVP | Motor de IA funcional + interface web com texto livre | Em andamento |
| v1 | Suporte a XML do eSUS + parsing estruturado | Planejado |
| v2 | Versão desktop Electron (processamento offline) | Planejado |
| v3 | Proposta formal de integração via API DATASUS | Baixa prioridade |

---

## Licença

Veja [LICENSE](LICENSE).
