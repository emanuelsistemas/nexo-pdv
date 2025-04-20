from typing import List, Dict, Any, Optional, TypeVar, Generic, Type
from uuid import UUID
from config import get_db_connection
from psycopg2.extras import RealDictCursor
import json

T = TypeVar('T')

class PostgresRepository(Generic[T]):
    """
    Classe genérica de repositório para operações com PostgreSQL
    """
    def __init__(self, table_name: str, model_class: Type[T]):
        """
        Inicializa o repositório
        
        Args:
            table_name: Nome da tabela no banco de dados
            model_class: Classe do modelo Pydantic
        """
        self.table_name = table_name
        self.model_class = model_class
    
    def list(self, filters: Dict[str, Any] = None, limit: int = 100, offset: int = 0) -> List[T]:
        """
        Lista registros da tabela
        
        Args:
            filters: Filtros a serem aplicados
            limit: Limite de registros
            offset: Offset para paginação
            
        Returns:
            Lista de registros
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Constrói a consulta SQL
            query = f"SELECT * FROM {self.table_name}"
            params = []
            
            # Adiciona filtros se fornecidos
            if filters:
                filter_conditions = []
                for key, value in filters.items():
                    filter_conditions.append(f"{key} = %s")
                    params.append(value)
                
                if filter_conditions:
                    query += " WHERE " + " AND ".join(filter_conditions)
            
            # Adiciona paginação
            query += f" LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            # Executa a consulta
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            # Converte para dicionários
            result = []
            for row in rows:
                # RealDictCursor já retorna um dicionário
                result.append(self.model_class(**row))
            
            return result
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def get(self, id: str) -> Optional[T]:
        """
        Obtém um registro pelo ID
        
        Args:
            id: ID do registro
            
        Returns:
            Registro encontrado ou None
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            query = f"SELECT * FROM {self.table_name} WHERE id = %s"
            cursor.execute(query, [id])
            row = cursor.fetchone()
            
            if not row:
                return None
            
            # RealDictCursor já retorna um dicionário
            return self.model_class(**row)
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def create(self, data: Dict[str, Any]) -> T:
        """
        Cria um novo registro
        
        Args:
            data: Dados do registro
            
        Returns:
            Registro criado
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Remove campos None
            clean_data = {k: v for k, v in data.items() if v is not None}
            
            # Constrói a consulta SQL
            columns = ", ".join(clean_data.keys())
            placeholders = ", ".join(["%s"] * len(clean_data))
            values = list(clean_data.values())
            
            query = f"INSERT INTO {self.table_name} ({columns}) VALUES ({placeholders}) RETURNING *"
            cursor.execute(query, values)
            row = cursor.fetchone()
            
            conn.commit()
            
            # RealDictCursor já retorna um dicionário
            return self.model_class(**row)
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def update(self, id: str, data: Dict[str, Any]) -> Optional[T]:
        """
        Atualiza um registro
        
        Args:
            id: ID do registro
            data: Dados a serem atualizados
            
        Returns:
            Registro atualizado ou None
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Remove campos None
            clean_data = {k: v for k, v in data.items() if v is not None}
            
            if not clean_data:
                # Nada para atualizar
                return self.get(id)
            
            # Constrói a consulta SQL
            set_clause = ", ".join([f"{key} = %s" for key in clean_data.keys()])
            values = list(clean_data.values())
            values.append(id)  # Para o WHERE id = %s
            
            query = f"UPDATE {self.table_name} SET {set_clause} WHERE id = %s RETURNING *"
            cursor.execute(query, values)
            row = cursor.fetchone()
            
            if not row:
                conn.rollback()
                return None
            
            conn.commit()
            
            # RealDictCursor já retorna um dicionário
            return self.model_class(**row)
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def delete(self, id: str) -> bool:
        """
        Remove um registro
        
        Args:
            id: ID do registro
            
        Returns:
            True se removido com sucesso
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            query = f"DELETE FROM {self.table_name} WHERE id = %s RETURNING id"
            cursor.execute(query, [id])
            row = cursor.fetchone()
            
            if not row:
                conn.rollback()
                return False
            
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
    
    def count(self, filters: Dict[str, Any] = None) -> int:
        """
        Conta o número de registros
        
        Args:
            filters: Filtros a serem aplicados
            
        Returns:
            Número de registros
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Constrói a consulta SQL
            query = f"SELECT COUNT(*) FROM {self.table_name}"
            params = []
            
            # Adiciona filtros se fornecidos
            if filters:
                filter_conditions = []
                for key, value in filters.items():
                    filter_conditions.append(f"{key} = %s")
                    params.append(value)
                
                if filter_conditions:
                    query += " WHERE " + " AND ".join(filter_conditions)
            
            # Executa a consulta
            cursor.execute(query, params)
            count = cursor.fetchone()
            
            return count['count']
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()
