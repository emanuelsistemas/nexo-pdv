from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from decimal import Decimal

# Modelos base
class BaseSchema(BaseModel):
    """Modelo base para todos os schemas"""
    class Config:
        from_attributes = True

# Modelos para Company
class CompanyBase(BaseSchema):
    segment: str
    document_type: str
    document_number: str
    legal_name: str
    trade_name: str
    tax_regime: str
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    state_registration: Optional[str] = None

class CompanyCreate(CompanyBase):
    """Modelo para criação de empresas"""
    pass

class CompanyUpdate(BaseSchema):
    """Modelo para atualização de empresas"""
    segment: Optional[str] = None
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    tax_regime: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    state_registration: Optional[str] = None

class Company(CompanyBase):
    """Modelo para empresas"""
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Modelos para ProductGroup
class ProductGroupBase(BaseSchema):
    company_id: UUID
    name: str
    description: Optional[str] = None

class ProductGroupCreate(ProductGroupBase):
    """Modelo para criação de grupos de produtos"""
    pass

class ProductGroupUpdate(BaseSchema):
    """Modelo para atualização de grupos de produtos"""
    name: Optional[str] = None
    description: Optional[str] = None

class ProductGroup(ProductGroupBase):
    """Modelo para grupos de produtos"""
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Modelos para ProductUnit
class ProductUnitBase(BaseSchema):
    company_id: UUID
    code: str
    name: str
    description: Optional[str] = None

class ProductUnitCreate(ProductUnitBase):
    """Modelo para criação de unidades de produtos"""
    pass

class ProductUnitUpdate(BaseSchema):
    """Modelo para atualização de unidades de produtos"""
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None

class ProductUnit(ProductUnitBase):
    """Modelo para unidades de produtos"""
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Modelos para Product
class ProductBase(BaseSchema):
    company_id: UUID
    code: str
    name: str
    cost_price: Decimal
    profit_margin: Decimal
    selling_price: Decimal
    cst: str
    pis: str
    cofins: str
    ncm: str
    cfop: str
    status: str
    barcode: Optional[str] = None
    stock: Optional[Decimal] = None
    group_id: Optional[UUID] = None
    unit_id: Optional[UUID] = None

class ProductCreate(ProductBase):
    """Modelo para criação de produtos"""
    pass

class ProductUpdate(BaseSchema):
    """Modelo para atualização de produtos"""
    code: Optional[str] = None
    name: Optional[str] = None
    cost_price: Optional[Decimal] = None
    profit_margin: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    cst: Optional[str] = None
    pis: Optional[str] = None
    cofins: Optional[str] = None
    ncm: Optional[str] = None
    cfop: Optional[str] = None
    status: Optional[str] = None
    barcode: Optional[str] = None
    stock: Optional[Decimal] = None
    group_id: Optional[UUID] = None
    unit_id: Optional[UUID] = None

class Product(ProductBase):
    """Modelo para produtos"""
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Modelos para ProductStockMovement
class ProductStockMovementBase(BaseSchema):
    product_id: UUID
    company_id: UUID
    type: str
    quantity: Decimal
    date: datetime
    observation: Optional[str] = None
    created_by: UUID

class ProductStockMovementCreate(ProductStockMovementBase):
    """Modelo para criação de movimento de estoque"""
    pass

class ProductStockMovementUpdate(BaseSchema):
    """Modelo para atualização de movimento de estoque"""
    quantity: Optional[Decimal] = None
    type: Optional[str] = None
    observation: Optional[str] = None

class ProductStockMovement(ProductStockMovementBase):
    """Modelo para movimento de estoque"""
    id: UUID
    created_at: Optional[datetime] = None

# Modelos para Profile
class ProfileBase(BaseSchema):
    name: str
    company_id: Optional[UUID] = None
    status_cad_empresa: str

class ProfileCreate(ProfileBase):
    """Modelo para criação de perfil"""
    pass

class ProfileUpdate(BaseSchema):
    """Modelo para atualização de perfil"""
    name: Optional[str] = None
    company_id: Optional[UUID] = None
    status_cad_empresa: Optional[str] = None

class Profile(ProfileBase):
    """Modelo para perfil"""
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Modelos para SystemUnit
class SystemUnitBase(BaseSchema):
    code: str
    name: str
    description: str

class SystemUnitCreate(SystemUnitBase):
    """Modelo para criação de unidades do sistema"""
    pass

class SystemUnitUpdate(BaseSchema):
    """Modelo para atualização de unidades do sistema"""
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None

class SystemUnit(SystemUnitBase):
    """Modelo para unidades do sistema"""
    id: UUID
    created_at: Optional[datetime] = None
