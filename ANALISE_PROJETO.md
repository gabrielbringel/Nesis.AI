# 🏥 Análise do Projeto Nesis.AI

## 📋 Contexto do Projeto

**Nesis.AI** é um sistema completo de **verificação de interações medicamentosas** com 3 camadas:

```
┌─────────────────────────────────────────────────────┐
│               🎨 FRONTEND (React/TypeScript)         │
│  - Dashboard, Pacientes, Análises, Histórico        │
│  - UI com Tailwind + componentes customizados       │
└─────────────┬───────────────────────────────────────┘
              │ HTTP/REST (axios)
┌─────────────▼───────────────────────────────────────┐
│             🔌 BACKEND (FastAPI/SQLAlchemy)         │
│  - Rotas: /prescriptions, /patients, /health        │
│  - BD SQLite/PostgreSQL com Alembic migrations      │
│  - Integração com motor de IA via mock_pipeline.py  │
└─────────────┬───────────────────────────────────────┘
              │ Python import/API
┌─────────────▼───────────────────────────────────────┐
│        🧠 MOTOR DE IA (Pacote Python)               │
│  - Extração: NER + regex (BioBERTpt)                │
│  - Normalização: RxNorm → ANVISA → PubChem         │
│  - Interações: DrugBank + ChemicalX + RulesEngine  │
│  - Scoring: Ensemble de múltiplas fontes           │
└─────────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitetura Detalhada

### 1️⃣ **Motor (`motor/`)** — Core de IA
- **Propósito**: Recebe prontuário, retorna alertas de interações
- **Fluxo**:
  1. `NERExtractor`: Extrai nomes de medicamentos
  2. `DrugNormalizer`: Converte nomes → IDs padrão (RxNorm/ANVISA)
  3. `DrugBankChecker`, `ChemicalXPredictor`, `ClinicalRulesEngine`: Detectam interações
  4. `RiskScorer`: Combina múltiplas fontes e pontua
  5. `MedicationPipeline`: Orquestra tudo

- **Pontos Positivos**:
  - ✅ Separação clara de responsabilidades
  - ✅ Suporte a mock para testes (sem dependências externas)
  - ✅ MLflow integrado para tracking de experimentos

### 2️⃣ **Backend (`backend/`)** — API & Persistência
- **Propósito**: Receber prontuários, processar, armazenar resultados
- **Tecnologia**: FastAPI + SQLAlchemy + Alembic
- **Rotas Principais**:
  - `POST /prescriptions/analyze` — Novo prontuário (dispara análise)
  - `GET /prescriptions` — Listar com filtros (página, paciente, severidade)
  - `GET /prescriptions/{id}` — Detalhe
  - `GET /prescriptions/{id}/alerts` — Alertas de uma prescrição
  - `GET /patients` — Gerenciar pacientes

- **BD Models**:
  - `Patient`: Dados do paciente
  - `Prescription`: Prontuário + metadados
  - `Alert`: Cada interação detectada

- **Pontos Positivos**:
  - ✅ Tratamento de erros centralizado
  - ✅ CORS habilitado
  - ✅ Migrations com Alembic
  - ✅ Paginação nas listas

### 3️⃣ **Frontend (`frontend/`)** — Interface
- **Propósito**: Capturar prontuários, exibir análises
- **Tecnologia**: React 18 + TypeScript + Vite + Tailwind
- **Páginas**:
  - `/dashboard` — Visão geral
  - `/pacientes` — CRUD de pacientes
  - `/analise/nova` — Formulário de análise
  - `/analise/:id` — Resultado detalhado
  - `/historico` — Histórico de prescrições
  - `/configuracoes` — Configurações

- **Pontos Positivos**:
  - ✅ Routing bem estruturado
  - ✅ Toast notifications (react-hot-toast)
  - ✅ Componentes reutilizáveis

---

## 🔴 Problemas Identificados & 💡 Sugestões de Melhoria

### **Problema 1: CORS Aberto Demais** ⚠️
```python
# ❌ Backend main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ← INSEGURO em produção!
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Impacto**: Qualquer site pode fazer requisições à sua API.

**Solução**:
```python
# ✅ Config baseada em ambiente
allowed_origins = (
    ["http://localhost:3000", "http://localhost:5173"]  # dev
    if settings.app_env == "development"
    else ["https://seu-dominio.com"]  # prod
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)
```

