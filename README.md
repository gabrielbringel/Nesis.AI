# Nesis.AI â Sistema de Apoio Ã  DecisÃ£o ClÃ­nica

Ferramenta de apoio para mÃ©dicos da AtenÃ§Ã£o PrimÃ¡ria Ã  SaÃºde (APS) do SUS, focada na **detecÃ§Ã£o de interaÃ§Ãµes medicamentosas** e **erros de prescriÃ§Ã£o** a partir de prontuÃ¡rios colados diretamente na interface.

A ferramenta opera de forma externa ao eSUS APS â o mÃ©dico copia o texto ou exporta o XML do prontuÃ¡rio e o insere manualmente. Nenhum dado de saÃºde trafega para APIs externas; apenas identificadores padronizados (RxNorm ID, SMILES) cruzam a fronteira de privacidade.

---

## Funcionalidades

- **AnÃ¡lise de texto livre** â cole o texto da prescriÃ§Ã£o; o BioBERTpt extrai medicamentos, doses, frequÃªncias e vias automaticamente
- **AnÃ¡lise de XML do eSUS** â parsing direto dos campos de medicaÃ§Ã£o, sem NER
- **DetecÃ§Ã£o de interaÃ§Ãµes medicamentosas** â trÃªs fontes de sinal combinadas em ensemble: base DrugBank/OpenFDA, prediÃ§Ã£o por GNN (ChemicalX) e motor de regras clÃ­nicas
- **Alertas graduados** â severidade GRAVE / MODERADA / LEVE com mecanismo, recomendaÃ§Ã£o clÃ­nica e evidÃªncia citada
- **NormalizaÃ§Ã£o de nomes brasileiros** â nomes comerciais e genÃ©ricos resolvidos via RxNorm â DrugBank â base ANVISA/BNAFAR local â busca fuzzy
- **GestÃ£o de pacientes** â cadastro e histÃ³rico vinculado a anÃ¡lises anteriores
- **HistÃ³rico de anÃ¡lises** â todas as anÃ¡lises sÃ£o persistidas para auditoria e rastreabilidade
- **ConfiguraÃ§Ãµes por usuÃ¡rio** â threshold de severidade mÃ­nima configurÃ¡vel, preferÃªncias de exibiÃ§Ã£o
- **Modo de severidade mÃ­nima** â alertas LEVE suprimidos por padrÃ£o (configurÃ¡vel via `MIN_SEVERITY_TO_ALERT`)
- **Rastreamento de experimentos** â integraÃ§Ã£o opcional com MLflow para log de mÃ©tricas por execuÃ§Ã£o do pipeline

---

## Arquitetura

```
Nesis.AI/
âââ frontend/         # SPA React 18 + Vite (interface mÃ©dica)
âââ frontend-v2/      # ProtÃ³tipo HTML/CSS/JS (design e telas)
âââ backend/          # API REST FastAPI + PostgreSQL
âââ motor/            # Motor de IA (NER â normalizaÃ§Ã£o â sinais â scoring)
```

O **motor** Ã© independente do backend e pode ser usado como biblioteca Python pura. O backend o consome via Celery para processamento assÃ­ncrono de anÃ¡lises pesadas.

---

## Stack

### Frontend (`frontend/`)

| Tecnologia | VersÃ£o | Papel |
|---|---|---|
| React | 18.3 | UI declarativa |
| TypeScript | 5.4 | Tipagem estÃ¡tica |
| Vite | 5.3 | Bundler e dev server |
| Tailwind CSS | 3.4 | UtilitÃ¡rios de estilo |
| Zustand | 4.5 | Gerenciamento de estado global |
| React Router DOM | 6.24 | Roteamento SPA |
| Axios | 1.7 | Cliente HTTP |
| Recharts | 2.12 | GrÃ¡ficos e visualizaÃ§Ãµes |
| Lucide React | 0.400 | Ãcones SVG |
| react-hot-toast | 2.4 | NotificaÃ§Ãµes |
| Space Mono | â | Tipografia display/UI |
| JetBrains Mono | â | Tipografia mono/cÃ³digo |

