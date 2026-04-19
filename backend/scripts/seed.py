"""Cria o usuário admin padrão para desenvolvimento.

Uso:
    python -m scripts.seed
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from app.auth.utils import hash_password
from app.database import SessionLocal, init_db
from app.users.models import User

logger = logging.getLogger("seed")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

ADMIN_EMAIL = "admin@prontuario.dev"
ADMIN_PASSWORD = "Admin@1234"
ADMIN_NAME = "Administrador"


async def main() -> None:
    await init_db()
    async with SessionLocal() as session:
        existing = (
            await session.execute(select(User).where(User.email == ADMIN_EMAIL))
        ).scalar_one_or_none()
        if existing is not None:
            logger.info("Admin já existe: %s", ADMIN_EMAIL)
            return

        admin = User(
            email=ADMIN_EMAIL,
            full_name=ADMIN_NAME,
            role="admin",
            hashed_password=hash_password(ADMIN_PASSWORD),
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        logger.info("Admin criado: %s (senha: %s)", ADMIN_EMAIL, ADMIN_PASSWORD)


if __name__ == "__main__":
    asyncio.run(main())
