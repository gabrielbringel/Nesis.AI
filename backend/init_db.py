import asyncio
from app.database import engine, Base
# Importamos os modelos para o SQLAlchemy saber quais tabelas criar
from app.patients.models import Patient
from app.prescriptions.models import Prescription, Alert

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tabelas criadas com sucesso no banco de dados!")

if __name__ == "__main__":
    asyncio.run(create_tables())