#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Diagnostico rapido do sistema.
#>

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "    NESIS.AI - DIAGNOSTICO COMPLETO" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""

try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -ErrorAction Stop
    Write-Host "BACKEND: Rodando (versao $($health.version))" -ForegroundColor Green
} catch {
    Write-Host "BACKEND: Nao esta rodando" -ForegroundColor Red
    Write-Host "   Execute: .\scripts\start.ps1" -ForegroundColor Gray
}

try {
    $swagger = Invoke-WebRequest -Uri "http://localhost:8000/docs" -ErrorAction Stop
    Write-Host "DOCS: Disponível em http://localhost:8000/docs" -ForegroundColor Green
} catch {
    Write-Host "DOCS: Nao acessivel" -ForegroundColor Red
}

$testBody = '{"paciente": {"nome": "Diagnostico", "idade": 40}, "medicacoes": [{"nome": "Paracetamol", "dose": "500mg", "frequencia": "6/6h", "via": "oral"}]}'
try {
    $result = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/analyze" -Method POST -ContentType "application/json" -Body $testBody -ErrorAction Stop
    $alertCount = $result.alertas.Count
    Write-Host "API ANALYZE: Respondendo ($alertCount alertas retornados)" -ForegroundColor Green
    
    $firstDesc = $result.alertas[0].descricao
    if ($firstDesc -like "*Dipirona*") {
        Write-Host "   Modo FALLBACK ativo (alertas fixos)" -ForegroundColor Yellow
    } else {
        Write-Host "   Modo RAG ativo (alertas dinâmicos)" -ForegroundColor Green
    }
} catch {
    Write-Host "API ANALYZE: Falhou" -ForegroundColor Red
}

Write-Host ""