O design segue um sistema **neumÃ³rfico** â superfÃ­cies extrudadas com sombras suaves internas e externas sobre fundo monocromÃ¡tico (`#E7E5E4`), sem bordas explÃ­citas.

### Frontend v2 (`frontend-v2/`)

ProtÃ³tipo estÃ¡tico em HTML, CSS e JavaScript vanilla. ContÃ©m a landing page, tela de login e dashboard. Sem dependÃªncias de build â abre direto no browser.

### Backend (`backend/`)

| Tecnologia | VersÃ£o | Papel |
|---|---|---|
| FastAPI | 0.111+ | API REST assÃ­ncrona |
| Uvicorn | 0.29+ | ASGI server |
| SQLAlchemy (async) | 2.0+ | ORM assÃ­ncrono |
| asyncpg | 0.29+ | Driver PostgreSQL assÃ­ncrono |
| Alembic | 1.13+ | MigraÃ§Ãµes de banco |
| Pydantic v2 | 2.6+ | ValidaÃ§Ã£o e serializaÃ§Ã£o |
| pydantic-settings | 2.2+ | ConfiguraÃ§Ã£o via `.env` |
| httpx | 0.27+ | Cliente HTTP assÃ­ncrono |
| MLflow | 2.11+ | Rastreamento de experimentos |
| PostgreSQL 16 + pgvector | â | Banco principal + embeddings |
| Redis 7 | â | Cache de pares de fÃ¡rmacos |

**MÃ³dulos de domÃ­nio:**

- `app/patients/` â CRUD de pacientes (router, service, schemas, models)
- `app/prescriptions/` â CRUD de prescriÃ§Ãµes e disparo de anÃ¡lises
- `app/motor/` â adaptador que invoca o motor Python via mock ou Celery

### Motor de IA (`motor/`)

| Tecnologia | VersÃ£o | Papel |
|---|---|---|
| Transformers (HuggingFace) | 4.40+ | Carregamento do BioBERTpt |
| PyTorch | 2.2+ | InferÃªncia NER |
| RDKit | 2023.9+ | ManipulaÃ§Ã£o de SMILES/estruturas moleculares |
| ChemicalX (AstraZeneca) | 0.1+ | GNN para prediÃ§Ã£o de interaÃ§Ãµes DDI |
| Neo4j Python Driver | 5.18+ | Consultas ao grafo de interaÃ§Ãµes |
| Pydantic v2 | 2.6+ | Modelos de dados internos |
| python-dotenv | 1.0+ | VariÃ¡veis de ambiente |
| MLflow | 2.11+ | Log de mÃ©tricas por execuÃ§Ã£o |

**Modelos de IA utilizados:**

- `pucpr/biobertpt-all` â Ãºnico modelo BERT clÃ­nico treinado em portuguÃªs brasileiro; usado para NER de medicamentos, doses, frequÃªncias e vias
- ChemicalX EPGCNDS â GNN treinada em DDI pela AstraZeneca; generaliza para interaÃ§Ãµes nÃ£o catalogadas a partir da estrutura molecular (SMILES)

**Bancos de dados de referÃªncia:**

- DrugBank XML + OpenFDA â Neo4j (grafo de interaÃ§Ãµes conhecidas e validadas)
- RxNorm API â normalizaÃ§Ã£o de nomes para IDs padronizados
- Base ANVISA/BNAFAR local (`data/anvisa_rxnorm_map.csv`) â medicamentos brasileiros ausentes no RxNorm
- PubChem API â obtenÃ§Ã£o de SMILES para entradas no ChemicalX

---

## Pipeline do Motor de IA

