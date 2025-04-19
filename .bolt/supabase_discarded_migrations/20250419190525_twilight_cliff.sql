/*
  # Atualizar estrutura de opening_hours para formato de objeto

  1. Alterações
    - Atualizar a estrutura padrão de opening_hours para usar formato de objeto
    - Converter dados existentes para o novo formato
    - Garantir compatibilidade com o frontend

  2. Notas
    - O novo formato usa chaves de dias da semana (monday, tuesday, etc.)
    - Cada dia tem propriedades active, open e close
    - Facilita o acesso e manipulação no frontend
*/

-- Atualizar o valor padrão da coluna opening_hours
ALTER TABLE resellers 
ALTER COLUMN opening_hours SET DEFAULT '{
  "monday": {"active": true, "open": "08:00", "close": "18:00"},
  "tuesday": {"active": true, "open": "08:00", "close": "18:00"},
  "wednesday": {"active": true, "open": "08:00", "close": "18:00"},
  "thursday": {"active": true, "open": "08:00", "close": "18:00"},
  "friday": {"active": true, "open": "08:00", "close": "18:00"},
  "saturday": {"active": false, "open": "08:00", "close": "13:00"},
  "sunday": {"active": false, "open": "00:00", "close": "00:00"}
}'::jsonb;

-- Converter dados existentes para o novo formato
DO $$
DECLARE
    r RECORD;
    new_opening_hours JSONB;
BEGIN
    FOR r IN SELECT id, opening_hours FROM resellers WHERE opening_hours IS NOT NULL
    LOOP
        -- Verificar se opening_hours é um array (formato antigo)
        IF jsonb_typeof(r.opening_hours) = 'array' THEN
            -- Criar novo objeto com o formato correto
            new_opening_hours := jsonb_build_object(
                'monday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->0->>'active')::boolean, true),
                    'open', COALESCE(r.opening_hours->0->>'open', '08:00'),
                    'close', COALESCE(r.opening_hours->0->>'close', '18:00')
                ),
                'tuesday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->1->>'active')::boolean, true),
                    'open', COALESCE(r.opening_hours->1->>'open', '08:00'),
                    'close', COALESCE(r.opening_hours->1->>'close', '18:00')
                ),
                'wednesday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->2->>'active')::boolean, true),
                    'open', COALESCE(r.opening_hours->2->>'open', '08:00'),
                    'close', COALESCE(r.opening_hours->2->>'close', '18:00')
                ),
                'thursday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->3->>'active')::boolean, true),
                    'open', COALESCE(r.opening_hours->3->>'open', '08:00'),
                    'close', COALESCE(r.opening_hours->3->>'close', '18:00')
                ),
                'friday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->4->>'active')::boolean, true),
                    'open', COALESCE(r.opening_hours->4->>'open', '08:00'),
                    'close', COALESCE(r.opening_hours->4->>'close', '18:00')
                ),
                'saturday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->5->>'active')::boolean, false),
                    'open', COALESCE(r.opening_hours->5->>'open', '08:00'),
                    'close', COALESCE(r.opening_hours->5->>'close', '13:00')
                ),
                'sunday', jsonb_build_object(
                    'active', COALESCE((r.opening_hours->6->>'active')::boolean, false),
                    'open', COALESCE(r.opening_hours->6->>'open', '00:00'),
                    'close', COALESCE(r.opening_hours->6->>'close', '00:00')
                )
            );
            
            -- Atualizar o registro
            UPDATE resellers
            SET opening_hours = new_opening_hours
            WHERE id = r.id;
        END IF;
    END LOOP;
END $$;