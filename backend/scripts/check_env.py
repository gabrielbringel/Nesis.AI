#!/usr/bin/env python3
"""Verificador de ambiente - valida dependencias e banco de dados."""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

def check_environment():
    """Verifica as configuracoes do ambiente."""
    
    print("\n" + "="*50)
    print("VERIFICADOR DE AMBIENTE - NESIS.AI")
    print("="*50 + "\n")
    
    issues = []
    
    backend_path = Path(__file__).parent.parent
    os.chdir(backend_path)
    
    db_path = Path("nesis.db")
    if db_path.exists():
        size = db_path.stat().st_size
        print(f"Banco de dados: OK ({size} bytes)")
    else:
        issues.append("Banco de dados nao encontrado. Execute: python -c 'from app.database import init_db; import asyncio; asyncio.run(init_db())'")
    
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        print("Dependencias Python: OK")
    except ImportError as e:
        issues.append(f"Dependencia faltando: {e}")
    
    print("\n" + "="*50)
    print("RESUMO")
    print("="*50)
    
    if issues:
        print(f"\nERROS ({len(issues)}):")
        for issue in issues:
            print(f"   - {issue}")
        print("\nCorrija os erros acima e execute novamente.")
    else:
        print("\nAmbiente OK. Execute .\\scripts\\start.ps1 para iniciar o servidor.")
    
    print("")
    return len(issues) == 0

if __name__ == "__main__":
    sys.exit(0 if check_environment() else 1)