---

### **Problema 2: Sem Autenticação/Autorização** 🔓
- Backend expõe APIs sem proteção
- Qualquer pessoa pode acessar dados de pacientes
- Sem controle de quem pode analisar prescrições

**Solução**:
```python
# ✅ Adicionar JWT + Middleware de auth
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthCredential

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthCredential = Depends(security)):
    token = credentials.credentials
    # Validar JWT
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    return payload["sub"]  # user_id

# Proteger rotas
@router.post("/prescriptions/analyze")
async def analyze_prescription(
    payload: PrescriptionCreate,
    user_id: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    # ... agora só usuários autenticados podem analisar
```

---

### **Problema 3: Sem Logging Estruturado** 📝
- Logs espalhados, difícil rastrear erros em produção
- Sem contexto (user_id, request_id)
- MLflow inicializa, mas não está integrado ao pipeline de análise

**Solução**:
```python
# ✅ Usar structured logging (python-json-logger)
import logging
from pythonjsonlogger import jsonlogger

handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
handler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(handler)

# Log com contexto
logger.info("prescription_analyzed", extra={
    "user_id": user_id,
    "prescription_id": prescription.id,
    "alerts_count": len(alerts),
    "processing_time_ms": result.processing_time_ms
})
```

---

### **Problema 4: Processamento Síncrono na API** ⏱️
- `analyze_prescription` roda o motor **direto** na requisição
- Se o motor levar 10+ segundos, a requisição fica pendurada
- Sem retry/timeout apropriado

**Solução**:
```python
# ✅ Usar Celery/Fila de Tasks + Status Endpoint
# backend/app/prescriptions/service.py

async def analyze_prescription(db: AsyncSession, payload: PrescriptionCreate):
    # Criar prescrição com status "pending"
    prescription = Prescription(
        patient_id=payload.patient_id,
        raw_text=payload.raw_text,
        status="processing"
    )
    db.add(prescription)
    await db.commit()
    
    # Dispara task assíncrona (Celery)
    analyze_prescription_task.delay(prescription.id)
    
    return prescription

# Novo endpoint para polling
@router.get("/{prescription_id}/status")
async def get_prescription_status(prescription_id: uuid.UUID, db: AsyncSession):
    prescription = await db.get(Prescription, prescription_id)
    return {
        "id": prescription.id,
        "status": prescription.status,  # pending/processing/done/error
        "progress": prescription.processing_time_ms  # se disponível
    }
```

---

### **Problema 5: Sem Validação de Entrada Rigorosa** 🚫
- Campo `raw_text` aceita qualquer string
- Sem limite de tamanho
- Sem sanitização

**Solução**:
```python
# ✅ Adicionar validação ao schema
from pydantic import BaseModel, Field, validator

class PrescriptionCreate(BaseModel):
    patient_id: uuid.UUID
    raw_text: str = Field(
        min_length=10,
        max_length=50000,
        description="Texto do prontuário"
    )
    input_type: InputType = "text"
    
    @validator('raw_text')
    def sanitize_text(cls, v):
        # Remove caracteres maliciosos
        import re
        v = re.sub(r'[^\w\s\n.,;:\-(){}]', '', v)
        return v.strip()
```

---

### **Problema 6: Mock Pipeline Desatualizado** 🎭
- `mock_pipeline.py` está simplificado
- Não cobre todos os casos reais
- Frontend só vê dados de mock em dev

**Solução**:
```python
# ✅ Adicionar feature flag para ativar motor real
@router.post("/prescriptions/analyze")
async def analyze_prescription(
    payload: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
):
    # Decidir qual pipeline usar
    if settings.app_env == "production":
        pipeline = MedicationPipeline()  # Real
    else:
        pipeline = MockPipeline()  # Dev/Test
    
    result = pipeline.analyze(payload.raw_text)
    # ... persistir resultado
```

---

### **Problema 7: Sem Testes de Integração** ❌
- Testes unitários no motor passam (36 testes)
- Mas nenhum teste end-to-end (E2E)
- Sem testes do backend API
- Sem testes do frontend

