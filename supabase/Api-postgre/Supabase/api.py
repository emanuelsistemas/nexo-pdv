from fastapi import FastAPI, HTTPException, Depends, Query, status
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import UUID4
import uvicorn

from schemas import (
    Product, ProductCreate, ProductUpdate,
    ProductGroup, ProductGroupCreate, ProductGroupUpdate,
    ProductUnit, ProductUnitCreate, ProductUnitUpdate,
    Company, CompanyCreate, CompanyUpdate,
    ProductStockMovement, ProductStockMovementCreate, ProductStockMovementUpdate
)
from repository import PostgresRepository

app = FastAPI(
    title="API PostgreSQL Supabase",
    description="API para comunicação direta com o PostgreSQL do Supabase",
    version="1.0.0",
)

# --- Repositórios ---
def get_product_repository():
    return PostgresRepository("products", Product)

def get_product_group_repository():
    return PostgresRepository("product_groups", ProductGroup)

def get_product_unit_repository():
    return PostgresRepository("product_units", ProductUnit)

def get_company_repository():
    return PostgresRepository("companies", Company)

def get_product_stock_movement_repository():
    return PostgresRepository("product_stock_movements", ProductStockMovement)

# --- Produtos ---
@app.get("/products/", response_model=List[Product])
def list_products(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    repository: PostgresRepository = Depends(get_product_repository)
):
    """
    Lista todos os produtos com suporte para paginação
    """
    return repository.list(limit=limit, offset=offset)

@app.get("/products/{product_id}", response_model=Product)
def get_product(
    product_id: UUID4,
    repository: PostgresRepository = Depends(get_product_repository)
):
    """
    Obtém um produto específico pelo ID
    """
    product = repository.get(str(product_id))
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product

@app.post("/products/", response_model=Product, status_code=status.HTTP_201_CREATED)
def create_product(
    product: ProductCreate,
    repository: PostgresRepository = Depends(get_product_repository)
):
    """
    Cria um novo produto
    """
    return repository.create(product.model_dump(exclude_unset=True))

@app.patch("/products/{product_id}", response_model=Product)
def update_product(
    product_id: UUID4,
    product: ProductUpdate,
    repository: PostgresRepository = Depends(get_product_repository)
):
    """
    Atualiza um produto existente
    """
    existing_product = repository.get(str(product_id))
    if not existing_product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    updated_product = repository.update(str(product_id), product.model_dump(exclude_unset=True))
    return updated_product

@app.delete("/products/{product_id}", response_model=Dict[str, Any])
def delete_product(
    product_id: UUID4,
    repository: PostgresRepository = Depends(get_product_repository)
):
    """
    Remove um produto
    """
    existing_product = repository.get(str(product_id))
    if not existing_product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    success = repository.delete(str(product_id))
    
    if not success:
        raise HTTPException(status_code=500, detail="Falha ao remover o produto")
    
    return {"success": True, "message": "Produto removido com sucesso"}

# --- Grupos de Produtos ---
@app.get("/product-groups/", response_model=List[ProductGroup])
def list_product_groups(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    repository: PostgresRepository = Depends(get_product_group_repository)
):
    """
    Lista todos os grupos de produtos com suporte para paginação
    """
    return repository.list(limit=limit, offset=offset)

@app.get("/product-groups/{group_id}", response_model=ProductGroup)
def get_product_group(
    group_id: UUID4,
    repository: PostgresRepository = Depends(get_product_group_repository)
):
    """
    Obtém um grupo de produtos específico pelo ID
    """
    group = repository.get(str(group_id))
    if not group:
        raise HTTPException(status_code=404, detail="Grupo de produtos não encontrado")
    return group

@app.post("/product-groups/", response_model=ProductGroup, status_code=status.HTTP_201_CREATED)
def create_product_group(
    group: ProductGroupCreate,
    repository: PostgresRepository = Depends(get_product_group_repository)
):
    """
    Cria um novo grupo de produtos
    """
    return repository.create(group.model_dump(exclude_unset=True))