```
Texto do prontuÃ¡rio
       â
       â¼
âââââââââââââââââââââââââââââââââââ
â  Etapa 1 â ExtraÃ§Ã£o (BioBERTpt) â  pucpr/biobertpt-all
â  medicamentos Â· doses Â· vias    â
ââââââââââââââââââ¬âââââââââââââââââ
                 â
                 â¼
âââââââââââââââââââââââââââââââââââ
â  Etapa 2 â NormalizaÃ§Ã£o         â  RxNorm â DrugBank â ANVISA â fuzzy
â  nome comercial â RxNorm ID     â  SMILES via PubChem
â  nome genÃ©rico â ATC code       â
ââââââââââââââââââ¬âââââââââââââââââ
                 â
        ââââââââââ´âââââââââ
        â   Par de fÃ¡rmacos por combinaÃ§Ã£o (n choose 2)
        â
  âââââââ´âââââââ¬âââââââââââââââ¬âââââââââââââââ
  â¼            â¼              â¼
DrugBank    ChemicalX    Regras ClÃ­nicas
(Neo4j)      (GNN)        (Python)
  â            â              â
  âââââââ¬âââââââ´âââââââââââââââ
        â
        â¼
âââââââââââââââââââââââââââââââââââ
â  Etapa 4 â Scoring Ensemble     â
â  0.40 Ã DrugBank                â
â  0.30 Ã ChemicalX               â
â  0.30 Ã Regras                  â
â                                 â
â  â¥ 0.70 â GRAVE                 â
â  0.40â0.69 â MODERADA           â
â  < 0.40 â LEVE                  â
ââââââââââââââââââ¬âââââââââââââââââ
                 â
                 â¼
        Alertas estruturados
  (par, severidade, mecanismo,
   recomendaÃ§Ã£o, evidÃªncia, score)
```

**Motor de regras clÃ­nicas** (hardcoded, sem ML): dose mÃ¡xima diÃ¡ria, duplicidade terapÃªutica por cÃ³digo ATC, contraindicaÃ§Ãµes absolutas, ajuste renal, via de administraÃ§Ã£o inadequada, anticoagulante + antiagregante, IECA em gestante, entre outros.

Os pesos do ensemble sÃ£o configurÃ¡veis via variÃ¡veis de ambiente (`DRUGBANK_WEIGHT`, `CHEMICALX_WEIGHT`, `RULES_WEIGHT`) e normalizados automaticamente para somar 1.0.

---

## Como Rodar o Sistema (Passo a Passo)

### 1. Pré-requisitos
- **Node.js** (para construir a extensão Chrome)
- **Python 3.10+** (para rodar scripts de manutenção)
- **Docker e Docker Compose** (para rodar o banco de dados e a API)
- Uma chave de API do **Google Gemini** (Gemini 2.5 Flash)

### 2. Configurando o Backend e o RAG
O backend utiliza o PostgreSQL com a extensão PGVector para o RAG, e uma API em FastAPI. Tudo já está configurado no Docker Compose.

Abra o seu terminal na raiz do projeto e execute:

```bash
cd backend

# 1. Crie o arquivo .env
# Copie o conteúdo de .env.example para um novo arquivo chamado .env
# IMPORTANTE: Preencha a variável GEMINI_API_KEY com a sua chave do Google AI Studio.

# 2. Suba a infraestrutura (API + Banco de Dados)
docker compose up -d

# 3. Prepare o seu ambiente Python local (necessário para rodar o script de ingestão)
python -m venv venv
# Ative no Windows (PowerShell): .\venv\Scripts\Activate.ps1
# Ative no Linux/Mac/WSL: source venv/bin/activate

# 4. Instale as dependências
pip install -r requirements.txt

# 5. Popule o Banco de Conhecimento (RAG)
# Isso vai ler o JSON local e gerar os embeddings usando o Gemini, salvando no PGVector.
python scripts/ingest_knowledge.py
```

Após isso, o backend estará rodando e acessível em `http://localhost:8000/docs` (Swagger).

### 3. Configurando e Instalando a Extensão (Frontend)
O frontend é uma extensão do Google Chrome construída em React + Vite.

Abra um NOVO terminal na raiz do projeto e execute:

```bash
cd frontend

# 1. Instale as dependências do Node
npm install

# 2. Construa a versão final da extensão
npm run build:extension
```

Após rodar o comando acima, a pasta `frontend/dist/` conterá a extensão pronta.

**Para instalar no Chrome:**
1. Abra o navegador Chrome e acesse `chrome://extensions/`
2. Ative o **Modo do Desenvolvedor** (no canto superior direito).
3. Clique em **"Carregar sem compactação"** (Load unpacked).
4. Selecione a pasta `frontend/dist/` do projeto.

