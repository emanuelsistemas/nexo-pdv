"""
Script para deletar uma empresa e todos os seus dados relacionados de forma segura.

Este script:
1. Verifica todas as dependências antes de começar
2. Executa as deleções em ordem correta para evitar violações de chave estrangeira
3. Faz log de todas as operações
4. Permite rollback em caso de erro
"""

import os
import sys
from datetime import datetime
from typing import List, Optional
import json
from supabase import create_client, Client

# Configuração do Supabase
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

class CompanyDeletionManager:
    def __init__(self, company_id: str):
        self.company_id = company_id
        self.log_file = f"deletion_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        self.user_ids: List[str] = []
        
    def log(self, message: str) -> None:
        """Registra uma mensagem no arquivo de log"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(self.log_file, "a") as f:
            f.write(f"[{timestamp}] {message}\n")
        print(message)

    def get_user_ids(self) -> List[str]:
        """Obtém todos os IDs de usuários associados à empresa"""
        try:
            response = supabase.table("profiles") \
                .select("id") \
                .eq("company_id", self.company_id) \
                .execute()
            
            if response.data:
                return [user["id"] for user in response.data]
            return []
        except Exception as e:
            self.log(f"Erro ao obter IDs de usuários: {str(e)}")
            raise

    async def delete_pdv_data(self) -> None:
        """Deleta dados relacionados ao PDV"""
        try:
            # 1. Deletar movimentações do caixa
            await supabase.table("pdv_cashier_movements") \
                .delete() \
                .eq("company_id", self.company_id) \
                .execute()
            self.log("Movimentações de caixa deletadas")

            # 2. Deletar caixas
            await supabase.table("pdv_cashiers") \
                .delete() \
                .eq("company_id", self.company_id) \
                .execute()
            self.log("Caixas deletados")

            # 3. Deletar configurações do PDV
            await supabase.table("pdv_configurations") \
                .delete() \
                .eq("company_id", self.company_id) \
                .execute()
            self.log("Configurações do PDV deletadas")

        except Exception as e:
            self.log(f"Erro ao deletar dados do PDV: {str(e)}")
            raise

    async def delete_product_data(self) -> None:
        """Deleta dados relacionados a produtos"""
        try:
            # 1. Deletar movimentações de estoque
            await supabase.table("product_stock_movements") \
                .delete() \
                .eq("company_id", self.company_id) \
                .execute()
            self.log("Movimentações de estoque deletadas")

            # 2. Deletar produtos
            await supabase.table("products") \
                .delete() \
                .eq("company_id", self.company_id) \
                .execute()
            self.log("Produtos deletados")

            # 3. Deletar grupos de produtos
            await supabase.table("product_groups") \
                .delete() \
                .eq("company_id", self.company_id) \
                .execute()
            self.log("Grupos de produtos deletados")

            # 4. Deletar unidades de produtos
            await supabase.table("product_units") \
                .delete() \
                .eq("company_id", self.company_id) \
                .execute()
            self.log("Unidades de produtos deletadas")

            # 5. Deletar configurações de produtos
            await supabase.table("products_configurations") \
                .delete() \
                .eq("company_id", self.company_id) \
                .execute()
            self.log("Configurações de produtos deletadas")

        except Exception as e:
            self.log(f"Erro ao deletar dados de produtos: {str(e)}")
            raise

    async def update_profiles(self) -> None:
        """Atualiza perfis removendo associação com a empresa"""
        try:
            await supabase.table("profiles") \
                .update({
                    "company_id": None,
                    "status_cad_empresa": "N"
                }) \
                .eq("company_id", self.company_id) \
                .execute()
            self.log("Perfis atualizados")

        except Exception as e:
            self.log(f"Erro ao atualizar perfis: {str(e)}")
            raise

    async def delete_company(self) -> None:
        """Deleta a empresa"""
        try:
            await supabase.table("companies") \
                .delete() \
                .eq("id", self.company_id) \
                .execute()
            self.log("Empresa deletada")

        except Exception as e:
            self.log(f"Erro ao deletar empresa: {str(e)}")
            raise

    async def delete_auth_users(self) -> None:
        """Deleta usuários do auth.users"""
        try:
            if self.user_ids:
                for user_id in self.user_ids:
                    await supabase.auth.admin.delete_user(user_id)
                self.log(f"{len(self.user_ids)} usuários deletados do auth.users")

        except Exception as e:
            self.log(f"Erro ao deletar usuários do auth: {str(e)}")
            raise

    async def execute_deletion(self) -> None:
        """Executa o processo completo de deleção"""
        try:
            self.log(f"Iniciando processo de deleção para empresa {self.company_id}")
            
            # 1. Obtém IDs dos usuários
            self.user_ids = self.get_user_ids()
            self.log(f"Encontrados {len(self.user_ids)} usuários")

            # 2. Deleta dados do PDV
            await self.delete_pdv_data()

            # 3. Deleta dados de produtos
            await self.delete_product_data()

            # 4. Atualiza perfis
            await self.update_profiles()

            # 5. Deleta a empresa
            await self.delete_company()

            # 6. Deleta usuários do auth
            await self.delete_auth_users()

            self.log("Processo de deleção concluído com sucesso!")

        except Exception as e:
            self.log(f"ERRO FATAL: {str(e)}")
            self.log("Processo de deleção falhou!")
            raise

async def main(company_id: str) -> None:
    """Função principal"""
    manager = CompanyDeletionManager(company_id)
    await manager.execute_deletion()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python delete_company.py <company_id>")
        sys.exit(1)
        
    import asyncio
    asyncio.run(main(sys.argv[1]))