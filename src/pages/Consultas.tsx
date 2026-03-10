import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { PageHeader } from '@/components/ui/page-header';
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
  Plus,
  Search,
  FileDown,
  Edit2,
  Loader2,
  Calendar,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Servico, ConsultaStatus, ConsultaCSFichaView, CartaoSaudePorNif } from '@/types/database';
import * as XLSX from 'xlsx';

// -----------------------------------------------------------------------
// Local row type that exactly mirrors what the fetch returns after mapping
// -----------------------------------------------------------------------
interface ConsultaRow extends ConsultaCSFichaView { }

export default function ConsultasPage() {
  const { canEdit } = useAuth();

  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<ConsultaRow[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dataFilter, setDataFilter] = useState<string>('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConsulta, setEditingConsulta] = useState<ConsultaRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConsulta, setDeletingConsulta] = useState<ConsultaRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Sort
  const [sortBy, setSortBy] = useState<string>('recentes');

  // NIF lookup
  const [nifValue, setNifValue] = useState('');
  const [nifLookup, setNifLookup] = useState<CartaoSaudePorNif | null>(null);
  const [nifSuggestions, setNifSuggestions] = useState<CartaoSaudePorNif[]>([]);
  const [nifError, setNifError] = useState('');
  const [nifSearching, setNifSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nifDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nifContainerRef = useRef<HTMLDivElement>(null);

  // Form
  const [formData, setFormData] = useState({
    data: '',
    hora: '',
    status: 'agendada' as ConsultaStatus,
    notas: '',
    servico_id: '',
    local: 'Casa de Saúde',
  });

  useEffect(() => {
    fetchData();
  }, []);

  // ------------------------------------------------------------------
  // Fetch — new schema: consultas JOIN servicos(nome, cor)
  // No cartao_saude_id join — just paciente_nif stored directly
  // ------------------------------------------------------------------
  const fetchData = async () => {
    setLoading(true);

    const [consultasRes, servicosRes] = await Promise.all([
      // Fetch consultas with servico name/cor joined
      supabase
        .from('consultas')
        .select('*, servicos(nome, cor)')
        .order('data', { ascending: false })
        .order('hora', { ascending: true }),
      // Fetch servicos — new schema has only id, nome, cor (no ativo filter)
      supabase
        .from('servicos')
        .select('id, nome, cor')
        .order('nome'),
    ]);

    if (consultasRes.error) {
      console.error('Error fetching consultas:', consultasRes.error);
      toast.error('Erro ao carregar consultas: ' + consultasRes.error.message);
    } else {
      // Map raw rows → ConsultaRow
      // NIF lookup for patient name happens lazily or via a batch fetch
      const rows = ((consultasRes.data ?? []) as any[]).map((c) => ({
        id: c.id,
        consulta_id: c.id,
        paciente_nif: c.paciente_nif ?? '',
        nome_completo: null,       // will populate via NIF lookup if needed
        numero_cartao: null,
        telefone: null,
        estado_entrega: null,
        data_consulta: c.data,
        hora_consulta: c.hora,
        status: c.status,
        local: c.local ?? null,
        servico_nome: c.servicos?.nome ?? null,
        servico_cor: c.servicos?.cor ?? null,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));

      // Batch lookup patient names from cartao_saude by NIF list
      const nifsUnicos = [...new Set(rows.map((r) => r.paciente_nif).filter(Boolean))];
      if (nifsUnicos.length > 0) {
        const { data: cartoes } = await supabase
          .from('cartao_saude')
          .select('nif, nome_completo, numero_cartao, telefone, estado_entrega')
          .in('nif', nifsUnicos as any);

        const cartaoMap = new Map<string, any>();
        ((cartoes ?? []) as any[]).forEach((c) => cartaoMap.set(c.nif, c));

        rows.forEach((r) => {
          const cartao = cartaoMap.get(r.paciente_nif);
          if (cartao) {
            r.nome_completo = cartao.nome_completo;
            r.numero_cartao = cartao.numero_cartao;
            r.telefone = cartao.telefone;
            r.estado_entrega = cartao.estado_entrega;
          }
        });
      }

      setConsultas(rows as ConsultaRow[]);
    }

    if (servicosRes.data) {
      setServicos(servicosRes.data as unknown as Servico[]);
    }

    setLoading(false);
  };

  // ------------------------------------------------------------------
  // Filters
  // ------------------------------------------------------------------
  const filteredConsultas = (() => {
    let list = consultas.filter((c) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !c.nome_completo?.toLowerCase().includes(term) &&
          !c.numero_cartao?.toLowerCase().includes(term) &&
          !c.paciente_nif?.toLowerCase().includes(term) &&
          !c.servico_nome?.toLowerCase().includes(term)
        ) return false;
      }
      if (statusFilter !== 'todos' && c.status !== statusFilter) return false;
      if (dataFilter && c.data_consulta !== dataFilter) return false;
      return true;
    });

    // Apply sort
    switch (sortBy) {
      case 'nome_asc':
        list = [...list].sort((a, b) =>
          (a.nome_completo ?? a.paciente_nif).localeCompare(b.nome_completo ?? b.paciente_nif, 'pt')
        );
        break;
      case 'status':
        list = [...list].sort((a, b) => a.status.localeCompare(b.status, 'pt'));
        break;
      case 'recentes':
      default:
        list = [...list].sort((a, b) => {
          const cmp = b.data_consulta.localeCompare(a.data_consulta);
          if (cmp !== 0) return cmp;
          return (b.hora_consulta ?? '').localeCompare(a.hora_consulta ?? '');
        });
        break;
    }
    return list;
  })();

  // ------------------------------------------------------------------
  // NIF predictive search — fires from 3 chars, debounced 250ms
  // ------------------------------------------------------------------
  const clearNifState = () => {
    setNifLookup(null);
    setNifSuggestions([]);
    setNifError('');
    setShowSuggestions(false);
  };

  const selectSuggestion = (cartao: CartaoSaudePorNif) => {
    // Show the patient name in the input for clear visual confirmation
    setNifValue(cartao.nome_completo ?? cartao.nif);
    setNifLookup(cartao);
    setNifSuggestions([]);
    setShowSuggestions(false);
    setNifError('');
  };

  const handleNifChange = (raw: string) => {
    // Accept any text freely — no digit stripping
    const val = raw;
    setNifValue(val);
    // If the user starts typing again after a selection, clear the confirmed patient
    setNifLookup(null);

    if (val.trim().length === 0) {
      clearNifState();
      setNifSearching(false);
      if (nifDebounceRef.current) clearTimeout(nifDebounceRef.current);
      return;
    }

    if (val.trim().length < 3) {
      clearNifState();
      return;
    }

    // Debounce the query
    if (nifDebounceRef.current) clearTimeout(nifDebounceRef.current);
    setNifSearching(true);
    nifDebounceRef.current = setTimeout(async () => {
      try {
        const trimmed = val.trim();
        const isExactNif = /^\d{9}$/.test(trimmed);

        if (isExactNif) {
          // Exact 9-digit NIF match
          const { data, error } = await supabase
            .from('cartao_saude')
            .select('id, nif, nome_completo, numero_cartao, telefone, estado_entrega')
            .eq('nif', trimmed)
            .maybeSingle();

          if (error) {
            setNifError('Erro ao pesquisar: ' + error.message);
            setNifLookup(null);
          } else if (!data) {
            setNifError('NIF não encontrado no Cartão de Saúde');
            setNifLookup(null);
          } else {
            setNifLookup(data as unknown as CartaoSaudePorNif);
            setNifSuggestions([]);
            setShowSuggestions(false);
            setNifError('');
          }
        } else {
          // Partial / name search — ilike on both fields
          const { data, error } = await supabase
            .from('cartao_saude')
            .select('id, nif, nome_completo, numero_cartao, telefone, estado_entrega')
            .or(`nome_completo.ilike.%${trimmed}%,nif.ilike.%${trimmed}%`)
            .limit(10);

          if (!error && data && data.length > 0) {
            setNifSuggestions(data as unknown as CartaoSaudePorNif[]);
            setShowSuggestions(true);
            setNifLookup(null);
            setNifError('');
          } else {
            setNifSuggestions([]);
            setShowSuggestions(false);
            setNifError(trimmed.length >= 4 ? 'Sem resultados para este NIF/nome' : '');
          }
        }
      } finally {
        setNifSearching(false);
      }
    }, 250);
  };


  // ------------------------------------------------------------------
  // Modal helpers
  // ------------------------------------------------------------------
  const openCreateModal = () => {
    setEditingConsulta(null);
    setNifValue('');
    clearNifState();
    setNifSearching(false);
    setFormData({
      data: new Date().toISOString().split('T')[0],
      hora: '09:00',
      status: 'agendada',
      notas: '',
      servico_id: '',
      local: 'Casa de Saúde',
    });
    setModalOpen(true);
  };

  const openEditModal = (consulta: ConsultaRow) => {
    setEditingConsulta(consulta);
    setNifValue(consulta.paciente_nif || '');
    setNifLookup(
      consulta.nome_completo
        ? ({
          id: '',
          numero_cartao: consulta.numero_cartao,
          nif: consulta.paciente_nif,
          nome_completo: consulta.nome_completo,
          telefone: consulta.telefone,
          estado_entrega: consulta.estado_entrega,
        } as CartaoSaudePorNif)
        : null
    );
    setNifSuggestions([]);
    setShowSuggestions(false);
    setNifError('');
    setFormData({
      data: consulta.data_consulta,
      hora: (consulta.hora_consulta ?? '09:00').substring(0, 5),
      status: consulta.status as ConsultaStatus,
      notas: '',
      servico_id: '',
      local: consulta.local ?? 'Casa de Saúde',
    });
    setModalOpen(true);
  };

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------
  const handleSave = async () => {
    if (!formData.data || !formData.hora) {
      toast.error('Preencha a data e hora');
      return;
    }

    // Validate using nifLookup — nifValue may show the patient name, not the NIF
    if (!nifLookup || !nifLookup.nif) {
      toast.error('Pesquise e selecione um paciente da lista');
      return;
    }
    if (!editingConsulta && !formData.servico_id) {
      toast.error('Selecione um serviço');
      return;
    }

    setSaving(true);

    if (editingConsulta) {
      const { error } = await supabase
        .from('consultas')
        .update({
          data: formData.data,
          hora: formData.hora,
          status: formData.status,
          notas: formData.notas.trim() || null,
          local: formData.local || null,
        } as any)
        .eq('id', editingConsulta.consulta_id);

      if (error) {
        console.error('Error updating consulta:', error);
        toast.error('Erro ao atualizar consulta: ' + error.message);
      } else {
        toast.success('Consulta atualizada com sucesso');
        setModalOpen(false);
        fetchData();
      }
    } else {
      // INSERT — use nifLookup.nif (guaranteed valid 9-digit NIF)
      const { error } = await supabase
        .from('consultas')
        .insert([{
          paciente_nif: nifLookup.nif,
          servico_id: formData.servico_id,
          data: formData.data,
          hora: formData.hora,
          status: formData.status,
          notas: formData.notas.trim() || null,
          local: formData.local || null,
        }] as any);

      if (error) {
        console.error('Error creating consulta:', error);
        if (error.code === '23503') {
          toast.error('NIF não encontrado na base de dados de cartões de saúde');
        } else {
          toast.error('Erro ao criar consulta: ' + error.message);
        }
      } else {
        toast.success('Consulta marcada com sucesso');
        setModalOpen(false);
        fetchData();
      }
    }

    setSaving(false);
  };

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------
  const openDeleteDialog = (consulta: ConsultaRow) => {
    setDeletingConsulta(consulta);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingConsulta) return;
    setDeleting(true);
    const { error } = await supabase
      .from('consultas')
      .delete()
      .eq('id', deletingConsulta.consulta_id);

    if (error) {
      console.error('Error deleting consulta:', error);
      if (error.code === '42501') {
        toast.error('Não tem permissão para eliminar esta consulta no servidor.');
      } else {
        toast.error('Erro ao eliminar consulta: ' + error.message);
      }
    } else {
      toast.success('Consulta eliminada com sucesso');
      setDeleteDialogOpen(false);
      setDeletingConsulta(null);
      fetchData();
    }
    setDeleting(false);
  };

  // ------------------------------------------------------------------
  // Export
  // ------------------------------------------------------------------
  const handleExport = () => {
    const exportData = filteredConsultas.map((c) => ({
      'Data': c.data_consulta,
      'Hora': (c.hora_consulta ?? '').substring(0, 5),
      'Paciente': c.nome_completo ?? c.paciente_nif,
      'NIF': c.paciente_nif,
      'Nº Cartão': c.numero_cartao ?? '',
      'Serviço': c.servico_nome ?? '',
      'Local': c.local ?? '',
      'Status': c.status,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consultas');
    XLSX.writeFile(wb, `consultas_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Ficheiro exportado com sucesso');
  };

  // ------------------------------------------------------------------
  // Bulk delete
  // ------------------------------------------------------------------
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    const { error } = await supabase
      .from('consultas')
      .delete()
      .in('id', selectedIds as any);
    if (error) {
      console.error('Error bulk deleting consultas:', error);
      if (error.code === '42501') {
        toast.error('Não tem permissão para eliminar uma ou mais consultas selecionadas.');
      } else {
        toast.error('Erro ao eliminar consultas: ' + error.message);
      }
    } else {
      toast.success(`${selectedIds.length} consulta(s) eliminada(s)`);
      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      fetchData();
    }
    setBulkDeleting(false);
  };

  const formatData = (data: string) => {
    try {
      return format(new Date(data), "dd 'de' MMM, yyyy", { locale: pt });
    } catch {
      return data;
    }
  };

  // Select-all helpers
  const allFilteredIds = filteredConsultas.map((c) => c.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  // ------------------------------------------------------------------
  // Table columns
  // ------------------------------------------------------------------
  const columns: Column<ConsultaRow>[] = [];

  if (canEdit) {
    columns.push({
      key: 'select' as any,
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleSelectAll}
          className="h-4 w-4 rounded border-gray-300"
          aria-label="Selecionar todas"
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
    });
  }

  columns.push(
    {
      key: 'data',
      header: 'Data/Hora',
      cell: (item) => (
        <div>
          <p className="font-medium text-sm">{formatData(item.data_consulta)}</p>
          <p className="text-xs text-muted-foreground">
            {(item.hora_consulta ?? '').substring(0, 5)}
          </p>
        </div>
      ),
    },
    {
      key: 'paciente',
      header: 'Paciente',
      cell: (item) => (
        <div>
          <p className="font-medium text-sm">{item.nome_completo ?? item.paciente_nif}</p>
          <p className="text-xs text-muted-foreground">
            NIF: {item.paciente_nif}
            {item.numero_cartao ? ` • Crtão: ${item.numero_cartao}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'servico_local',
      header: 'Serviço / Local',
      cell: (item) => (
        <div>
          <p className="font-medium text-sm" style={{ color: item.servico_cor ?? undefined }}>
            {item.servico_nome ?? '—'}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{item.local ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => <StatusBadge status={item.status as ConsultaStatus} />,
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); openDeleteDialog(item); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
      className: 'w-16',
    }
  );

  const isEditing = !!editingConsulta;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="page-enter flex flex-col h-full gap-3">
      <PageHeader title="Consultas" description="Gestão de marcações de consultas">
        {canEdit && (
          <>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <FileDown className="w-4 h-4" />
              Exportar
            </Button>
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Marcação
            </Button>
          </>
        )}
      </PageHeader>

      {/* Compact filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Nome, NIF, nº cartão ou serviço..."
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
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="agendada">Agendada</SelectItem>
              <SelectItem value="confirmada">Confirmada</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="falta">Falta</SelectItem>
              <SelectItem value="remarcada">Remarcada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-44 h-8 text-sm">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recentes">Mais Recentes</SelectItem>
              <SelectItem value="nome_asc">Nome Paciente (A-Z)</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          {canEdit && selectedIds.length > 0 && (
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
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredConsultas}
        loading={loading}
        emptyTitle="Sem consultas"
        emptyDescription="Ainda não existem consultas registadas."
        onRowClick={canEdit ? openEditModal : undefined}
      />

      {/* Count footer */}
      {!loading && (
        <div className="shrink-0 flex items-center justify-between px-1 py-1.5 text-xs text-muted-foreground border-t border-slate-100">
          <span>
            A mostrar{' '}
            <span className="font-semibold text-foreground">{filteredConsultas.length}</span> de{' '}
            <span className="font-semibold text-foreground">{consultas.length}</span> consultas
          </span>
          {selectedIds.length > 0 && (
            <span className="text-primary font-medium">{selectedIds.length} selecionada(s)</span>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {isEditing ? 'Editar Consulta' : 'Nova Marcação'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Atualize os dados da consulta'
                : 'Agende uma nova consulta identificando o paciente pelo NIF'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* NIF Lookup */}
            <div className="space-y-2" ref={nifContainerRef}>
              <Label>NIF do Paciente *</Label>
              <div className="relative">
                <Input
                  placeholder="Pesquise por NIF ou nome (mín. 3 caracteres)"
                  value={nifValue}
                  onChange={(e) => handleNifChange(e.target.value)}
                  maxLength={9}
                  disabled={isEditing}
                  className={`pr-8 ${nifError ? 'border-destructive' : ''}`}
                />
                {nifSearching && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && nifSuggestions.length > 0 && !isEditing && (
                  <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-lg">
                    {nifSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                        onMouseDown={(e) => {
                          // use mouseDown so blur doesn't fire first
                          e.preventDefault();
                          selectSuggestion(s);
                        }}
                      >
                        <span className="font-medium truncate">{s.nome_completo}</span>
                        <span className="text-muted-foreground ml-2 shrink-0 text-xs">{s.nif}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {nifError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {nifError}
                </p>
              )}
            </div>

            {/* Patient info card */}
            {nifLookup && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
                <p className="text-sm flex items-center gap-1.5 text-primary font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Paciente encontrado
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome: </span>
                    <span className="font-medium">{nifLookup.nome_completo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nº Cartão: </span>
                    <span className="font-medium">{nifLookup.numero_cartao || '—'}</span>
                  </div>
                  {nifLookup.telefone && (
                    <div>
                      <span className="text-muted-foreground">Telefone: </span>
                      <span className="font-medium">{nifLookup.telefone}</span>
                    </div>
                  )}
                  {nifLookup.estado_entrega && (
                    <div>
                      <span className="text-muted-foreground">Estado Entrega: </span>
                      <span className="font-medium">{nifLookup.estado_entrega}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Serviço — dropdown from servicos table */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serviço *</Label>
                <Select
                  value={formData.servico_id}
                  onValueChange={(value) => setFormData({ ...formData, servico_id: value })}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={servicos.length === 0 ? 'Sem serviços' : 'Selecione...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {servicos.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Local (substitui origem) */}
              <div className="space-y-2">
                <Label>Local</Label>
                <Select
                  value={formData.local}
                  onValueChange={(value) => setFormData({ ...formData, local: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Casa de Saúde">Casa de Saúde</SelectItem>
                    <SelectItem value="Unidade Móvel">Unidade Móvel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  <SelectItem value="remarcada">Remarcada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar' : 'Criar Marcação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar Consulta"
        description="Tem a certeza que deseja eliminar esta consulta? Esta ação não pode ser desfeita."
      />

      {/* Bulk Delete */}
      <DeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
        title="Eliminar Consultas Selecionadas"
        description={`Tem a certeza que deseja eliminar ${selectedIds.length} consulta(s)? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
