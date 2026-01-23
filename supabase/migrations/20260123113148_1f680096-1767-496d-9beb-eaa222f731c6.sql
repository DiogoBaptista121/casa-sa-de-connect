-- =====================================================
-- CASA DE SAÚDE - Sistema de Gestão
-- Database Schema Migration
-- =====================================================

-- 1. Create ENUM for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'viewer');

-- 2. Create ENUM for status de consultas
CREATE TYPE public.consulta_status AS ENUM ('agendada', 'confirmada', 'concluida', 'cancelada', 'falta', 'remarcada');

-- 3. Create ENUM for origem
CREATE TYPE public.consulta_origem AS ENUM ('casa_saude', 'unidade_movel');

-- 4. Create ENUM for estado
CREATE TYPE public.estado_registo AS ENUM ('ativo', 'inativo');

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT,
    avatar_url TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USER ROLES TABLE (Separate for security)
-- =====================================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- =====================================================
-- CARTÃO DE SAÚDE TABLE (Aderentes)
-- =====================================================
CREATE TABLE public.cartao_saude (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_cartao TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    nif TEXT,
    data_nascimento DATE,
    morada TEXT,
    estado estado_registo DEFAULT 'ativo',
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SERVIÇOS TABLE (Especialidades)
-- =====================================================
CREATE TABLE public.servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT UNIQUE NOT NULL,
    descricao TEXT,
    categoria TEXT DEFAULT 'ambos', -- casa_saude, unidade_movel, ambos
    cor TEXT DEFAULT '#0d9488', -- Para calendário
    duracao_minutos INTEGER DEFAULT 30,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONSULTAS TABLE (Marcações)
-- =====================================================
CREATE TABLE public.consultas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cartao_saude_id UUID NOT NULL REFERENCES public.cartao_saude(id) ON DELETE RESTRICT,
    servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
    origem consulta_origem NOT NULL,
    data DATE NOT NULL,
    hora TIME NOT NULL,
    status consulta_status DEFAULT 'agendada',
    notas TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FUNCIONÁRIOS MEDICINA DO TRABALHO TABLE
-- =====================================================
CREATE TABLE public.funcionarios_mt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_funcionario TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    data_nascimento DATE,
    departamento TEXT,
    posicao TEXT,
    estado estado_registo DEFAULT 'ativo',
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONSULTAS MEDICINA DO TRABALHO TABLE
-- =====================================================
CREATE TABLE public.consultas_mt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios_mt(id) ON DELETE RESTRICT,
    tipo_exame TEXT DEFAULT 'periódico', -- admissão, periódico, ocasional
    data DATE NOT NULL,
    hora TIME NOT NULL,
    status consulta_status DEFAULT 'agendada',
    notas TEXT,
    resultado TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AUDITORIA LOGS TABLE
-- =====================================================
CREATE TABLE public.auditoria_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    acao TEXT NOT NULL,
    entidade TEXT NOT NULL,
    entidade_id UUID,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DEFINIÇÕES/CONFIGURAÇÕES TABLE
-- =====================================================
CREATE TABLE public.configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave TEXT UNIQUE NOT NULL,
    valor JSONB,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Function to check if user is admin or staff
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('admin', 'staff')
    )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = 'admin'
    )
$$;

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Auto-create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, nome)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)));
    
    -- Assign default role (first user gets admin, rest get staff)
    IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cartao_saude_updated_at
    BEFORE UPDATE ON public.cartao_saude
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consultas_updated_at
    BEFORE UPDATE ON public.consultas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funcionarios_mt_updated_at
    BEFORE UPDATE ON public.funcionarios_mt
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consultas_mt_updated_at
    BEFORE UPDATE ON public.consultas_mt
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartao_saude ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios_mt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas_mt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- USER ROLES POLICIES
CREATE POLICY "Users can view own role"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- CARTAO SAUDE POLICIES
CREATE POLICY "Staff and admin can view cartao_saude"
    ON public.cartao_saude FOR SELECT
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admin can insert cartao_saude"
    ON public.cartao_saude FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admin can update cartao_saude"
    ON public.cartao_saude FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin can delete cartao_saude"
    ON public.cartao_saude FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- SERVICOS POLICIES
CREATE POLICY "Anyone authenticated can view servicos"
    ON public.servicos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin can manage servicos"
    ON public.servicos FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- CONSULTAS POLICIES
CREATE POLICY "Staff and admin can view consultas"
    ON public.consultas FOR SELECT
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admin can insert consultas"
    ON public.consultas FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admin can update consultas"
    ON public.consultas FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin can delete consultas"
    ON public.consultas FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- FUNCIONARIOS MT POLICIES
CREATE POLICY "Staff and admin can view funcionarios_mt"
    ON public.funcionarios_mt FOR SELECT
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admin can insert funcionarios_mt"
    ON public.funcionarios_mt FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admin can update funcionarios_mt"
    ON public.funcionarios_mt FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin can delete funcionarios_mt"
    ON public.funcionarios_mt FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- CONSULTAS MT POLICIES
CREATE POLICY "Staff and admin can view consultas_mt"
    ON public.consultas_mt FOR SELECT
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admin can insert consultas_mt"
    ON public.consultas_mt FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admin can update consultas_mt"
    ON public.consultas_mt FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admin can delete consultas_mt"
    ON public.consultas_mt FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- AUDITORIA LOGS POLICIES
CREATE POLICY "Admin can view auditoria_logs"
    ON public.auditoria_logs FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can insert auditoria_logs"
    ON public.auditoria_logs FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- CONFIGURACOES POLICIES
CREATE POLICY "Anyone authenticated can view configuracoes"
    ON public.configuracoes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin can manage configuracoes"
    ON public.configuracoes FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- =====================================================
-- SEED DATA - Serviços Iniciais
-- =====================================================
INSERT INTO public.servicos (nome, descricao, categoria, cor, duracao_minutos) VALUES
    ('Psicologia', 'Consultas de Psicologia Clínica', 'ambos', '#8b5cf6', 60),
    ('Neurologia', 'Consultas de Neurologia', 'ambos', '#3b82f6', 45),
    ('Medicina Geral', 'Consultas de Clínica Geral', 'ambos', '#10b981', 30),
    ('Enfermagem', 'Consultas de Enfermagem', 'ambos', '#f59e0b', 20),
    ('Nutrição', 'Consultas de Nutrição', 'ambos', '#ec4899', 45),
    ('Fisioterapia', 'Sessões de Fisioterapia', 'casa_saude', '#06b6d4', 45)
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_cartao_saude_numero ON public.cartao_saude(numero_cartao);
CREATE INDEX idx_cartao_saude_nome ON public.cartao_saude(nome);
CREATE INDEX idx_cartao_saude_estado ON public.cartao_saude(estado);
CREATE INDEX idx_consultas_data ON public.consultas(data);
CREATE INDEX idx_consultas_status ON public.consultas(status);
CREATE INDEX idx_consultas_origem ON public.consultas(origem);
CREATE INDEX idx_consultas_cartao ON public.consultas(cartao_saude_id);
CREATE INDEX idx_consultas_servico ON public.consultas(servico_id);
CREATE INDEX idx_funcionarios_mt_numero ON public.funcionarios_mt(numero_funcionario);
CREATE INDEX idx_consultas_mt_data ON public.consultas_mt(data);
CREATE INDEX idx_consultas_mt_funcionario ON public.consultas_mt(funcionario_id);