#!/usr/bin/env python3
from fastapi import FastAPI, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from delete_company import delete_company
import os

app = FastAPI(title="Nexo PDV - API de Exclusão de Empresas")

# Configurar CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, restrinja aos domínios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DeleteResponse(BaseModel):
    status: str
    message: str
    details: str = None

@app.get("/")
async def root():
    return {"message": "API de Exclusão de Empresas do Nexo PDV"}

@app.delete("/companies/{company_id}", response_model=DeleteResponse)
async def delete_company_endpoint(
    company_id: str = Path(..., title="ID da empresa a ser excluída")
):
    result = delete_company(company_id)
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    
    return result

# Porta onde a API estará disponível
PORT = int(os.getenv("PORT", 5050))

if __name__ == "__main__":
    print(f"Iniciando API de exclusão de empresas na porta {PORT}")
    uvicorn.run("delete_company_api:app", host="0.0.0.0", port=PORT, reload=True)
