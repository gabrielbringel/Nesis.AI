# 🔧 Exemplos de Código - Correções Implementáveis

## 1. 🔒 Corrigir CORS Inseguro

### ❌ Antes (Inseguro)
```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### ✅ Depois (Seguro)
```python
# backend/app/main.py
from app.config import get_settings

settings = get_settings()

def get_cors_origins() -> list[str]:
    """Retorna origens permitidas baseadas no ambiente."""
    if settings.app_env == "development":
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
    else:
        # Production: apenas domínio específico
        return [
            "https://seu-dominio-principal.com",
            "https://app.seu-dominio-principal.com",
        ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    allow_credentials=True,
    max_age=600,  # Cache preflight por 10 min
)
```

---

## 2. 🔑 Adicionar Autenticação JWT

### Passo 1: Instalar dependência
```bash
pip install python-jose[cryptography] passlib[bcrypt]
```

### Passo 2: Criar módulo de auth
```python
# backend/app/auth.py
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredential
from passlib.context import CryptContext

# Configs
SECRET_KEY = "sua-chave-secreta-256bits-aleatorio"  # ⚠️ Colocar em .env!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash uma senha."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verifica se senha coincide com hash."""
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Cria JWT."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def verify_token(credentials: HTTPAuthCredential = Depends(security)) -> str:
    """Verifica JWT e retorna user_id."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    
    return user_id
```

### Passo 3: Usar em rotas
```python
# backend/app/prescriptions/router.py
from app.auth import verify_token

@router.post("/analyze", response_model=PrescriptionRead, status_code=status.HTTP_201_CREATED)
async def analyze_prescription(
    payload: PrescriptionCreate,
    user_id: str = Depends(verify_token),  # ← Proteção!
    db: AsyncSession = Depends(get_db),
) -> PrescriptionRead:
    # Agora só usuários autenticados podem analisar
    prescription = await service.analyze_prescription(db, payload, user_id)
    return PrescriptionRead.model_validate(prescription)
```

---

## 3. ⏱️ Processar de Forma Assíncrona (Celery)

### Passo 1: Instalar
```bash
pip install celery redis
```

### Passo 2: Config Celery
```python
# backend/app/celery_app.py
from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "nesis",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
)
```

### Passo 3: Definir task
```python
# backend/app/prescriptions/tasks.py
from app.celery_app import celery_app
from motor.pipeline import MedicationPipeline
from app.database import SessionLocal

@celery_app.task(bind=True, max_retries=3)
def analyze_prescription_task(self, prescription_id: str):
    """Task assíncrona para análise de prescrição."""
    try:
        db = SessionLocal()
        
        # Buscar prescrição
        prescription = db.query(Prescription).filter_by(id=prescription_id).first()
        if not prescription:
            raise Exception(f"Prescrição {prescription_id} não encontrada")
        
        # Marcar como processando
        prescription.status = "processing"
        db.commit()
        
        # Executar motor
        pipeline = MedicationPipeline()
        result = pipeline.analyze(prescription.raw_text)
        
        # Salvar resultados
        prescription.status = "done"
        prescription.processing_time_ms = result.processing_time_ms
        prescription.pipeline_version = result.pipeline_version
        
        for alert in result.alerts:
            alert_obj = Alert(
                prescription_id=prescription.id,
                drug_pair_1=alert.drug_pair[0],
                drug_pair_2=alert.drug_pair[1],
                severity=alert.severity,
                final_score=alert.final_score,
                mechanism=alert.mechanism,
                recommendation=alert.recommendation,
                evidence=alert.evidence,
                rule_ids=alert.rule_ids,
                component_scores=alert.component_scores,
            )
            db.add(alert_obj)
        
        db.commit()
        
    except Exception as exc:
        prescription.status = "error"
        db.commit()
        # Retry com backoff exponencial
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
    
    finally:
        db.close()
```

### Passo 4: Rotas
```python
# backend/app/prescriptions/router.py
from app.prescriptions.tasks import analyze_prescription_task

@router.post("/analyze", response_model=PrescriptionRead, status_code=status.HTTP_201_CREATED)
async def analyze_prescription(
    payload: PrescriptionCreate,
    user_id: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
) -> PrescriptionRead:
    # Criar prescrição com status "pending"
    prescription = Prescription(
        patient_id=payload.patient_id,
        raw_text=payload.raw_text,
        input_type=payload.input_type,
        status="pending",
    )
    db.add(prescription)
    await db.flush()
    await db.commit()
    
    # Disparar task assíncrona (não bloqueia)
    analyze_prescription_task.delay(str(prescription.id))
    
    return PrescriptionRead.model_validate(prescription)


@router.get("/{prescription_id}/status")
async def get_prescription_status(
    prescription_id: uuid.UUID,
    user_id: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    """Endpoint para cliente fazer polling de progresso."""
    prescription = await db.get(Prescription, prescription_id)
    
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescrição não encontrada")
    
    return {
        "id": prescription.id,
        "status": prescription.status,  # pending/processing/done/error
        "processing_time_ms": prescription.processing_time_ms,
        "alerts_count": len(prescription.alerts),
    }
```

---

## 4. 📝 Logging Estruturado

### Passo 1: Instalar
```bash
pip install python-json-logger
```

### Passo 2: Configurar
```python
# backend/app/logging.py
import logging
import json
import sys
from pythonjsonlogger import jsonlogger
from app.config import get_settings

settings = get_settings()

def setup_logging():
    """Configurar logging estruturado em JSON."""
    
    # Logger root
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Handler para stdout
    handler = logging.StreamHandler(sys.stdout)
    
    # Formater JSON
    formatter = jsonlogger.JsonFormatter(
        "%(timestamp)s %(level)s %(name)s %(message)s",
        timestamp=True,
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    # Silence bibliotecas verbose
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    
    return logger


# Middleware para adicionar request_id
from fastapi import Request
import uuid

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response
```

### Passo 3: Usar nos serviços
```python
# backend/app/prescriptions/service.py
import logging

logger = logging.getLogger(__name__)

async def analyze_prescription(db, payload, user_id):
    prescription = Prescription(...)
    db.add(prescription)
    await db.commit()
    
    logger.info(
        "prescription_created",
        extra={
            "user_id": user_id,
            "prescription_id": str(prescription.id),
            "patient_id": str(payload.patient_id),
            "text_length": len(payload.raw_text),
        }
    )
    
    # ... processar ...
    
    logger.info(
        "prescription_analyzed",
        extra={
            "prescription_id": str(prescription.id),
            "alerts_count": len(prescription.alerts),
            "processing_time_ms": prescription.processing_time_ms,
            "status": prescription.status,
        }
    )
```

---

## 5. 🚫 Rate Limiting

### Passo 1: Instalar
```bash
pip install slowapi
```

### Passo 2: Configurar
```python
# backend/app/main.py
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Muitas requisições. Tente novamente mais tarde."},
    )
```

### Passo 3: Aplicar a rotas críticas
```python
# backend/app/prescriptions/router.py
from slowapi import Limiter

@router.post("/analyze")
@limiter.limit("5/minute")  # 5 análises por minuto
async def analyze_prescription(
    payload: PrescriptionCreate,
    request: Request,  # ← Necessário para limiter
    db: AsyncSession = Depends(get_db),
):
    ...
```

---

## 6. ✅ Validação de Entrada Rigorosa

```python
# backend/app/prescriptions/schemas.py
from pydantic import BaseModel, Field, validator, field_validator
import re

class PrescriptionCreate(BaseModel):
    patient_id: uuid.UUID
    
    raw_text: str = Field(
        min_length=10,
        max_length=50000,
        description="Texto do prontuário (10-50k caracteres)"
    )
    
    input_type: InputType = "text"
    
    @field_validator('raw_text')
    def sanitize_text(cls, v):
        """Remove caracteres maliciosos."""
        # Remove caracteres de controle
        v = ''.join(char for char in v if ord(char) >= 32 or char in '\n\r\t')
        
        # Remove múltiplos espaços/newlines
        v = re.sub(r'\s+', ' ', v)
        
        return v.strip()
    
    @field_validator('raw_text')
    def no_sql_injection(cls, v):
        """Detecta padrões suspeitos de SQL injection."""
        suspicious = [
            "DROP TABLE", "DELETE FROM", "INSERT INTO",
            "UPDATE", "SELECT", "UNION", "--", ";",
        ]
        
        v_upper = v.upper()
        if any(pattern in v_upper for pattern in suspicious):
            raise ValueError("Texto contém padrões suspeitos")
        
        return v
```

---

## 7. 🧪 Teste E2E

```python
# backend/tests/test_e2e_prescriptions.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

@pytest.fixture
async def client():
    """Client HTTP para testes."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_analyze_prescription_end_to_end(client, db_session):
    """Teste E2E completo de análise de prescrição."""
    
    # 1. Criar paciente
    patient_response = await client.post(
        "/patients",
        json={
            "name": "João Silva",
            "date_of_birth": "1965-01-15",
            "cpf": "12345678900",
        }
    )
    assert patient_response.status_code == 201
    patient = patient_response.json()
    patient_id = patient["id"]
    
    # 2. Analisar prescrição
    prescription_response = await client.post(
        "/prescriptions/analyze",
        json={
            "patient_id": patient_id,
            "raw_text": "Paciente em uso de Warfarina 5mg 1x/dia e Aspirina 100mg 1x/dia",
            "input_type": "text",
        }
    )
    assert prescription_response.status_code == 201
    prescription = prescription_response.json()
    prescription_id = prescription["id"]
    
    # 3. Aguardar processamento (polling)
    import asyncio
    max_wait = 10  # segundos
    waited = 0
    while waited < max_wait:
        status_response = await client.get(f"/prescriptions/{prescription_id}/status")
        status_data = status_response.json()
        
        if status_data["status"] == "done":
            break
        
        await asyncio.sleep(1)
        waited += 1
    
    # 4. Verificar resultado
    result_response = await client.get(f"/prescriptions/{prescription_id}")
    assert result_response.status_code == 200
    
    result = result_response.json()
    assert result["status"] == "done"
    assert len(result["alerts"]) > 0
    
    # 5. Validar alertas
    alerts = result["alerts"]
    
    # Deve ter alerta GRAVE (Warfarina + Aspirina)
    grave_alerts = [a for a in alerts if a["severity"] == "GRAVE"]
    assert len(grave_alerts) > 0
    
    # Validar estrutura
    alert = grave_alerts[0]
    assert alert["drug_pair_1"] in ["Warfarina", "Aspirina"]
    assert alert["drug_pair_2"] in ["Warfarina", "Aspirina"]
    assert alert["final_score"] > 0.5
    assert len(alert["mechanism"]) > 0
    assert len(alert["recommendation"]) > 0
```

---

## 8. 🎯 Resumo: Como Aplicar

1. **Começar por**: CORS + Validação (Quick wins)
2. **Depois**: Autenticação JWT
3. **Depois**: Rate Limiting
4. **Depois**: Logging Estruturado
5. **Depois**: Celery (mais complexo)
6. **Por último**: Testes E2E

