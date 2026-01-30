// Casa de Saúde - Database Types

export type AppRole = 'admin' | 'staff' | 'viewer';
export type ConsultaStatus = 'agendada' | 'confirmada' | 'concluida' | 'cancelada' | 'falta' | 'remarcada';
export type ConsultaOrigem = 'casa_saude' | 'unidade_movel';
export type EstadoRegisto = 'ativo' | 'inativo';
export type DocumentoTipo = 'CC' | 'BI';
export type EstadoEntrega = 'ENTREGUE' | 'NAO_ENTREGUE' | 'PENDENTE' | 'CANCELADO';

export interface Profile {
  id: string;
  email: string;
  nome: string | null;
  avatar_url: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface CartaoSaude {
  id: string;
  numero_cartao: string | null;
  nome_completo: string;
  data_nascimento: string | null;
  nif: string;
  documento_tipo: DocumentoTipo | null;
  documento_numero: number | null;
  documento_validade: string | null;
  morada: string | null;
  freguesia: string | null;
  email: string | null;
  telefone: string | null;
  estado: EstadoRegisto | null;
  estado_entrega: EstadoEntrega | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  cor: string;
  duracao_minutos: number;
  ativo: boolean;
  created_at: string;
}

export interface Consulta {
  id: string;
  cartao_saude_id: string;
  servico_id: string;
  origem: ConsultaOrigem;
  data: string;
  hora: string;
  status: ConsultaStatus;
  notas: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  cartao_saude?: CartaoSaude;
  servico?: Servico;
}

export interface FuncionarioMT {
  id: string;
  numero_funcionario: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  departamento: string | null;
  posicao: string | null;
  estado: EstadoRegisto;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultaMT {
  id: string;
  funcionario_id: string;
  tipo_exame: string;
  data: string;
  hora: string;
  status: ConsultaStatus;
  notas: string | null;
  resultado: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  funcionario?: FuncionarioMT;
}

export interface AuditoriaLog {
  id: string;
  user_id: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface Configuracao {
  id: string;
  chave: string;
  valor: Record<string, unknown> | null;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

// Status labels and colors
export const statusLabels: Record<ConsultaStatus, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  falta: 'Falta',
  remarcada: 'Remarcada',
};

export const statusColors: Record<ConsultaStatus, string> = {
  agendada: 'badge-agendada',
  confirmada: 'badge-confirmada',
  concluida: 'badge-concluida',
  cancelada: 'badge-cancelada',
  falta: 'badge-falta',
  remarcada: 'badge-remarcada',
};

export const origemLabels: Record<ConsultaOrigem, string> = {
  casa_saude: 'Casa de Saúde',
  unidade_movel: 'Unidade Móvel',
};

export const origemColors: Record<ConsultaOrigem, string> = {
  casa_saude: 'badge-casa-saude',
  unidade_movel: 'badge-unidade-movel',
};

export const estadoLabels: Record<EstadoRegisto, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
};

export const estadoColors: Record<EstadoRegisto, string> = {
  ativo: 'badge-ativo',
  inativo: 'badge-inativo',
};

export const documentoTipoLabels: Record<DocumentoTipo, string> = {
  CC: 'Cartão de Cidadão',
  BI: 'Bilhete de Identidade',
};

export const estadoEntregaLabels: Record<EstadoEntrega, string> = {
  ENTREGUE: 'Entregue',
  NAO_ENTREGUE: 'Não Entregue',
  PENDENTE: 'Pendente',
  CANCELADO: 'Cancelado',
};

export const estadoEntregaColors: Record<EstadoEntrega, string> = {
  ENTREGUE: 'badge-concluida',
  NAO_ENTREGUE: 'badge-falta',
  PENDENTE: 'badge-agendada',
  CANCELADO: 'badge-cancelada',
};
