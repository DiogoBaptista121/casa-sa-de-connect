import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { Loader2, Calendar, Briefcase, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Servico, CartaoSaude, FuncionarioMT, ConsultaStatus, ConsultaOrigem } from '@/types/database';

export type AppointmentType = 'consulta' | 'consulta_mt';

interface AppointmentData {
  id?: string;
  type: AppointmentType;
  // Consulta fields
  cartao_saude_id?: string;
  servico_id?: string;
  origem?: ConsultaOrigem;
  // MT fields
  funcionario_id?: string;
  tipo_exame?: string;
  // Common fields
  data: string;
  hora: string;
  status: ConsultaStatus;
  notas?: string;
}

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: AppointmentData | null;
  initialDate?: Date;
  onSuccess: () => void;
}

const tiposExame = [
  'Periódico',
  'Admissão',
  'Demissional',
  'Retorno ao Trabalho',
  'Mudança de Função',
  'Avaliação Especial',
];

export function AppointmentModal({
  open,
  onOpenChange,
  initialData,
  initialDate,
  onSuccess,
}: AppointmentModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [pacientes, setPacientes] = useState<CartaoSaude[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioMT[]>([]);

  // Combobox states
  const [pacienteOpen, setPacienteOpen] = useState(false);
  const [funcionarioOpen, setFuncionarioOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<AppointmentData>({
    type: 'consulta',
    data: '',
    hora: '09:00',
    status: 'agendada',
    origem: 'casa_saude',
    tipo_exame: 'Periódico',
  });

  useEffect(() => {
    if (open) {
      fetchData();
      if (initialData) {
        setFormData(initialData);
      } else {
        const dateStr = initialDate 
          ? initialDate.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        setFormData({
          type: 'consulta',
          data: dateStr,
          hora: '09:00',
          status: 'agendada',
          origem: 'casa_saude',
          tipo_exame: 'Periódico',
        });
      }
    }
  }, [open, initialData, initialDate]);

  const fetchData = async () => {
    setLoading(true);
    const [servicosRes, pacientesRes, funcionariosRes] = await Promise.all([
      supabase.from('servicos').select('*').eq('ativo', true).order('nome'),
      supabase.from('cartao_saude').select('*').eq('estado', 'ativo').order('nome'),
      supabase.from('funcionarios_mt').select('*').eq('estado', 'ativo').order('nome'),
    ]);

    if (servicosRes.data) setServicos(servicosRes.data as Servico[]);
    if (pacientesRes.data) setPacientes(pacientesRes.data as CartaoSaude[]);
    if (funcionariosRes.data) setFuncionarios(funcionariosRes.data as FuncionarioMT[]);
    setLoading(false);
  };

  const handleSave = async () => {
    // Validation
    if (formData.type === 'consulta') {
      if (!formData.cartao_saude_id) {
        toast.error('Selecione um paciente');
        return;
      }
      if (!formData.servico_id) {
        toast.error('Selecione um serviço');
        return;
      }
    } else {
      if (!formData.funcionario_id) {
        toast.error('Selecione um funcionário');
        return;
      }
    }

    if (!formData.data || !formData.hora) {
      toast.error('Preencha a data e hora');
      return;
    }

    setSaving(true);

    try {
      if (formData.type === 'consulta') {
        const payload = {
          cartao_saude_id: formData.cartao_saude_id!,
          servico_id: formData.servico_id!,
          origem: formData.origem || 'casa_saude',
          data: formData.data,
          hora: formData.hora,
          status: formData.status,
          notas: formData.notas?.trim() || null,
          created_by: user?.id,
        };

        if (formData.id) {
          const { error } = await supabase
            .from('consultas')
            .update(payload)
            .eq('id', formData.id);
          if (error) throw error;
          toast.success('Consulta atualizada');
        } else {
          const { error } = await supabase.from('consultas').insert([payload]);
          if (error) throw error;
          toast.success('Consulta criada');
        }
      } else {
        const payload = {
          funcionario_id: formData.funcionario_id!,
          tipo_exame: formData.tipo_exame || 'Periódico',
          data: formData.data,
          hora: formData.hora,
          status: formData.status,
          notas: formData.notas?.trim() || null,
          created_by: user?.id,
        };

        if (formData.id) {
          const { error } = await supabase
            .from('consultas_mt')
            .update(payload)
            .eq('id', formData.id);
          if (error) throw error;
          toast.success('Consulta MT atualizada');
        } else {
          const { error } = await supabase.from('consultas_mt').insert([payload]);
          if (error) throw error;
          toast.success('Consulta MT criada');
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error('Erro ao guardar marcação');
    }

    setSaving(false);
  };

  const selectedPaciente = pacientes.find((p) => p.id === formData.cartao_saude_id);
  const selectedFuncionario = funcionarios.find((f) => f.id === formData.funcionario_id);

  const isEditing = !!formData.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.type === 'consulta_mt' ? (
              <Briefcase className="w-5 h-5 text-amber-500" />
            ) : (
              <Calendar className="w-5 h-5 text-primary" />
            )}
            {isEditing ? 'Editar Marcação' : 'Nova Marcação'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da marcação'
              : 'Crie uma nova marcação no calendário'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {/* Tipo (only when creating) */}
            {!isEditing && (
              <div className="space-y-2">
                <Label>Tipo de Marcação *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      type: v as AppointmentType,
                      cartao_saude_id: undefined,
                      servico_id: undefined,
                      funcionario_id: undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consulta">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Consulta
                      </span>
                    </SelectItem>
                    <SelectItem value="consulta_mt">
                      <span className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Medicina do Trabalho
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Consulta Fields */}
            {formData.type === 'consulta' && (
              <>
                {/* Paciente */}
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Popover open={pacienteOpen} onOpenChange={setPacienteOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        {selectedPaciente
                          ? `${selectedPaciente.nome} (${selectedPaciente.numero_cartao})`
                          : 'Selecione um paciente...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Pesquisar paciente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {pacientes.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.nome} ${p.numero_cartao}`}
                                onSelect={() => {
                                  setFormData({ ...formData, cartao_saude_id: p.id });
                                  setPacienteOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    formData.cartao_saude_id === p.id
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                <div>
                                  <p>{p.nome}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {p.numero_cartao}
                                  </p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Serviço */}
                <div className="space-y-2">
                  <Label>Serviço *</Label>
                  <Select
                    value={formData.servico_id || ''}
                    onValueChange={(v) => setFormData({ ...formData, servico_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: s.cor }}
                            />
                            {s.nome}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unidade */}
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select
                    value={formData.origem || 'casa_saude'}
                    onValueChange={(v) =>
                      setFormData({ ...formData, origem: v as ConsultaOrigem })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casa_saude">Casa de Saúde</SelectItem>
                      <SelectItem value="unidade_movel">Unidade Móvel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* MT Fields */}
            {formData.type === 'consulta_mt' && (
              <>
                {/* Funcionário */}
                <div className="space-y-2">
                  <Label>Funcionário *</Label>
                  <Popover open={funcionarioOpen} onOpenChange={setFuncionarioOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        {selectedFuncionario
                          ? `${selectedFuncionario.nome} (${selectedFuncionario.numero_funcionario})`
                          : 'Selecione um funcionário...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Pesquisar funcionário..." />
                        <CommandList>
                          <CommandEmpty>Nenhum funcionário encontrado.</CommandEmpty>
                          <CommandGroup>
                            {funcionarios.map((f) => (
                              <CommandItem
                                key={f.id}
                                value={`${f.nome} ${f.numero_funcionario}`}
                                onSelect={() => {
                                  setFormData({ ...formData, funcionario_id: f.id });
                                  setFuncionarioOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    formData.funcionario_id === f.id
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                <div>
                                  <p>{f.nome}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {f.numero_funcionario}
                                    {f.departamento && ` • ${f.departamento}`}
                                  </p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Tipo de Exame */}
                <div className="space-y-2">
                  <Label>Tipo de Exame</Label>
                  <Select
                    value={formData.tipo_exame || 'Periódico'}
                    onValueChange={(v) => setFormData({ ...formData, tipo_exame: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposExame.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora *</Label>
                <Input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData({ ...formData, status: v as ConsultaStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="falta">Falta</SelectItem>
                  <SelectItem value="remarcada">Remarcada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notas || ''}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Guardar' : 'Criar Marcação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
