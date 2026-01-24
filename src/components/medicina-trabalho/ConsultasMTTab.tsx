import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { 
  Plus, 
  Search, 
  FileDown, 
  FileUp, 
  Edit2, 
  Loader2,
  Stethoscope,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ConsultaMT, FuncionarioMT, ConsultaStatus } from '@/types/database';
import * as XLSX from 'xlsx';

export function ConsultasMTTab() {
  const { canEdit, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<ConsultaMT[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioMT[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dataFilter, setDataFilter] = useState<string>('');
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConsulta, setEditingConsulta] = useState<ConsultaMT | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Combobox
  const [funcionarioOpen, setFuncionarioOpen] = useState(false);
  
  // Form
  const [formData, setFormData] = useState({
    funcionario_id: '',
    tipo_exame: 'periódico',
    data: '',
    hora: '',
    status: 'agendada' as ConsultaStatus,
    notas: '',
    resultado: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [consultasRes, funcionariosRes] = await Promise.all([
      supabase
        .from('consultas_mt')
        .select(`
          *,
          funcionario:funcionario_id (id, nome, numero_funcionario, departamento)
        `)
        .order('data', { ascending: false })
        .order('hora', { ascending: true }),
      supabase
        .from('funcionarios_mt')
        .select('*')
        .eq('estado', 'ativo')
        .order('nome'),
    ]);

    if (consultasRes.error) {
      console.error('Error fetching consultas_mt:', consultasRes.error);
      toast.error('Erro ao carregar consultas MT');
    } else {
      setConsultas(consultasRes.data as unknown as ConsultaMT[]);
    }

    if (funcionariosRes.data) setFuncionarios(funcionariosRes.data as FuncionarioMT[]);
    
    setLoading(false);
  };

  const filteredConsultas = consultas.filter((c) => {
    const funcionario = c.funcionario as any;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!funcionario?.nome?.toLowerCase().includes(term) &&
          !funcionario?.numero_funcionario?.toLowerCase().includes(term)) {
        return false;
      }
    }
    
    if (statusFilter !== 'todos' && c.status !== statusFilter) return false;
    if (dataFilter && c.data !== dataFilter) return false;
    
    return true;
  });

  const openCreateModal = () => {
    setEditingConsulta(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      funcionario_id: '',
      tipo_exame: 'periódico',
      data: today,
      hora: '09:00',
      status: 'agendada',
      notas: '',
      resultado: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (consulta: ConsultaMT) => {
    setEditingConsulta(consulta);
    setFormData({
      funcionario_id: consulta.funcionario_id,
      tipo_exame: consulta.tipo_exame || 'periódico',
      data: consulta.data,
      hora: consulta.hora.substring(0, 5),
      status: consulta.status,
      notas: consulta.notas || '',
      resultado: consulta.resultado || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.funcionario_id) {
      toast.error('Selecione um funcionário');
      return;
    }
    if (!formData.data || !formData.hora) {
      toast.error('Preencha a data e hora');
      return;
    }

    setSaving(true);

    const payload = {
      funcionario_id: formData.funcionario_id,
      tipo_exame: formData.tipo_exame,
      data: formData.data,
      hora: formData.hora,
      status: formData.status,
      notas: formData.notas.trim() || null,
      resultado: formData.resultado.trim() || null,
      created_by: user?.id,
    };

    if (editingConsulta) {
      const { error } = await supabase
        .from('consultas_mt')
        .update(payload)
        .eq('id', editingConsulta.id);

      if (error) {
        console.error('Error updating consulta_mt:', error);
        toast.error('Erro ao atualizar consulta');
      } else {
        toast.success('Consulta atualizada com sucesso');
        setModalOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('consultas_mt').insert([payload]);

      if (error) {
        console.error('Error creating consulta_mt:', error);
        toast.error('Erro ao criar consulta');
      } else {
        toast.success('Consulta MT criada com sucesso');
        setModalOpen(false);
        fetchData();
      }
    }

    setSaving(false);
  };

  const handleQuickStatusChange = async (consulta: ConsultaMT, newStatus: ConsultaStatus) => {
    const { error } = await supabase
      .from('consultas_mt')
      .update({ status: newStatus })
      .eq('id', consulta.id);

    if (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } else {
      toast.success('Status atualizado');
      fetchData();
    }
  };

  const handleExport = () => {
    const exportData = filteredConsultas.map((c) => ({
      'Data': c.data,
      'Hora': c.hora.substring(0, 5),
      'Funcionário': (c.funcionario as any)?.nome || '',
      'Nº Funcionário': (c.funcionario as any)?.numero_funcionario || '',
      'Tipo Exame': c.tipo_exame,
      'Status': c.status,
      'Resultado': c.resultado || '',
      'Notas': c.notas || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consultas MT');
    XLSX.writeFile(wb, `consultas_mt_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Ficheiro exportado com sucesso');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let imported = 0;
        let errors = 0;

        for (const row of jsonData as any[]) {
          const numFuncionario = row['Nº Funcionário'] || row['numero_funcionario'];
          
          // Find funcionario by numero
          const { data: funcionarioData } = await supabase
            .from('funcionarios_mt')
            .select('id')
            .eq('numero_funcionario', numFuncionario)
            .single();

          if (!funcionarioData) {
            errors++;
            continue;
          }

          const payload = {
            funcionario_id: funcionarioData.id,
            tipo_exame: row['Tipo Exame'] || row['tipo_exame'] || 'periódico',
            data: row['Data'] || row['data'],
            hora: row['Hora'] || row['hora'],
            status: (row['Status'] || row['status'] || 'agendada') as ConsultaStatus,
            notas: row['Notas'] || row['notas'] || null,
            resultado: row['Resultado'] || row['resultado'] || null,
            created_by: user?.id,
          };

          if (!payload.data || !payload.hora) {
            errors++;
            continue;
          }

          const { error } = await supabase.from('consultas_mt').insert([payload]);
          if (!error) imported++;
          else errors++;
        }

        toast.success(`Importação concluída: ${imported} criados, ${errors} erros`);
        fetchData();
      } catch (err) {
        console.error('Import error:', err);
        toast.error('Erro ao processar ficheiro');
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const formatData = (data: string) => {
    return format(new Date(data), "dd 'de' MMM, yyyy", { locale: pt });
  };

  const selectedFuncionario = funcionarios.find(f => f.id === formData.funcionario_id);

  const columns: Column<ConsultaMT>[] = [
    {
      key: 'data',
      header: 'Data/Hora',
      cell: (item) => (
        <div>
          <p className="font-medium">{formatData(item.data)}</p>
          <p className="text-sm text-muted-foreground">{item.hora.substring(0, 5)}</p>
        </div>
      ),
    },
    {
      key: 'funcionario',
      header: 'Funcionário',
      cell: (item) => {
        const funcionario = item.funcionario as any;
        return (
          <div>
            <p className="font-medium">{funcionario?.nome}</p>
            <p className="text-sm text-muted-foreground">{funcionario?.numero_funcionario}</p>
          </div>
        );
      },
    },
    {
      key: 'tipo_exame',
      header: 'Tipo de Exame',
      cell: (item) => item.tipo_exame || 'Periódico',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => (
        <div className="flex items-center gap-2">
          {canEdit ? (
            <Select
              value={item.status}
              onValueChange={(value) => handleQuickStatusChange(item, value as ConsultaStatus)}
            >
              <SelectTrigger className="w-32 h-8">
                <StatusBadge status={item.status as ConsultaStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendada">Agendada</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="falta">Falta</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <StatusBadge status={item.status as ConsultaStatus} />
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (item) =>
        canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(item);
            }}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        ),
      className: 'w-10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar funcionário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Input
            type="date"
            value={dataFilter}
            onChange={(e) => setDataFilter(e.target.value)}
            className="w-full sm:w-40"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="agendada">Agendada</SelectItem>
              <SelectItem value="confirmada">Confirmada</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="falta">Falta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImport}
                className="hidden"
              />
              <Button variant="outline" className="gap-2" asChild>
                <span>
                  <FileUp className="w-4 h-4" />
                  Importar
                </span>
              </Button>
            </label>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <FileDown className="w-4 h-4" />
              Exportar
            </Button>
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Consulta MT
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredConsultas}
        loading={loading}
        emptyTitle="Sem consultas MT"
        emptyDescription="Ainda não existem consultas de medicina do trabalho."
        onRowClick={canEdit ? openEditModal : undefined}
      />

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              {editingConsulta ? 'Editar Consulta MT' : 'Nova Consulta MT'}
            </DialogTitle>
            <DialogDescription>
              {editingConsulta
                ? 'Atualize os dados da consulta'
                : 'Agende uma nova consulta de medicina do trabalho'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Funcionário Combobox */}
            <div className="space-y-2">
              <Label>Funcionário *</Label>
              <Popover open={funcionarioOpen} onOpenChange={setFuncionarioOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={funcionarioOpen}
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
                        {funcionarios.map((func) => (
                          <CommandItem
                            key={func.id}
                            value={func.nome}
                            onSelect={() => {
                              setFormData({ ...formData, funcionario_id: func.id });
                              setFuncionarioOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.funcionario_id === func.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {func.nome} ({func.numero_funcionario})
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
                value={formData.tipo_exame}
                onValueChange={(value) => setFormData({ ...formData, tipo_exame: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admissão">Admissão</SelectItem>
                  <SelectItem value="periódico">Periódico</SelectItem>
                  <SelectItem value="retorno">Retorno ao Trabalho</SelectItem>
                  <SelectItem value="mudança_função">Mudança de Função</SelectItem>
                  <SelectItem value="demissional">Demissional</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                onValueChange={(value: ConsultaStatus) =>
                  setFormData({ ...formData, status: value })
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
                </SelectContent>
              </Select>
            </div>

            {/* Resultado */}
            <div className="space-y-2">
              <Label>Resultado</Label>
              <Select
                value={formData.resultado}
                onValueChange={(value) => setFormData({ ...formData, resultado: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o resultado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apto">Apto</SelectItem>
                  <SelectItem value="inapto">Inapto</SelectItem>
                  <SelectItem value="apto_com_restricao">Apto com Restrição</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Observações da consulta..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingConsulta ? 'Guardar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