Pronto! A extensão do Nesis.AI estará ativa. Sempre que você modificar o código do frontend, lembre-se de rodar `npm run build:extension` novamente e clicar no ícone de "Atualizar" (🔄) no card da extensão dentro do Chrome.

---

### VariÃ¡veis de ambiente â Motor (`motor/.env`)

| VariÃ¡vel | PadrÃ£o | DescriÃ§Ã£o |
|---|---|---|
| `NEO4J_URI` | `bolt://localhost:7687` | EndereÃ§o do Neo4j |
| `NEO4J_USER` | `neo4j` | UsuÃ¡rio Neo4j |
| `NEO4J_PASSWORD` | â | Senha Neo4j |
| `BIOBERTPT_MODEL` | `pucpr/biobertpt-all` | Modelo HuggingFace |
| `CHEMICALX_MODEL_PATH` | `models/chemicalx_ddi.pt` | Caminho do modelo GNN |
| `USE_GPU` | `false` | Habilita CUDA |
| `PIPELINE_VERSION` | `0.1.0` | VersÃ£o logada no MLflow |
| `MIN_SEVERITY_TO_ALERT` | `MODERADA` | `LEVE` \| `MODERADA` \| `GRAVE` |
| `DRUGBANK_WEIGHT` | `0.40` | Peso do sinal DrugBank |
| `CHEMICALX_WEIGHT` | `0.30` | Peso do sinal ChemicalX |
| `RULES_WEIGHT` | `0.30` | Peso do motor de regras |

### VariÃ¡veis de ambiente â Backend (`backend/.env`)

| VariÃ¡vel | DescriÃ§Ã£o |
|---|---|
| `DATABASE_URL` | URL asyncpg do PostgreSQL |
| `REDIS_URL` | URL do Redis |
| `APP_ENV` | `development` \| `production` |
| `APP_VERSION` | VersÃ£o da API |
| `MLFLOW_TRACKING_URI` | URI do servidor MLflow (opcional) |

---

## Testes

```bash
# Backend
cd backend && pytest

# Motor
cd motor && pytest
```

Os testes do motor cobrem: extrator NER, normalizaÃ§Ã£o, pipeline completo, motor de regras e scorer ensemble.

---

## Formas de entrada aceitas

| Formato | Mecanismo |
|---|---|
| Texto livre | BioBERTpt (NER) |
| XML do eSUS APS | Parsing estruturado direto nos campos de medicaÃ§Ã£o |
| PDF | OCR + NER (qualidade depende da qualidade do scan) |

---

## Privacidade e conformidade (LGPD)

- Apenas identificadores padronizados (RxNorm ID, SMILES) saem da fronteira de privacidade para consultas a APIs externas (RxNorm, PubChem)
- Dados de pacientes sÃ£o transmitidos via TLS; o servidor deve estar hospedado no Brasil
- Dados sÃ£o pseudonimizados antes de qualquer log de auditoria
- Nenhum dado de paciente Ã© usado para retreinar modelos sem consentimento explÃ­cito
- VersÃ£o desktop futura (Electron) processarÃ¡ tudo localmente, sem que nenhum dado saia do equipamento do mÃ©dico

---

## Roadmap

| Fase | EntregÃ¡vel | Status |
|---|---|---|
| MVP | Motor de IA funcional + interface web com texto livre | Em andamento |
| v1 | Suporte a XML do eSUS + parsing estruturado | Planejado |
| v2 | VersÃ£o desktop Electron (processamento offline) | Planejado |
| v3 | Proposta formal de integraÃ§Ã£o via API DATASUS | Baixa prioridade |

---

## LicenÃ§a

Veja [LICENSE](LICENSE).


---

## ?? Relatório Técnico: Deploy e Infraestrutura (Bug Report #2)
Projeto: Extensão Chrome de Análise de Prescrições (e-SUS)
Fase: Containerização (Docker) e Conformidade de Segurança (Manifest V3)

