#!/usr/bin/env pwsh

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    NESIS.AI - CONFIGURACAO INICIAL" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$BackendPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Split-Path -Parent $BackendPath
Set-Location $BackendPath

Write-Host "1. Criando ambiente virtual..." -ForegroundColor Gray
if (-not (Test-Path ".venv")) {
    python -m venv .venv
    Write-Host "   Ambiente virtual criado" -ForegroundColor Green
} else {
    Write-Host "   Ambiente virtual ja existe" -ForegroundColor Yellow
}

Write-Host "2. Ativando ambiente virtual..." -ForegroundColor Gray
. ".venv\Scripts\Activate"

Write-Host "3. Instalando dependencias..." -ForegroundColor Gray
pip install --upgrade pip
pip install -r requirements.txt

Write-Host "4. Criando banco de dados..." -ForegroundColor Gray
python -c "import asyncio; from app.database import init_db; asyncio.run(init_db())" 2>$null

Write-Host "5. Aplicando migracoes..." -ForegroundColor Gray
alembic upgrade head 2>$null

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "CONFIGURACAO CONCLUIDA" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar o servidor, execute:" -ForegroundColor White
Write-Host "   .\scripts\start.ps1" -ForegroundColor Gray
Write-Host ""