@app.patch("/product-groups/{group_id}", response_model=ProductGroup)
def update_product_group(
    group_id: UUID4,
    group: ProductGroupUpdate,
    repository: PostgresRepository = Depends(get_product_group_repository)
):
    """
    Atualiza um grupo de produtos existente
    """
    existing_group = repository.get(str(group_id))
    if not existing_group:
        raise HTTPException(status_code=404, detail="Grupo de produtos não encontrado")
    
    updated_group = repository.update(str(group_id), group.model_dump(exclude_unset=True))
    return updated_group

@app.delete("/product-groups/{group_id}", response_model=Dict[str, Any])
def delete_product_group(
    group_id: UUID4,
    repository: PostgresRepository = Depends(get_product_group_repository)
):
    """
    Remove um grupo de produtos
    """
    existing_group = repository.get(str(group_id))
    if not existing_group:
        raise HTTPException(status_code=404, detail="Grupo de produtos não encontrado")
    
    success = repository.delete(str(group_id))
    
    if not success:
        raise HTTPException(status_code=500, detail="Falha ao remover o grupo de produtos")
    
    return {"success": True, "message": "Grupo de produtos removido com sucesso"}

# --- Unidades de Produtos ---
@app.get("/product-units/", response_model=List[ProductUnit])
def list_product_units(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    repository: PostgresRepository = Depends(get_product_unit_repository)
):
    """
    Lista todas as unidades de produtos com suporte para paginação
    """
    return repository.list(limit=limit, offset=offset)

@app.get("/product-units/{unit_id}", response_model=ProductUnit)
def get_product_unit(
    unit_id: UUID4,
    repository: PostgresRepository = Depends(get_product_unit_repository)
):
    """
    Obtém uma unidade de produto específica pelo ID
    """
    unit = repository.get(str(unit_id))
    if not unit:
        raise HTTPException(status_code=404, detail="Unidade de produto não encontrada")
    return unit

@app.post("/product-units/", response_model=ProductUnit, status_code=status.HTTP_201_CREATED)
def create_product_unit(
    unit: ProductUnitCreate,
    repository: PostgresRepository = Depends(get_product_unit_repository)
):
    """
    Cria uma nova unidade de produto
    """
    return repository.create(unit.model_dump(exclude_unset=True))

@app.patch("/product-units/{unit_id}", response_model=ProductUnit)
def update_product_unit(
    unit_id: UUID4,
    unit: ProductUnitUpdate,
    repository: PostgresRepository = Depends(get_product_unit_repository)
):
    """
    Atualiza uma unidade de produto existente
    """
    existing_unit = repository.get(str(unit_id))
    if not existing_unit:
        raise HTTPException(status_code=404, detail="Unidade de produto não encontrada")
    
    updated_unit = repository.update(str(unit_id), unit.model_dump(exclude_unset=True))
    return updated_unit

@app.delete("/product-units/{unit_id}", response_model=Dict[str, Any])
def delete_product_unit(
    unit_id: UUID4,
    repository: PostgresRepository = Depends(get_product_unit_repository)
):
    """
    Remove uma unidade de produto
    """
    existing_unit = repository.get(str(unit_id))
    if not existing_unit:
        raise HTTPException(status_code=404, detail="Unidade de produto não encontrada")
    
    success = repository.delete(str(unit_id))
    
    if not success:
        raise HTTPException(status_code=500, detail="Falha ao remover a unidade de produto")
    
    return {"success": True, "message": "Unidade de produto removida com sucesso"}

# --- Empresas ---
@app.get("/companies/", response_model=List[Company])
def list_companies(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    repository: PostgresRepository = Depends(get_company_repository)
):
    """
    Lista todas as empresas com suporte para paginação
    """
    return repository.list(limit=limit, offset=offset)