?? **Resumo Executivo**
Durante a preparação do projeto para o ambiente de demonstração (Pitch/Hackathon), deparámo-nos com falhas arquiteturais ligadas ao isolamento de rede do Docker e às rígidas políticas de segurança do Google Chrome (Manifest V3). Os problemas foram mapeados para falhas de binding de rede e violações de User Gesture, sendo todos resolvidos com ajustes de configuração, sem necessidade de reescrever a lógica de negócio.

??? **Detalhamento dos Erros e Soluções**

**1. Bloqueio de Abertura Automática da Extensão (Security Policy)**
- **Sintoma:** O Service Worker da extensão falhava silenciosamente ou apresentava o erro "Error: sidePanel.open() may only be called in response to a user gesture" no console do Chrome, impedindo a extensão de funcionar ao carregar o e-SUS.
- **Causa Raiz:** No Manifest V3, a Google implementou regras estritas contra injeções visuais não solicitadas. O código tentava usar o evento de carregamento da página (chrome.tabs.onUpdated) para forçar a abertura do Painel Lateral automaticamente. O navegador bloqueia isso por não identificar uma intenção explícita do utilizador (clique).
- **Solução:** 
  1. Remoção do script de automação (onUpdated) do Service Worker.
  2. Implementação da API declarativa chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).
  3. **Resultado:** A extensão passou a respeitar as diretrizes da Web Store, abrindo o painel de forma estável e segura quando o médico clica no ícone da extensão (User Gesture validado).

---

## 🚀 Atualização de Features: Refatoração do Scraping do eSUS (Manifest V3)

**Resumo das Alterações Arquiteturais e Novas Funcionalidades:**
- **Scraper Self-Contained (`esus-scraper.ts`)**: Implementação de extração 100% isolada via 10 XPaths precisos (nome, idade, sexo, peso, altura, alergias, motivos de consulta, avaliação, problemas e medicações iteradas). Inclui também fallback heurístico via varredura de texto caso a estrutura falhe ou atrase.
- **Utilitários de Formatação (`format.ts`)**: Lógica padronizada para encurtamento de nomes (`abbreviateName`), normalização de gênero biológico (`normalizeSexo`) e construção limpa do `displayLabel` do paciente (`buildPatientLabel`).
- **Payload Clínico Rico (`useSidebar.ts`)**: O frontend agora captura e envia dados fisiológicos e de evolução clínica completos (peso, altura, alergias, SOAP, problemas/condições, posologia completa) para o backend. Isso aumenta drasticamente o contexto médico na verificação das interações pelo Gemini.
- **Auto-Start Inteligente**: Injeção do scraper atrelada rigidamente a validação de aba (URL precisa conter `/lista-atendimento/atendimento/`), poupando processamento e aberturas falsas. Em ambiente dev, a extensão entra diretamente no fluxo de mockup local.
- **Mock e UI Refinados**: `HistoryView` e `HistoryItem` refatorados para consumir os novos labels dinâmicos. Problemas com sufixos genéricos de texto (`Xa`) no mock foram varridos e eliminados. O backend também já está sincronizado para aceitar e computar a riqueza extra de dados neste novo esquema.

**Correções e Refinamentos (Scraper de Medicações):**
- **XPath Principal Refatorado:** O XPath utilizado para iterar as medicações na tela do e-SUS foi atualizado para um caminho absoluto mais estável, contornando a mudança/dinamismo do ID `accordion__panel-raa-801` que quebrava o scraper original.
- **Heurística de Fallback Aprimorada:** A busca de emergência por medicamentos varrendo a tela agora usa Regex com limites de palavra (`\b`) para checar `mg`, `ml`, `ui`, `gotas`. Isso eliminou um bug crítico que trazia strings de interface aleatórias como "Equipe E**MUL**TI" ou "Arq**UI**vos" por coincidência silábica.
- **Parsing Automático de Posologia:** Implementada a função `parsePosologia` em `useSidebar.ts` que quebra de forma automática a string híbrida recebida do e-SUS (`"Dose, Frequência | Via | Forma Farmacêutica"`) em campos padronizados independentes (`dose`, `frequencia`, `via`), mantendo o campo `posologia_completa` intacto como evidência secundária.
