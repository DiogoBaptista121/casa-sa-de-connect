-- Create a sequence for numero_cartao starting at 1
CREATE SEQUENCE IF NOT EXISTS cartao_saude_numero_seq START 1;

-- Reset existing numero_cartao values to sequential numbers (1, 2, 3, ...)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_num
  FROM public.cartao_saude
)
UPDATE public.cartao_saude c
SET numero_cartao = n.new_num::TEXT
FROM numbered n
WHERE c.id = n.id;

-- Set the sequence to continue after the max existing value
SELECT setval('cartao_saude_numero_seq', COALESCE((SELECT MAX(numero_cartao::BIGINT) FROM public.cartao_saude), 0));

-- Set default for numero_cartao to use the sequence
ALTER TABLE public.cartao_saude 
ALTER COLUMN numero_cartao SET DEFAULT nextval('cartao_saude_numero_seq')::TEXT;

-- Make numero_cartao nullable so we can insert without it
ALTER TABLE public.cartao_saude 
ALTER COLUMN numero_cartao DROP NOT NULL;

-- Make NIF required and unique (the logical identifier)
-- First update any NULL or empty nif values
UPDATE public.cartao_saude 
SET nif = 'TEMP-' || id::TEXT 
WHERE nif IS NULL OR TRIM(nif) = '';

-- Add NOT NULL constraint on nif
ALTER TABLE public.cartao_saude 
ALTER COLUMN nif SET NOT NULL;

-- Drop existing unique constraint on numero_cartao if it exists
ALTER TABLE public.cartao_saude DROP CONSTRAINT IF EXISTS cartao_saude_numero_cartao_key;

-- Add unique constraint on nif
ALTER TABLE public.cartao_saude 
ADD CONSTRAINT cartao_saude_nif_unique UNIQUE (nif);