-- Altera a restrição de verificação na tabela nexochat_status para incluir o valor 'deletado'
ALTER TABLE public.nexochat_status 
  DROP CONSTRAINT IF EXISTS nexochat_status_status_check;

-- Adiciona a restrição novamente, incluindo 'deletado' como valor válido
ALTER TABLE public.nexochat_status 
  ADD CONSTRAINT nexochat_status_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'attending'::text, 'finished'::text, 'deletado'::text, 'contacts'::text]));

-- Registra alteração no log
INSERT INTO public.schema_migrations (version, dirty) 
VALUES (TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDDHHMI') || '_add_deletado_to_nexochat_status', false);