**Solução**:
```python
# ✅ Adicionar testes E2E (pytest + httpx)
# backend/tests/test_e2e_prescriptions.py

@pytest.mark.asyncio
async def test_analyze_prescription_end_to_end(client: AsyncClient, db_session):
    # 1. Criar paciente
    patient = await create_patient(db_session)
    
    # 2. Submeter prescrição
    response = await client.post(
        "/prescriptions/analyze",
        json={
            "patient_id": str(patient.id),
            "raw_text": "Paciente em uso de Warfarina e Aspirina"
        }
    )
    
    # 3. Validar resposta
    assert response.status_code == 201
    prescription = response.json()
    assert prescription["status"] == "done"
    assert len(prescription["alerts"]) > 0
    
    # 4. Buscar alertas
    response = await client.get(f"/prescriptions/{prescription['id']}/alerts")
    assert response.status_code == 200
    alerts = response.json()
    assert any(a["severity"] == "GRAVE" for a in alerts)
```

---

### **Problema 8: Sem Rate Limiting** 🚀
- Nenhuma proteção contra brute-force
- Sem limite de requisições por usuário

**Solução**:
```python
# ✅ Usar slowapi
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@router.post("/prescriptions/analyze")
@limiter.limit("5/minute")
async def analyze_prescription(...):
    ...
```

---

### **Problema 9: Sem Variáveis de Ambiente Validadas** 🔐
- `.env.example` não documenta todas as vars
- Config sem valores defaults sensatos

**Solução**:
```python
# ✅ Validar env vars no startup
@app.on_event("startup")
async def validate_config():
    required_vars = [
        "DATABASE_URL",
        "APP_ENV",
        "MLFLOW_TRACKING_URI"
    ]
    
    settings = get_settings()
    for var in required_vars:
        if not getattr(settings, var.lower(), None):
            logger.critical(f"Variable {var} not set!")
            raise ValueError(f"Missing {var}")
```

---

### **Problema 10: Frontend Sem Tratamento de Erros Robusto** ⚠️
- Sem retry automático em falhas de rede
- Sem fallback quando backend está down
- Sem cache local

**Solução**:
```typescript
// ✅ Adicionar retry + timeout + cache
import axios, { AxiosError } from "axios";
import axiosRetry from "axios-retry";

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error: AxiosError) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status ?? 0) === 503 // Service Unavailable
    );
  },
});

// Adicionar Service Worker para cache offline
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
```

---

## 📊 Resumo das Prioridades

| Problema | Severidade | Esforço | Impacto |
|----------|-----------|--------|---------|
| CORS Aberto | 🔴 Alta | Baixo | Alto |
| Sem Autenticação | 🔴 Alta | Médio | Crítico |
| Processamento Síncrono | 🟡 Média | Alto | Alto |
| Logs Estruturados | 🟡 Média | Baixo | Médio |
| Validação de Entrada | 🟡 Média | Baixo | Alto |
| Rate Limiting | 🟡 Média | Baixo | Médio |
| Testes E2E | 🟢 Baixa | Alto | Médio |
| Frontend Error Handling | 🟢 Baixa | Médio | Médio |

---

## ✅ O Que Está Bom

- ✅ **Arquitetura de 3 camadas bem definida**
- ✅ **Motor de IA robusto com múltiplas fontes**
- ✅ **Banco de dados normalizado com migrações**
- ✅ **Frontend com bom design system**
- ✅ **Tests no motor (36 testes passando)**
- ✅ **Docker + Docker Compose pronto**
- ✅ **MLflow integrado para tracking**

---

## 🎯 Próximos Passos Recomendados

1. **Imediato** (Semana 1):
   - [ ] Implementar autenticação JWT
   - [ ] Corrigir CORS
   - [ ] Adicionar validação de entrada

2. **Curto Prazo** (Semana 2-3):
   - [ ] Setup Celery para processamento assíncrono
   - [ ] Adicionar rate limiting
   - [ ] Logging estruturado

3. **Médio Prazo** (Semana 4+):
   - [ ] Testes E2E (backend + frontend)
   - [ ] Service Worker no frontend
   - [ ] Monitoring (Sentry, Datadog)

---

## 📚 Referências

- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Celery Docs](https://docs.celeryproject.org/)
- [React Testing Best Practices](https://testing-library.com/docs/react-testing-library/intro/)
