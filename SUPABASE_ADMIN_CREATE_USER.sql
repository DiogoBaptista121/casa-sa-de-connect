-- =========================================================================================
-- FUNÇÃO: admin_create_user
-- OBJETIVO: Permitir que um Administrador crie novas contas contornando a restrição 
--           global de "Signups not allowed" do Supabase Auth API.
-- =========================================================================================

-- Certifica-te de que o pgcrypto está ativado para as passwords
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_create_user(
  email_str text,
  password_str text,
  nome_str text,
  role_str text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER   -- IMPORTANTE: Executa com os privilégios do criador da função (permitindo bypass do RLS)
SET search_path = public, auth
AS $$
DECLARE
  new_user_id uuid;
  is_admin boolean;
BEGIN
  -- 1. Verificar se quem chamou a função é de facto um Admin na tabela user_roles
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem criar novos utilizadores.';
  END IF;

  -- 2. Gerar novo UUID para o utilizador
  new_user_id := gen_random_uuid();

  -- 3. Inserir o utilizador diretamente na tabela auth.users do Supabase
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    email_str,
    crypt(password_str, gen_salt('bf')),
    now(), -- Confirma o email imediatamente para não bloquear o login
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('nome', nome_str),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 4. Inserir identidade no auth.identities (Sempre necessário no Supabase para login com Password)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    provider_id
  )
  VALUES (
    gen_random_uuid(),
    new_user_id,
    format('{"sub":"%s","email":"%s"}', new_user_id::text, email_str)::jsonb,
    'email',
    now(),
    now(),
    now(),
    new_user_id::text
  );

  -- 5. Atualizar tabelas públicas
  -- Como o Supabase desencadeia o trigger (handle_new_user) no insert acima, a linha 
  -- de profiles e user_roles (como viewer) vai ser criada automaticamente em background.
  -- Para garantir que atribuímos a ROLE correta pedida pelo form, atualizamos manualmente.
  
  UPDATE public.user_roles 
  SET role = role_str 
  WHERE user_id = new_user_id;

  UPDATE public.profiles
  SET nome = nome_str,
      ativo = true
  WHERE id = new_user_id;

  RETURN new_user_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Um utilizador com este email já existe no sistema.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar utilizador: %', SQLERRM;
END;
$$;