@app.get("/companies/{company_id}", response_model=Company)
def get_company(
    company_id: UUID4,
    repository: PostgresRepository = Depends(get_company_repository)
):
    """
    Obtém uma empresa específica pelo ID
    """
    company = repository.get(str(company_id))
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return company

@app.post("/companies/", response_model=Company, status_code=status.HTTP_201_CREATED)
def create_company(
    company: CompanyCreate,
    repository: PostgresRepository = Depends(get_company_repository)
):
    """
    Cria uma nova empresa
    """
    return repository.create(company.model_dump(exclude_unset=True))

@app.patch("/companies/{company_id}", response_model=Company)
def update_company(
    company_id: UUID4,
    company: CompanyUpdate,
    repository: PostgresRepository = Depends(get_company_repository)
):
    """
    Atualiza uma empresa existente
    """
    existing_company = repository.get(str(company_id))
    if not existing_company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    updated_company = repository.update(str(company_id), company.model_dump(exclude_unset=True))
    return updated_company

@app.delete("/companies/{company_id}", response_model=Dict[str, Any])
def delete_company(
    company_id: UUID4,
    repository: PostgresRepository = Depends(get_company_repository)
):
    """
    Remove uma empresa
    """
    existing_company = repository.get(str(company_id))
    if not existing_company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    success = repository.delete(str(company_id))
    
    if not success:
        raise HTTPException(status_code=500, detail="Falha ao remover a empresa")
    
    return {"success": True, "message": "Empresa removida com sucesso"}

# --- Movimentos de Estoque ---
@app.get("/stock-movements/", response_model=List[ProductStockMovement])
def list_stock_movements(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    repository: PostgresRepository = Depends(get_product_stock_movement_repository)
):
    """
    Lista todos os movimentos de estoque com suporte para paginação
    """
    return repository.list(limit=limit, offset=offset)

@app.get("/stock-movements/{movement_id}", response_model=ProductStockMovement)
def get_stock_movement(
    movement_id: UUID4,
    repository: PostgresRepository = Depends(get_product_stock_movement_repository)
):
    """
    Obtém um movimento de estoque específico pelo ID
    """
    movement = repository.get(str(movement_id))
    if not movement:
        raise HTTPException(status_code=404, detail="Movimento de estoque não encontrado")
    return movement

@app.post("/stock-movements/", response_model=ProductStockMovement, status_code=status.HTTP_201_CREATED)
def create_stock_movement(
    movement: ProductStockMovementCreate,
    repository: PostgresRepository = Depends(get_product_stock_movement_repository)
):
    """
    Cria um novo movimento de estoque
    """
    return repository.create(movement.model_dump(exclude_unset=True))

@app.patch("/stock-movements/{movement_id}", response_model=ProductStockMovement)
def update_stock_movement(
    movement_id: UUID4,
    movement: ProductStockMovementUpdate,
    repository: PostgresRepository = Depends(get_product_stock_movement_repository)
):
    """
    Atualiza um movimento de estoque existente
    """
    existing_movement = repository.get(str(movement_id))
    if not existing_movement:
        raise HTTPException(status_code=404, detail="Movimento de estoque não encontrado")
    
    updated_movement = repository.update(str(movement_id), movement.model_dump(exclude_unset=True))
    return updated_movement

@app.delete("/stock-movements/{movement_id}", response_model=Dict[str, Any])
def delete_stock_movement(
    movement_id: UUID4,
    repository: PostgresRepository = Depends(get_product_stock_movement_repository)
):
    """
    Remove um movimento de estoque
    """
    existing_movement = repository.get(str(movement_id))
    if not existing_movement:
        raise HTTPException(status_code=404, detail="Movimento de estoque não encontrado")
    
    success = repository.delete(str(movement_id))
    
    if not success:
        raise HTTPException(status_code=500, detail="Falha ao remover o movimento de estoque")
    
    return {"success": True, "message": "Movimento de estoque removido com sucesso"}

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=False)
