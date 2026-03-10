import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  FileUp,
  Edit2,
  Loader2,
  Users,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import type { FuncionarioMT } from '@/types/database';
import { getExamStatus, calculateNextExam } from '@/lib/examUtils';
import type { ExamStatus } from '@/lib/examUtils';
import * as XLSX from 'xlsx';


// Helper to format date for display
const formatDate = (date: string | null): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-PT');
};

// ─── Exam status badge ────────────────────────────────────────────
const EXAM_BADGE: Record<ExamStatus, { label: string; className: string }> = {
  vencido: { label: 'Vencido 🔴', className: 'bg-red-100 text-red-700 border-red-200' },
  a_vencer: { label: 'A Vencer 🟠', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  em_dia: { label: 'Em Dia 🟢', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  sem_data: { label: 'Aguardar 1ª Consulta', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function ExamStatusBadge({ ultimoExame, dataNasc }: { ultimoExame: string | null; dataNasc: string | null }) {
  const status = getExamStatus(ultimoExame, dataNasc);
  const { label, className } = EXAM_BADGE[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${className}`}>
      {label}
    </span>
  );
}


export function FuncionariosTab() {
  const { canEdit, role } = useAuth();
  const isViewer = role === 'viewer';
  const canManageBulk = role === 'admin' || role === 'manager';
  const hasEditAccess = canEdit && !isViewer;
  const { isSuperAdmin } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [funcionarios, setFuncionarios] = useState<FuncionarioMT[]>([]);
  const [filteredFuncionarios, setFilteredFuncionarios] = useState<FuncionarioMT[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ativoFilter, setAtivoFilter] = useState<string>('todos');
  const [examFilter, setExamFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('numero_asc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<FuncionarioMT | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFuncionario, setDeletingFuncionario] = useState<FuncionarioMT | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state — columns match the real DB schema exactly
  const [formData, setFormData] = useState({
    numero_funcionario: '',
    nome: '',
    telefone: '',
    data_nascimento: '',
    categoria: '',
    servico: '',
    data_admissao: '',
    ultimo_exame: '',
    estado: 'Ativo' as string,
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchFuncionarios();
  }, []);

  useEffect(() => {
    filterFuncionarios();
  }, [funcionarios, searchTerm, ativoFilter, examFilter, sortBy]);

  const fetchFuncionarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('funcionarios_mt')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching funcionarios:', error);
      toast.error('Erro ao carregar funcionários');
    } else {
      setFuncionarios(data as unknown as FuncionarioMT[]);
    }
    setLoading(false);
  };

  const filterFuncionarios = () => {
    let filtered = [...funcionarios];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((f) => {
        const nome = f.nome?.toLowerCase() || '';
        const numero = String(f.numero_funcionario || '').toLowerCase();
        const cat = f.categoria?.toLowerCase() || '';
        const serv = f.servico?.toLowerCase() || '';
        const telf = String(f.telefone || '').toLowerCase();
        return nome.includes(term) || numero.includes(term) || cat.includes(term) || serv.includes(term) || telf.includes(term);
      });
    }

    if (ativoFilter === 'ativo') {
      filtered = filtered.filter((f) => f.estado === 'Ativo');
    } else if (ativoFilter === 'inativo') {
      filtered = filtered.filter((f) => f.estado === 'Inativo');
    }

    // Exam status filter
    if (examFilter !== 'todos') {
      filtered = filtered.filter(
        (f) => getExamStatus(f.ultimo_exame ?? null, f.data_nascimento ?? null) === examFilter
      );
    }

    // Apply sort
    switch (sortBy) {
      case 'numero_desc':
        filtered = [...filtered].sort((a, b) =>
          (parseInt(b.numero_funcionario) || 0) - (parseInt(a.numero_funcionario) || 0)
        );
        break;
      case 'nome_asc':
        filtered = [...filtered].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
        break;
      case 'nome_desc':
        filtered = [...filtered].sort((a, b) => b.nome.localeCompare(a.nome, 'pt'));
        break;
      case 'numero_asc':
      default:
        filtered = [...filtered].sort((a, b) =>
          (parseInt(a.numero_funcionario) || 0) - (parseInt(b.numero_funcionario) || 0)
        );
        break;
    }

    setFilteredFuncionarios(filtered);
  };

  const resetForm = () => {
    setFormData({
      numero_funcionario: '',
      nome: '',
      telefone: '',
      data_nascimento: '',
      categoria: '',
      servico: '',
      data_admissao: '',
      ultimo_exame: '',
      estado: 'Ativo',
    });
    setFormErrors({});
  };

  const openCreateModal = () => {
    setEditingFuncionario(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (funcionario: FuncionarioMT) => {
    setEditingFuncionario(funcionario);
    setFormData({
      numero_funcionario: funcionario.numero_funcionario,
      nome: funcionario.nome,
      telefone: funcionario.telefone ? String(funcionario.telefone) : '',
      data_nascimento: funcionario.data_nascimento || '',
      categoria: funcionario.categoria || '',
      servico: funcionario.servico || '',
      data_admissao: funcionario.data_admissao || '',
      ultimo_exame: funcionario.ultimo_exame || '',
      estado: funcionario.estado || 'Ativo',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!String(formData.numero_funcionario).trim()) {
      errors.numero_funcionario = 'Nº de Funcionário é obrigatório';
    } else if (!/^\d+$/.test(String(formData.numero_funcionario).trim())) {
      errors.numero_funcionario = 'Nº de Funcionário deve conter apenas números';
    }

    if (!formData.nome.trim()) {
      errors.nome = 'Nome Completo é obrigatório';
    }

    if (formData.telefone && !/^\d{1,9}$/.test(String(formData.telefone).trim())) {
      errors.telefone = 'O telefone deve conter apenas números (máx 9)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    // Payload fields match DB columns exactly
    const payload = {
      numero_funcionario: String(formData.numero_funcionario).trim(),
      nome: formData.nome.trim(),
      telefone: formData.telefone ? Number(String(formData.telefone).replace(/\D/g, '')) || null : null,
      data_nascimento: formData.data_nascimento || null,
      categoria: formData.categoria.trim() || null,
      servico: formData.servico.trim() || null,
      data_admissao: formData.data_admissao || null,
      ultimo_exame: formData.ultimo_exame || null,
      estado: formData.estado || 'Ativo',
    };

    let error: any = null;

    if (editingFuncionario) {
      // ── EDIT: target the exact row by its UUID ──────────────────────
      const res = await supabase
        .from('funcionarios_mt')
        .update(payload as any)
        .eq('id', editingFuncionario.id);
      error = res.error;
    } else {
      // ── CREATE: upsert guards against duplicate numero_funcionario ──
      const res = await supabase
        .from('funcionarios_mt')
        .upsert(payload as any, { onConflict: 'numero_funcionario' });
      error = res.error;
    }

    if (error) {
      console.error('Error saving funcionario:', error);
      if (error.code === '23505') {
        toast.error('Já existe um funcionário com este Nº');
      } else {
        toast.error('Erro ao guardar funcionário: ' + error.message);
      }
    } else {
      toast.success(editingFuncionario ? 'Funcionário atualizado com sucesso' : 'Funcionário criado com sucesso');
      setModalOpen(false);
      fetchFuncionarios();
    }

    setSaving(false);
  };


  const openDeleteDialog = (funcionario: FuncionarioMT) => {
    setDeletingFuncionario(funcionario);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingFuncionario) return;

    setDeleting(true);
    const { error } = await supabase
      .from('funcionarios_mt')
      .delete()
      .eq('id', deletingFuncionario.id);

    if (error) {
      console.error('Error deleting funcionario:', error);
      toast.error('Erro ao eliminar funcionário');
    } else {
      toast.success('Funcionário eliminado com sucesso');
      setDeleteDialogOpen(false);
      setDeletingFuncionario(null);
      fetchFuncionarios();
    }
    setDeleting(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    const { error } = await supabase
      .from('funcionarios_mt')
      .delete()
      .in('id', selectedIds as any);

    if (error) {
      toast.error('Erro ao eliminar funcionários: ' + error.message);
    } else {
      toast.success(`${selectedIds.length} funcionário(s) eliminado(s) com sucesso`);
      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      fetchFuncionarios();
    }
    setBulkDeleting(false);
  };

  const handleExport = () => {
    const exportData = filteredFuncionarios.map((f) => ({
      'Nº': f.numero_funcionario,
      'Nome Completo': f.nome,
      'Categoria': f.categoria || '',
      'Serviço': f.servico || '',
      'Admissão': f.data_admissao || '',
      'ultimo_exame': f.ultimo_exame || '',
      'Data de Nascimento': f.data_nascimento || '',
      'Telefone': f.telefone || '',
      'Estado': f.estado || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Funcionários MT');
    XLSX.writeFile(wb, `funcionarios_mt_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Ficheiro exportado com sucesso');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ── Date parser ─────────────────────────────────────────────────
    const parseExcelDate = (val: any): string | null => {
      if (!val || val === '-' || val === '') return null;
      // Numeric serial (Excel date)
      if (typeof val === 'number') {
        const d = new Date((val - 25569) * 86400 * 1000);
        return d.toISOString().split('T')[0];
      }
      const str = String(val).trim();
      if (!str || str === '-') return null;
      // Already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      // DD/MM/YYYY or DD/MM/YY
      const parts = str.split('/');
      if (parts.length === 3) {
        let [d, m, y] = parts;
        if (y.length === 2) y = parseInt(y) > 30 ? `19${y}` : `20${y}`;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return null;
    };

    // ── Int cleaner ──────────────────────────────────────────────────
    const toInt = (v: any): number | null =>
      v ? (parseInt(String(v).replace(/\D/g, ''), 10) || null) : null;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bytes = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(bytes, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: null }) as any[];

        // ── Debug: log raw first row to verify column names ─────────
        if (data.length > 0) console.log('Primeira linha do Excel (raw):', JSON.stringify(data[0]));

        const formattedData = data.map((row) => ({
          numero_funcionario: Number(row['Nº']),
          nome: String(row['Nome Completo'] || '').trim(),
          servico: String(row['Serviço'] || '').trim() || null,
          data_admissao: parseExcelDate(row['Admissão']),
          ultimo_exame: parseExcelDate(row['ultimo_exame']),
          data_nascimento: parseExcelDate(row['Data de Nascimento']),
          categoria: String(row['Categoria'] || '').trim() || null,
          // 'idade' é calculada automaticamente — não é enviada
        })).filter(item => item.numero_funcionario > 0);

        console.log(`formattedData: ${formattedData.length} linhas válidas de ${data.length} total`);
        if (formattedData.length > 0) console.log('Objeto a enviar:', JSON.stringify(formattedData[0]));

        // ── Bulk upsert ──────────────────────────────────────────────
        const { error } = await supabase
          .from('funcionarios_mt')
          .upsert(formattedData as any, { onConflict: 'numero_funcionario' });

        if (error) {
          console.error('Supabase upsert error:', error);
          // Detailed alert so the user can see the exact failing column
          alert(
            'Erro na Base de Dados:\n' +
            (error.message || '') +
            (error.details ? '\n\nDetalhes: ' + error.details : '') +
            (error.hint ? '\n\nDica: ' + error.hint : '')
          );
          toast.error('Erro ao importar: ' + error.message);
        } else {
          toast.success(`Importação concluída: ${formattedData.length} registos processados`);
          fetchFuncionarios();
        }
      } catch (err: any) {
        console.error('Import error:', err);
        toast.error('Erro ao processar ficheiro: ' + (err?.message ?? err));
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  // Page-level select-all (filtered list)
  const allFilteredIds = filteredFuncionarios.map((f) => f.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  const columns: Column<FuncionarioMT>[] = [
    {
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
    },
    {
      key: 'numero_funcionario',
      header: 'Nº',
      cell: (item) => (
        <span className="font-mono font-medium text-primary text-sm">{item.numero_funcionario}</span>
      ),
      className: 'w-20',
    },
    {
      key: 'nome',
      header: 'Nome Completo',
      cell: (item) => <span className="font-medium text-sm">{item.nome}</span>,
    },
    {
      key: 'categoria',
      header: 'Categoria',
      cell: (item) => <span className="text-sm text-muted-foreground">{item.categoria || '-'}</span>,
      className: 'hidden md:table-cell',
    },
    {
      key: 'servico',
      header: 'Serviço',
      cell: (item) => <span className="text-sm text-muted-foreground">{item.servico || '-'}</span>,
      className: 'hidden md:table-cell',
    },
    {
      key: 'ultimo_exame',
      header: 'Último Exame',
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.ultimo_exame ? formatDate(item.ultimo_exame) : '-'}
        </span>
      ),
      className: 'hidden lg:table-cell w-36',
    },
    {
      key: 'proximo_exame' as any,
      header: 'Próximo Exame',
      cell: (item) => {
        const next = calculateNextExam(item.ultimo_exame ?? null, item.data_nascimento ?? null);
        return (
          <span className="text-sm text-muted-foreground">
            {next ? next.toLocaleDateString('pt-PT') : <span className="italic text-xs">Aguardar 1ª Consulta</span>}
          </span>
        );
      },
      className: 'hidden xl:table-cell w-36',
    },
    {
      key: 'estado_exame' as any,
      header: 'Estado Exame',
      cell: (item) => (
        <ExamStatusBadge
          ultimoExame={item.ultimo_exame ?? null}
          dataNasc={item.data_nascimento ?? null}
        />
      ),
      className: 'hidden xl:table-cell w-32',
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <div className="flex items-center gap-1">
          {hasEditAccess && (
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {isSuperAdmin && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); openDeleteDialog(item); }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
      className: 'w-16',
    },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      {/* ── Dashboard Card Wrapper ───────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden bg-card rounded-xl shadow-sm border border-border">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2 p-4 shrink-0 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Pesquisar nome, número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <Select value={ativoFilter} onValueChange={setAtivoFilter}>
              <SelectTrigger className="w-full sm:w-28 h-8 text-sm">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            {/* Exam status filter */}
            <Select value={examFilter} onValueChange={setExamFilter}>
              <SelectTrigger className="w-full sm:w-36 h-8 text-sm">
                <SelectValue placeholder="Exame" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Exames</SelectItem>
                <SelectItem value="vencido">Vencidos 🔴</SelectItem>
                <SelectItem value="a_vencer">A Vencer (30d) 🟠</SelectItem>
                <SelectItem value="em_dia">Em Dia 🟢</SelectItem>
                <SelectItem value="sem_data">Sem Registo</SelectItem>
              </SelectContent>
            </Select>
            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48 h-8 text-sm">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="numero_asc">Nº (Crescente)</SelectItem>
                <SelectItem value="numero_desc">Nº (Decrescente)</SelectItem>
                <SelectItem value="nome_asc">Nome (A-Z)</SelectItem>
                <SelectItem value="nome_desc">Nome (Z-A)</SelectItem>
              </SelectContent>
            </Select>
            {/* Bulk delete button */}
            {isSuperAdmin && selectedIds.length > 0 && (
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
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" asChild>
                  <span>
                    <FileUp className="w-3.5 h-3.5" />
                    Importar
                  </span>
                </Button>
              </label>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 h-8 text-xs">
                <FileDown className="w-3.5 h-3.5" />
                Exportar
              </Button>
              <Button size="sm" onClick={openCreateModal} className="gap-1.5 h-8 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Novo Funcionário
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <DataTable
            columns={columns}
            data={filteredFuncionarios}
            loading={loading}
            emptyTitle="Sem funcionários"
            emptyDescription="Ainda não existem funcionários registados."
            onRowClick={hasEditAccess ? openEditModal : undefined}
          />
        </div>

        {/* Count footer */}
        {!loading && (
          <div className="shrink-0 flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border">
            <span>
              A mostrar <span className="font-semibold text-foreground">{filteredFuncionarios.length}</span> de{' '}
              <span className="font-semibold text-foreground">{funcionarios.length}</span> funcionários
            </span>
            {selectedIds.length > 0 && (
              <span className="text-primary font-medium">{selectedIds.length} selecionado(s)</span>
            )}
          </div>
        )}
      </div>{/* end Card */}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
            </DialogTitle>
            <DialogDescription>
              {editingFuncionario
                ? 'Atualize os dados do funcionário'
                : 'Preencha os dados do novo funcionário'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Row 1: Número + Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número do Funcionário *</Label>
                <Input
                  value={formData.numero_funcionario}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_funcionario: e.target.value })
                  }
                  placeholder="Ex: 12345"
                  className={formErrors.numero_funcionario ? 'border-destructive' : ''}
                />
                {formErrors.numero_funcionario && (
                  <p className="text-sm text-destructive">{formErrors.numero_funcionario}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) =>
                    setFormData({ ...formData, estado: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Nome Completo */}
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do funcionário"
                className={formErrors.nome ? 'border-destructive' : ''}
              />
              {formErrors.nome && (
                <p className="text-sm text-destructive">{formErrors.nome}</p>
              )}
            </div>

            {/* Row 3: Telefone + Data Nascimento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => {
                    // Only allow digits, max 9 characters
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setFormData({ ...formData, telefone: digits });
                  }}
                  placeholder="912345678"
                  inputMode="numeric"
                  maxLength={9}
                  className={formErrors.telefone ? 'border-destructive' : ''}
                />
                {formErrors.telefone && (
                  <p className="text-sm text-destructive">{formErrors.telefone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) =>
                    setFormData({ ...formData, data_nascimento: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Row 4: Categoria + Serviço */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ex: Técnico Superior"
                />
              </div>
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Input
                  value={formData.servico}
                  onChange={(e) => setFormData({ ...formData, servico: e.target.value })}
                  placeholder="Ex: Serviços Médicos"
                />
              </div>
            </div>

            {/* Row 7: Admissão + Último Exame */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Admissão</Label>
                <Input
                  type="date"
                  value={formData.data_admissao}
                  onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Último Exame</Label>
                <Input
                  type="date"
                  value={formData.ultimo_exame}
                  onChange={(e) => setFormData({ ...formData, ultimo_exame: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingFuncionario ? 'Guardar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar Funcionário"
        description={`Tem a certeza que deseja eliminar o funcionário "${deletingFuncionario?.nome}"? Esta ação não pode ser desfeita e irá remover todas as consultas MT associadas.`}
      />

      {/* Bulk Delete Dialog */}
      <DeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
        title="Eliminar Funcionários Selecionados"
        description={`Tem a certeza que deseja eliminar ${selectedIds.length} funcionário(s)? Esta ação não pode ser desfeita e irá remover todas as consultas MT associadas.`}
      />
    </div>
  );
}
