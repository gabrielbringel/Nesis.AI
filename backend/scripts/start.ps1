#!/usr/bin/env pwsh

param(
    [string]$ServerHost = "0.0.0.0",
    [int]$ServerPort = 8000
)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    NESIS.AI - BACKEND" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$BackendPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Split-Path -Parent $BackendPath
Set-Location $BackendPath
Write-Host "Diretorio: $BackendPath" -ForegroundColor Gray

if (Test-Path ".venv\Scripts\Activate") {
    Write-Host "Ativando ambiente virtual..." -ForegroundColor Gray
    . ".venv\Scripts\Activate"
} else {
    Write-Host "Ambiente virtual nao encontrado. Criando..." -ForegroundColor Yellow
    python -m venv .venv
    . ".venv\Scripts\Activate"
    pip install --upgrade pip
    pip install -r requirements.txt
}

if (-not (Test-Path "nesis.db")) {
    Write-Host "Criando banco de dados..." -ForegroundColor Gray
    python -c "import asyncio; from app.database import init_db; asyncio.run(init_db())" 2>$null
    Write-Host "   Banco criado" -ForegroundColor Green
}

Write-Host "Aplicando migracoes..." -ForegroundColor Gray
alembic upgrade head 2>$null

Write-Host ""
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "INICIANDO SERVIDOR" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "Host: $ServerHost" -ForegroundColor Gray
Write-Host "Porta: $ServerPort" -ForegroundColor Gray
Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "Documentacao: http://localhost:$ServerPort/docs" -ForegroundColor White
Write-Host "Health check: http://localhost:$ServerPort/health" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

uvicorn app.main:app --reload --host $ServerHost --port $ServerPort