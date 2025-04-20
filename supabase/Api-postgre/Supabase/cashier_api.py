from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import UUID4
from fastapi import FastAPI, Query, Depends, HTTPException, Path
from datetime import datetime
from decimal import Decimal

from cashier_schemas import (
    PdvCashier, PdvCashierCreate, PdvCashierUpdate,
    PdvCashierMovement, PdvCashierMovementCreate, PdvCashierMovementUpdate
)
from repository import PostgresRepository
from config import get_db_connection

# --- Repositórios ---
def get_pdv_cashier_repository():
    return PostgresRepository("pdv_cashiers", PdvCashier)

def get_pdv_cashier_movement_repository():
    return PostgresRepository("pdv_cashier_movements", PdvCashierMovement)

def register_cashier_endpoints(app: FastAPI):
    """
    Registra os endpoints de controle de caixa na aplicação FastAPI
    """
    
    # --- Endpoints de Caixa (Abertura e Fechamento) ---
    @app.get("/pdv-cashiers/", response_model=List[PdvCashier])
    def list_cashiers(
        user_id: Optional[UUID] = None,
        company_id: Optional[UUID] = None,
        status: Optional[str] = None,
        limit: int = Query(100, ge=1, le=1000),
        offset: int = Query(0, ge=0),
        repository: PostgresRepository = Depends(get_pdv_cashier_repository)
    ):
        """
        Lista todos os registros de caixa com suporte para filtros e paginação
        """
        filters = {}
        if user_id:
            filters["user_id"] = user_id
        if company_id:
            filters["company_id"] = company_id
        if status:
            filters["status"] = status
            
        return repository.list(filters=filters, limit=limit, offset=offset)

    @app.get("/pdv-cashiers/{cashier_id}", response_model=PdvCashier)
    def get_cashier(
        cashier_id: UUID = Path(..., description="ID do registro de caixa"),
        repository: PostgresRepository = Depends(get_pdv_cashier_repository)
    ):
        """
        Obtém um registro de caixa específico pelo ID
        """
        cashier = repository.get(cashier_id)
        if not cashier:
            raise HTTPException(status_code=404, detail="Registro de caixa não encontrado")
        return cashier

    @app.post("/pdv-cashiers/", response_model=PdvCashier)
    def create_cashier(
        cashier: PdvCashierCreate,
        repository: PostgresRepository = Depends(get_pdv_cashier_repository)
    ):
        """
        Cria um novo registro de caixa (abertura)
        """
        # Verificar se já existe um caixa aberto para este usuário
        existing_open_cashier = repository.list(
            filters={"user_id": cashier.user_id, "status": "open"},
            limit=1
        )
        
        if existing_open_cashier:
            raise HTTPException(
                status_code=400, 
                detail="Já existe um caixa aberto para este usuário. Feche o caixa atual antes de abrir um novo."
            )
            
        return repository.create(cashier.dict())

    @app.patch("/pdv-cashiers/{cashier_id}", response_model=PdvCashier)
    def update_cashier(
        cashier_id: UUID,
        cashier_update: PdvCashierUpdate,
        repository: PostgresRepository = Depends(get_pdv_cashier_repository)
    ):
        """
        Atualiza um registro de caixa (fechamento)
        """
        existing_cashier = repository.get(cashier_id)
        if not existing_cashier:
            raise HTTPException(status_code=404, detail="Registro de caixa não encontrado")
            
        # Se estiver fechando o caixa, garantir que o status estava aberto
        if cashier_update.status == "closed" and existing_cashier.status != "open":
            raise HTTPException(status_code=400, detail="Só é possível fechar um caixa que esteja aberto")
            
        return repository.update(cashier_id, cashier_update.dict(exclude_unset=True))

    # --- Endpoints de Movimentações de Caixa (Suprimentos e Sangrias) ---
    @app.get("/pdv-cashier-movements/", response_model=List[PdvCashierMovement])
    def list_cashier_movements(
        cashier_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        company_id: Optional[UUID] = None,
        type: Optional[str] = None,
        limit: int = Query(100, ge=1, le=1000),
        offset: int = Query(0, ge=0),
        repository: PostgresRepository = Depends(get_pdv_cashier_movement_repository)
    ):
        """
        Lista todas as movimentações de caixa com suporte para filtros e paginação
        """
        filters = {}
        if cashier_id:
            filters["cashier_id"] = cashier_id
        if user_id:
            filters["user_id"] = user_id
        if company_id:
            filters["company_id"] = company_id
        if type:
            filters["type"] = type
            
        return repository.list(filters=filters, limit=limit, offset=offset)

    @app.get("/pdv-cashier-movements/{movement_id}", response_model=PdvCashierMovement)
    def get_cashier_movement(
        movement_id: UUID = Path(..., description="ID da movimentação de caixa"),
        repository: PostgresRepository = Depends(get_pdv_cashier_movement_repository)
    ):
        """
        Obtém uma movimentação de caixa específica pelo ID
        """
        movement = repository.get(movement_id)
        if not movement:
            raise HTTPException(status_code=404, detail="Movimentação de caixa não encontrada")
        return movement

    @app.post("/pdv-cashier-movements/", response_model=PdvCashierMovement)
    def create_cashier_movement(
        movement: PdvCashierMovementCreate,
        repository: PostgresRepository = Depends(get_pdv_cashier_movement_repository),
        cashier_repository: PostgresRepository = Depends(get_pdv_cashier_repository)
    ):
        """
        Cria uma nova movimentação de caixa (suprimento ou sangria)
        """
        # Verificar se o caixa existe e está aberto
        cashier = cashier_repository.get(movement.cashier_id)
        if not cashier:
            raise HTTPException(status_code=404, detail="Caixa não encontrado")
            
        if cashier.status != "open":
            raise HTTPException(status_code=400, detail="Só é possível realizar movimentações em um caixa aberto")
            
        # Validar a movimentação
        if movement.type not in ["suprimento", "sangria"]:
            raise HTTPException(status_code=400, detail="Tipo de movimentação inválido. Use 'suprimento' ou 'sangria'")
            
        # Para sangria, garantir que o valor é negativo
        if movement.type == "sangria" and movement.amount > 0:
            movement.amount = -movement.amount
            
        # Para suprimento, garantir que o valor é positivo
        if movement.type == "suprimento" and movement.amount < 0:
            movement.amount = abs(movement.amount)
            
        return repository.create(movement.dict())

    @app.patch("/pdv-cashier-movements/{movement_id}", response_model=PdvCashierMovement)
    def update_cashier_movement(
        movement_id: UUID,
        movement_update: PdvCashierMovementUpdate,
        repository: PostgresRepository = Depends(get_pdv_cashier_movement_repository)
    ):
        """
        Atualiza uma movimentação de caixa
        """
        existing_movement = repository.get(movement_id)
        if not existing_movement:
            raise HTTPException(status_code=404, detail="Movimentação de caixa não encontrada")
            
        return repository.update(movement_id, movement_update.dict(exclude_unset=True))
