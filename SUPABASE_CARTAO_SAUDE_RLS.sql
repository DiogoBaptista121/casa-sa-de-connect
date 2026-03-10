-- =========================================================================================
-- SCRIPT DE CORREÇÃO: Permissões de Cartão de Saúde para 'Colaborador' (Staff)
-- OBJETIVO: Garantir que os utilizadores com o perfil 'colaborador' conseguem inserir 
--           e gerir registos na tabela cartao_saude.
-- =========================================================================================

-- 1. Assegurar que o RLS está ativo (se não estiver, ativa-o)
ALTER TABLE public.cartao_saude ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas antigas de inserção/gestão (caso existam) para evitar conflitos
DROP POLICY IF EXISTS "Colaboradores e Admins podem gerir cartoes de saude" ON public.cartao_saude;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.cartao_saude;

-- 3. Criar uma política unificada que permite SELECT, INSERT, UPDATE, DELETE 
--    a quem tiver a role de 'admin', 'manager' ou 'staff' (colaborador)
CREATE POLICY "Gestores e Colaboradores gerem cartoes de saude" 
ON public.cartao_saude 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'manager', 'staff')
  )
);

-- 4. Garantir que os visualizadores conseguem pelo menos ver (SELECT) a tabela
CREATE POLICY "Visualizadores podem ver cartoes de saude" 
ON public.cartao_saude 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'viewer'
  )
);
