"""Configuração compartilhada dos testes.

- Garante que o pacote `motor` seja importável ao rodar `pytest` a partir de
  qualquer diretório.
- Força o NER em modo fallback (sem tentar baixar BioBERTpt em CI).
- Bloqueia o RxNorm client para que os testes sejam determinísticos e não
  dependam de rede; a base ANVISA local cobre os fármacos usados nos cenários.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

os.environ.setdefault("USE_GPU", "false")


@pytest.fixture(autouse=True)
def _isolate_network(monkeypatch):
    """Neutraliza clients externos em todos os testes."""
    from motor.normalizer import pubchem_client, rxnorm_client

    monkeypatch.setattr(
        rxnorm_client.RxNormClient, "search", lambda self, name: None
    )
    monkeypatch.setattr(
        pubchem_client.PubChemClient, "search", lambda self, name: None
    )
