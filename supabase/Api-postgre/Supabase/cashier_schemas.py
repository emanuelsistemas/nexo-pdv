from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

# Modelos base
class BaseSchema(BaseModel):
    """Modelo base para todos os schemas"""
    class Config:
        from_attributes = True

# Modelos para PdvCashier
class PdvCashierBase(BaseSchema):
    user_id: UUID
    company_id: UUID
    initial_amount: Decimal
    status: str  # 'open' ou 'closed'
    opened_at: datetime
    final_amount: Optional[Decimal] = None
    closed_at: Optional[datetime] = None

class PdvCashierCreate(PdvCashierBase):
    """Modelo para criação de registros de caixa"""
    pass

class PdvCashierUpdate(BaseSchema):
    """Modelo para atualização de registros de caixa"""
    final_amount: Optional[Decimal] = None
    status: Optional[str] = None
    closed_at: Optional[datetime] = None

class PdvCashier(PdvCashierBase):
    """Modelo para registros de caixa"""
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Modelos para PdvCashierMovement (Suprimentos e Sangrias)
class PdvCashierMovementBase(BaseSchema):
    cashier_id: UUID
    user_id: UUID
    company_id: UUID
    amount: Decimal
    type: str  # 'suprimento' ou 'sangria'
    description: Optional[str] = None
    timestamp: datetime

class PdvCashierMovementCreate(PdvCashierMovementBase):
    """Modelo para criação de movimentos de caixa"""
    pass

class PdvCashierMovementUpdate(BaseSchema):
    """Modelo para atualização de movimentos de caixa"""
    amount: Optional[Decimal] = None
    description: Optional[str] = None

class PdvCashierMovement(PdvCashierMovementBase):
    """Modelo para movimentos de caixa"""
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
