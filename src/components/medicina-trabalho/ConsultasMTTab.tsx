import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
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
  ChevronsUpDown,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ConsultaStatus } from '@/types/database';
import * as XLSX from 'xlsx';

// -------------------------------------------------------------------
// Local types — independent of stale Supabase generated types
// -------------------------------------------------------------------
interface FuncionarioBasico {
  id: string;
  nome: string;
  numero_funcionario: string;
}

interface ConsultaMTRow {
  id: string;
  funcionario_id: string;
  tipo_exame: string | null;
  data: string;
  hora: string;
  status: ConsultaStatus;
  resultado: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  // joined
  funcionarios_mt: {
    id: string;
    nome: string;
    numero_funcionario: string;
  } | null;
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------
export function ConsultasMTTab() {
  const { canEdit, role, user } = useAuth();
  const isViewer = role === 'viewer';
  const canManageBulk = role === 'admin' || role === 'manager';
  const hasEditAccess = canEdit && !isViewer;
  const { isSuperAdmin } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<ConsultaMTRow[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioBasico[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dataFilter, setDataFilter] = useState<string>('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConsulta, setEditingConsulta] = useState<ConsultaMTRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConsulta, setDeletingConsulta] = useState<ConsultaMTRow | null>(null);
  const [deleting, setDeleting] = useState(false);


  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Combobox
  const [funcionarioOpen, setFuncionarioOpen] = useState(false);

  // Form — all fields match DB columns exactly
  const [formData, setFormData] = useState({
    funcionario_id: '',
    numero_funcionario: '',      // kept in sync for the ultimo_exame update
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

  // ----------------------------------------------------------------
  // Fetch — uses the correct join key (table name, not alias)
  // ----------------------------------------------------------------
  const fetchData = async () => {
    setLoading(true);

    const [consultasRes, funcionariosRes] = await Promise.all([
      // Join key = the actual table name referenced by the FK
      supabase
        .from('consultas_mt' as any)
        .select('*, funcionarios_mt(id, nome, numero_funcionario)')
        .order('data', { ascending: false })
        .order('hora', { ascending: true }),

      supabase
        .from('funcionarios_mt' as any)
        .select('id, nome, numero_funcionario')
        .eq('estado', 'Ativo' as any)
        .order('nome'),
    ]);

    if (consultasRes.error) {
      console.error('Error fetching consultas_mt:', consultasRes.error);
      toast.error('Erro ao carregar consultas MT: ' + consultasRes.error.message);
    } else {
      setConsultas((consultasRes.data ?? []) as unknown as ConsultaMTRow[]);
    }

    if (funcionariosRes.error) {
      console.error('Error fetching funcionarios_mt:', funcionariosRes.error);
    } else {
      setFuncionarios((funcionariosRes.data ?? []) as unknown as FuncionarioBasico[]);
    }

    setLoading(false);
  };

  // ----------------------------------------------------------------
  // Filtering
  // ----------------------------------------------------------------
  const filteredConsultas = consultas.filter((c) => {
    const func = c.funcionarios_mt;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !func?.nome?.toLowerCase().includes(term) &&
        !func?.numero_funcionario?.toLowerCase().includes(term)
      ) {
        return false;
      }
    }

    if (statusFilter !== 'todos' && c.status !== statusFilter) return false;
    if (dataFilter && c.data !== dataFilter) return false;

    return true;
  });

  // ----------------------------------------------------------------
  // Modal helpers
  // ----------------------------------------------------------------
  const openCreateModal = () => {
    setEditingConsulta(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      funcionario_id: '',
      numero_funcionario: '',
      tipo_exame: 'periódico',
      data: today,
      hora: '09:00',
      status: 'agendada',
      notas: '',
      resultado: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (consulta: ConsultaMTRow) => {
    setEditingConsulta(consulta);
    setFormData({
      funcionario_id: consulta.funcionario_id,
      numero_funcionario: consulta.funcionarios_mt?.numero_funcionario || '',
      tipo_exame: consulta.tipo_exame || 'periódico',
      data: consulta.data,
      hora: (consulta.hora ?? '').substring(0, 5),
      status: consulta.status,
      notas: consulta.notas || '',
      resultado: consulta.resultado || '',
    });
    setModalOpen(true);
  };

  // ----------------------------------------------------------------
  // Save — payload contains only columns that exist in the DB
  // ----------------------------------------------------------------
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

    // Normalize hora to HH:mm (strip seconds if browser returns HH:mm:ss)
    const horaFormatada = formData.hora.substring(0, 5);

    // Payload matches the actual DB columns exactly
    const payload: Record<string, unknown> = {
      funcionario_id: formData.funcionario_id,
      numero_funcionario: formData.numero_funcionario
        ? Number(formData.numero_funcionario) || null
        : null,
      tipo_exame: formData.tipo_exame,
      data: formData.data,
      hora: horaFormatada,
      status: formData.status,
      resultado: formData.resultado.trim() || null,
      notas: formData.notas.trim() || null,
    };

    // Helper: sync ultimo_exame on the employee row after a successful save
    const syncUltimoExame = async () => {
      const numFuncionario = Number(formData.numero_funcionario);
      if (!numFuncionario || !formData.data) return;
      const { error: syncErr } = await supabase
        .from('funcionarios_mt')
        .update({ ultimo_exame: formData.data })
        .eq('numero_funcionario', numFuncionario as any);
      if (syncErr) {
        console.warn('Erro ao sincronizar ultimo_exame:', syncErr.message);
      }
    };

    if (editingConsulta) {
      const { error } = await supabase
        .from('consultas_mt' as any)
        .update(payload)
        .eq('id', editingConsulta.id);

      if (error) {
        console.error('Error updating consulta_mt:', error);
        toast.error('Erro ao atualizar consulta: ' + error.message);
      } else {
        await syncUltimoExame();
        toast.success('Consulta atualizada com sucesso');
        setModalOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('consultas_mt' as any)
        .insert([payload]);

      if (error) {
        console.error('Error creating consulta_mt:', error);
        toast.error('Erro ao criar consulta: ' + error.message);
      } else {
        await syncUltimoExame();
        toast.success('Consulta MT criada com sucesso');
        setModalOpen(false);
        fetchData();
      }
    }

    setSaving(false);
  };

  // ----------------------------------------------------------------
  // Delete
  // ----------------------------------------------------------------
  const openDeleteDialog = (consulta: ConsultaMTRow) => {
    setDeletingConsulta(consulta);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingConsulta) return;

    setDeleting(true);
    const { error } = await supabase
      .from('consultas_mt' as any)
      .delete()
      .eq('id', deletingConsulta.id);

    if (error) {
      console.error('Error deleting consulta_mt:', error);
      toast.error('Erro ao eliminar consulta MT');
    } else {
      toast.success('Consulta MT eliminada com sucesso');
      setDeleteDialogOpen(false);
      setDeletingConsulta(null);
      fetchData();
    }
    setDeleting(false);
  };

  // ----------------------------------------------------------------
  // Bulk Delete
  // ----------------------------------------------------------------
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    const { error } = await supabase
      .from('consultas_mt' as any)
      .delete()
      .in('id', selectedIds as any);

    if (error) {
      toast.error('Erro ao eliminar consultas: ' + error.message);
    } else {
      toast.success(`${selectedIds.length} consulta(s) eliminada(s) com sucesso`);
      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      fetchData();
    }
    setBulkDeleting(false);
  };

  // ----------------------------------------------------------------
  // Quick status change
  // ----------------------------------------------------------------
  const handleQuickStatusChange = async (consulta: ConsultaMTRow, newStatus: ConsultaStatus) => {
    const { error } = await supabase
      .from('consultas_mt' as any)
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

  // ----------------------------------------------------------------
  // Export
  // ----------------------------------------------------------------
  const handleExport = () => {
    const exportData = filteredConsultas.map((c) => ({
      'Data': c.data,
      'Hora': (c.hora ?? '').substring(0, 5),
      'Funcionário': c.funcionarios_mt?.nome || '',
      'Nº Funcionário': c.funcionarios_mt?.numero_funcionario || '',
      'Tipo Exame': c.tipo_exame || '',
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

  // ----------------------------------------------------------------
  // Import
  // ----------------------------------------------------------------
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

          const { data: funcionarioData } = await supabase
            .from('funcionarios_mt' as any)
            .select('id')
            .eq('numero_funcionario', numFuncionario)
            .single();

          if (!funcionarioData) {
            errors++;
            continue;
          }

          const payload: Record<string, unknown> = {
            funcionario_id: (funcionarioData as any).id,
            tipo_exame: row['Tipo Exame'] || row['tipo_exame'] || 'periódico',
            data: row['Data'] || row['data'],
            hora: row['Hora'] || row['hora'],
            status: (row['Status'] || row['status'] || 'agendada') as ConsultaStatus,
            notas: row['Notas'] || row['notas'] || null,
            resultado: row['Resultado'] || row['resultado'] || null,
          };

          if (!payload.data || !payload.hora) {
            errors++;
            continue;
          }

          const { error } = await supabase
            .from('consultas_mt' as any)
            .insert([payload]);
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

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  const formatData = (data: string) => {
    try {
      return format(new Date(data), "dd 'de' MMM, yyyy", { locale: pt });
    } catch {
      return data;
    }
  };

  const selectedFuncionario = funcionarios.find((f) => f.id === formData.funcionario_id);

  // Page-level select-all (filtered list)
  const allFilteredIds = filteredConsultas.map((c) => c.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  // ----------------------------------------------------------------
  // Table columns
  // ----------------------------------------------------------------
  const baseColumns: Column<ConsultaMTRow>[] = [
    {
      key: 'numero_funcionario',
      header: 'Nº Funcionário',
      cell: (item) => item.funcionarios_mt?.numero_funcionario || '-',
    },
    {
      key: 'nome',
      header: 'Nome Completo',
      cell: (item) => item.funcionarios_mt?.nome || '-',
    },
    {
      key: 'data',
      header: 'Data',
      cell: (item) => formatData(item.data),
    },
    {
      key: 'hora',
      header: 'Hora',
      cell: (item) => (item.hora ?? '').substring(0, 5) || '-',
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
          {hasEditAccess ? (
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
      key: 'resultado',
      header: 'Resultado',
      cell: (item) => {
        const labels: Record<string, string> = {
          'apto': 'Apto',
          'apto_com_recomendacoes': 'Apto c/ Recomendações',
          'inapto_temporario': 'Inapto Temporário',
          'inapto': 'Inapto',
          // legacy keys kept for existing data
          'apto_com_restricao': 'Apto c/ Restrição',
          'pendente': 'Pendente',
        };
        return item.resultado ? (labels[item.resultado] || item.resultado) : '-';
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <div className="flex items-center gap-1">
          {hasEditAccess && (
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
          )}
          {hasEditAccess && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                openDeleteDialog(item);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
      className: 'w-16',
    },
  ];

  const checkboxColumn: Column<ConsultaMTRow> = {
    key: 'select' as any,
    header: (
      <input
        type="checkbox"
        checked={allSelected}
        onChange={toggleSelectAll}
        className="h-4 w-4 rounded border-gray-300"
        aria-label="Selecionar todos"
      />
    ) as any,
    cell: (item) => (
      <input
        type="checkbox"
        checked={selectedIds.includes(item.id)}
        onChange={(e) => {
          e.stopPropagation();
          setSelectedIds((prev) =>
            e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
          );
        }}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 rounded border-gray-300"
      />
    ),
    className: 'w-10',
  };

  const columns = !canManageBulk ? baseColumns : [checkboxColumn, ...baseColumns];

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="flex flex-col h-full gap-3">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar funcionário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Input
            type="date"
            value={dataFilter}
            onChange={(e) => setDataFilter(e.target.value)}
            className="w-full sm:w-36 h-8 text-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36 h-8 text-sm">
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
          {isSuperAdmin && selectedIds.length > 0 && !isViewer && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 h-8 text-xs shrink-0"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar ({selectedIds.length})
            </Button>
          )}
        </div>

        {hasEditAccess && (
          <div className="flex gap-2 shrink-0">
            {canManageBulk && (
              <>
                <label className="cursor-pointer">
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" asChild>
                    <span><FileUp className="w-3.5 h-3.5" />Importar</span>
                  </Button>
                </label>
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 h-8 text-xs">
                  <FileDown className="w-3.5 h-3.5" />Exportar
                </Button>
              </>
            )}
            <Button size="sm" onClick={openCreateModal} className="gap-1.5 h-8 text-xs">
              <Plus className="w-3.5 h-3.5" />Nova Consulta MT
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
        onRowClick={hasEditAccess ? openEditModal : undefined}
      />

      {/* Count footer */}
      {!loading && (
        <div className="shrink-0 flex items-center justify-between px-1 py-1.5 text-xs text-muted-foreground border-t border-slate-100">
          <span>
            A mostrar <span className="font-semibold text-foreground mx-1">{filteredConsultas.length}</span> de{' '}
            <span className="font-semibold text-foreground mx-1">{consultas.length}</span> consultas MT
          </span>
          {selectedIds.length > 0 && !isViewer && (
            <span className="text-primary font-medium">{selectedIds.length} selecionada(s)</span>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
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
                            value={`${func.nome} ${func.numero_funcionario}`}
                            onSelect={() => {
                              setFormData({
                                ...formData,
                                funcionario_id: func.id,
                                numero_funcionario: func.numero_funcionario,
                              });
                              setFuncionarioOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.funcionario_id === func.id ? 'opacity-100' : 'opacity-0'
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
                  <SelectItem value="periódico">Periódica</SelectItem>
                  <SelectItem value="ocasional">Ocasional</SelectItem>
                  <SelectItem value="retorno">Regresso ao Trabalho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data + Hora */}
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
                  <SelectItem value="apto_com_recomendacoes">Apto com Recomendações</SelectItem>
                  <SelectItem value="inapto_temporario">Inapto Temporário</SelectItem>
                  <SelectItem value="inapto">Inapto</SelectItem>
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

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar Consulta MT"
        description="Tem a certeza que deseja eliminar esta consulta de medicina do trabalho? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
