export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      auditoria_logs: {
        Row: {
          acao: string
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cartao_saude: {
        Row: {
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          estado: Database["public"]["Enums"]["estado_registo"] | null
          id: string
          morada: string | null
          nif: string | null
          nome: string
          notas: string | null
          numero_cartao: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_registo"] | null
          id?: string
          morada?: string | null
          nif?: string | null
          nome: string
          notas?: string | null
          numero_cartao: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_registo"] | null
          id?: string
          morada?: string | null
          nif?: string | null
          nome?: string
          notas?: string | null
          numero_cartao?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          created_at: string | null
          descricao: string | null
          id: string
          updated_at: string | null
          valor: Json | null
        }
        Insert: {
          chave: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          updated_at?: string | null
          valor?: Json | null
        }
        Update: {
          chave?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          updated_at?: string | null
          valor?: Json | null
        }
        Relationships: []
      }
      consultas: {
        Row: {
          cartao_saude_id: string
          created_at: string | null
          created_by: string | null
          data: string
          hora: string
          id: string
          notas: string | null
          origem: Database["public"]["Enums"]["consulta_origem"]
          servico_id: string
          status: Database["public"]["Enums"]["consulta_status"] | null
          updated_at: string | null
        }
        Insert: {
          cartao_saude_id: string
          created_at?: string | null
          created_by?: string | null
          data: string
          hora: string
          id?: string
          notas?: string | null
          origem: Database["public"]["Enums"]["consulta_origem"]
          servico_id: string
          status?: Database["public"]["Enums"]["consulta_status"] | null
          updated_at?: string | null
        }
        Update: {
          cartao_saude_id?: string
          created_at?: string | null
          created_by?: string | null
          data?: string
          hora?: string
          id?: string
          notas?: string | null
          origem?: Database["public"]["Enums"]["consulta_origem"]
          servico_id?: string
          status?: Database["public"]["Enums"]["consulta_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultas_cartao_saude_id_fkey"
            columns: ["cartao_saude_id"]
            isOneToOne: false
            referencedRelation: "cartao_saude"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      consultas_mt: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: string
          funcionario_id: string
          hora: string
          id: string
          notas: string | null
          resultado: string | null
          status: Database["public"]["Enums"]["consulta_status"] | null
          tipo_exame: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data: string
          funcionario_id: string
          hora: string
          id?: string
          notas?: string | null
          resultado?: string | null
          status?: Database["public"]["Enums"]["consulta_status"] | null
          tipo_exame?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: string
          funcionario_id?: string
          hora?: string
          id?: string
          notas?: string | null
          resultado?: string | null
          status?: Database["public"]["Enums"]["consulta_status"] | null
          tipo_exame?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultas_mt_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_mt"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios_mt: {
        Row: {
          created_at: string | null
          data_nascimento: string | null
          departamento: string | null
          email: string | null
          estado: Database["public"]["Enums"]["estado_registo"] | null
          id: string
          nome: string
          notas: string | null
          numero_funcionario: string
          posicao: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_nascimento?: string | null
          departamento?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_registo"] | null
          id?: string
          nome: string
          notas?: string | null
          numero_funcionario: string
          posicao?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_nascimento?: string | null
          departamento?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_registo"] | null
          id?: string
          nome?: string
          notas?: string | null
          numero_funcionario?: string
          posicao?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          nome: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          nome?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          duracao_minutos: number | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff" | "viewer"
      consulta_origem: "casa_saude" | "unidade_movel"
      consulta_status:
        | "agendada"
        | "confirmada"
        | "concluida"
        | "cancelada"
        | "falta"
        | "remarcada"
      estado_registo: "ativo" | "inativo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "viewer"],
      consulta_origem: ["casa_saude", "unidade_movel"],
      consulta_status: [
        "agendada",
        "confirmada",
        "concluida",
        "cancelada",
        "falta",
        "remarcada",
      ],
      estado_registo: ["ativo", "inativo"],
    },
  },
} as const
