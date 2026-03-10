import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Search,
  FileDown,
  FileUp,
  Edit2,
  Loader2,
  CreditCard,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CartaoSaude, DocumentoTipo, EstadoEntrega } from '@/types/database';
import * as XLSX from 'xlsx';

// -------------------------------------------------------------------
// Form type — all new column names
// -------------------------------------------------------------------
type FormData = {
  nif: string;
  nome_completo: string;
  data_nascimento: string;
  tipo_documento: DocumentoTipo | '';
  numero_documento: string;
  validade_documento: string;
  morada: string;
  freguesia: string;
  email: string;
  telefone: string;
  estado_entrega: EstadoEntrega;
};

const initialFormData: FormData = {
  nif: '',
  nome_completo: '',
  data_nascimento: '',
  tipo_documento: '',
  numero_documento: '',
  validade_documento: '',
  morada: '',
  freguesia: '',
  email: '',
  telefone: '',
  estado_entrega: 'PENDENTE',
};

// -------------------------------------------------------------------
// Display helpers
// -------------------------------------------------------------------
const estadoEntregaLabelsMap: Record<EstadoEntrega, string> = {
  ENTREGUE: 'Entregue',
  NAO_ENTREGUE: 'Não Entregue',
  PENDENTE: 'Pendente',
  CANCELADO: 'Cancelado',
  AGUARDAR_VALIDACAO: 'Aguardar Validação',
};

const estadoEntregaColorsMap: Record<EstadoEntrega, string> = {
  ENTREGUE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  NAO_ENTREGUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  PENDENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  CANCELADO: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  AGUARDAR_VALIDACAO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const formatDate = (d: string | null) => {
  if (!d) return '-';
  try {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  } catch {
    return d;
  }
};

// -------------------------------------------------------------------
// Page component
// -------------------------------------------------------------------
export default function CartaoSaudePage() {
  const { canEdit, role } = useAuth();
  const canManageBulk = role === 'admin' || role === 'manager';
  const { isSuperAdmin } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [cartoes, setCartoes] = useState<CartaoSaude[]>([]);
  const [filteredCartoes, setFilteredCartoes] = useState<CartaoSaude[]>([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCartao, setEditingCartao] = useState<CartaoSaude | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete (single)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCartao, setDeletingCartao] = useState<CartaoSaude | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Delete (bulk)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Form
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ----------------------------------------------------------------
  // Server-side pagination state
  // ----------------------------------------------------------------
  const PAGE_SIZE = 50;
  const [currentPage, setCurrentPage] = useState(0);   // 0-indexed
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  const [estadoEntregaFilter, setEstadoEntregaFilter] = useState<string>(searchParams.get('filter') === 'validacao' ? 'AGUARDAR_VALIDACAO' : 'todos');
  const [sortBy, setSortBy] = useState<string>('numero_asc');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-fetch when page changes
  useEffect(() => {
    fetchPage(currentPage, searchTerm, estadoEntregaFilter, sortBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // When search/filter/sort changes: debounce 300ms then reset to page 0 and fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(0);
      fetchPage(0, searchTerm, estadoEntregaFilter, sortBy);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, estadoEntregaFilter, sortBy]);

  // ----------------------------------------------------------------
  // Server-side fetch: ilike search + filter + .range() pagination
  // ----------------------------------------------------------------
  const fetchPage = async (
    page: number,
    search: string,
    estadoFilter: string,
    sort: string = 'numero_asc',
  ) => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('cartao_saude')
      .select('*', { count: 'exact' })
      .range(from, to);

    // Server-side ilike search across 3 columns
    const s = search.trim();
    if (s) {
      query = query.or(
        `nome_completo.ilike.%${s}%,nif.ilike.%${s}%,numero_cartao.ilike.%${s}%`
      );
    }

    if (estadoFilter !== 'todos') {
      query = query.eq('estado_entrega', estadoFilter);
    }

    // Dynamic sort (server-side for name/recentes; client-side for numero to ensure numeric order)
    switch (sort) {
      case 'nome_asc':
        query = query.order('nome_completo', { ascending: true });
        break;
      case 'nome_desc':
        query = query.order('nome_completo', { ascending: false });
        break;
      case 'recentes':
        query = query.order('created_at', { ascending: false });
        break;
      // numero_asc / numero_desc: no DB order — sorted in JS below
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching cartoes:', error);
      toast.error('Erro ao carregar cartões: ' + error.message);
    } else {
      let fetchedData = (data ?? []) as unknown as CartaoSaude[];

      // Client-side numeric sort for numero_cartao (avoids lexicographic text ordering)
      if (sort === 'numero_asc' || sort === 'numero_desc') {
        fetchedData = [...fetchedData].sort((a, b) => {
          const numA = parseInt(a.numero_cartao ?? '0') || 0;
          const numB = parseInt(b.numero_cartao ?? '0') || 0;
          return sort === 'numero_asc' ? numA - numB : numB - numA;
        });
      }

      setCartoes(fetchedData);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  };

  /** Convenience: refresh current page after mutations */
  const refreshPage = () => fetchPage(currentPage, searchTerm, estadoEntregaFilter, sortBy);


  // ----------------------------------------------------------------
  // Modal helpers
  // ----------------------------------------------------------------
  const openCreateModal = () => {
    setEditingCartao(null);
    setFormData(initialFormData);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (cartao: CartaoSaude) => {
    setEditingCartao(cartao);
    setFormData({
      nif: cartao.nif,
      nome_completo: cartao.nome_completo,
      data_nascimento: cartao.data_nascimento || '',
      tipo_documento: cartao.tipo_documento || '',
      numero_documento: cartao.numero_documento || '',
      validade_documento: cartao.validade_documento || '',
      morada: cartao.morada || '',
      freguesia: cartao.freguesia || '',
      email: cartao.email || '',
      telefone: cartao.telefone || '',
      estado_entrega: cartao.estado_entrega || 'PENDENTE',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // ----------------------------------------------------------------
  // Validation
  // ----------------------------------------------------------------
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nif.trim()) {
      errors.nif = 'O NIF é obrigatório';
    } else if (!/^\d{9}$/.test(formData.nif.trim())) {
      errors.nif = 'O NIF deve ter exatamente 9 dígitos';
    }

    if (!formData.nome_completo.trim()) {
      errors.nome_completo = 'O nome completo é obrigatório';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ----------------------------------------------------------------
  // Save — INSERT never sends numero_cartao (DB generates it)
  // ----------------------------------------------------------------
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    // All new column names, no estado, no numero_cartao, no numero_cartao_int
    const payload: Record<string, unknown> = {
      nif: formData.nif.trim(),
      nome_completo: formData.nome_completo.trim(),
      data_nascimento: formData.data_nascimento || null,
      tipo_documento: formData.tipo_documento || null,
      numero_documento: formData.numero_documento.trim() || null,
      validade_documento: formData.validade_documento || null,
      morada: formData.morada.trim() || null,
      freguesia: formData.freguesia.trim() || null,
      email: formData.email.trim() || null,
      telefone: formData.telefone.trim() || null,
      estado_entrega: formData.estado_entrega,
    };

    console.log('[DEBUG] Guardar Cartão - Payload a enviar:', payload);

    if (editingCartao) {
      // On UPDATE, do NOT change the NIF (unique key)
      const { nif: _nif, ...updatePayload } = payload;
      const { error } = await supabase
        .from('cartao_saude')
        .update(updatePayload as any)
        .eq('id', editingCartao.id);

      if (error) {
        console.error('Error updating cartao:', error);
        toast.error('Erro ao atualizar cartão: ' + error.message);
      } else {
        toast.success('Cartão atualizado com sucesso');
        setModalOpen(false);
        setTimeout(() => refreshPage(), 100);
      }
    } else {
      // INSERT — numero_cartao is NOT included; the DB trigger generates it automatically
      const { error } = await supabase
        .from('cartao_saude')
        .insert([payload] as any);

      if (error) {
        console.error('Error creating cartao:', error);
        if (error.code === '23505') {
          toast.error('Já existe um cartão com este NIF');
        } else {
          toast.error('Erro ao criar cartão: ' + error.message);
        }
      } else {
        toast.success('Cartão de saúde criado com sucesso');
        setModalOpen(false);
        setTimeout(() => refreshPage(), 100);
      }
    }

    setSaving(false);
  };

  // ----------------------------------------------------------------
  // Delete
  // ----------------------------------------------------------------
  const openDeleteDialog = (cartao: CartaoSaude) => {
    setDeletingCartao(cartao);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCartao) return;

    setDeleting(true);
    const { error } = await supabase
      .from('cartao_saude')
      .delete()
      .eq('id', deletingCartao.id);

    if (error) {
      console.error('Error deleting cartao:', error);
      toast.error('Erro ao eliminar cartão: ' + error.message);
    } else {
      toast.success('Cartão eliminado com sucesso');
      setDeleteDialogOpen(false);
      setDeletingCartao(null);
      refreshPage();
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
      .from('cartao_saude')
      .delete()
      .in('id', selectedIds);

    if (error) {
      console.error('Bulk delete error:', error);
      toast.error('Erro ao eliminar os cartões: ' + error.message);
    } else {
      toast.success(`${selectedIds.length} cartão(ões) eliminado(s) com sucesso`);
      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      refreshPage();
    }
    setBulkDeleting(false);
  };

  // ----------------------------------------------------------------
  // Export — fetches ALL rows in batches of 1000 (bypasses Supabase limit)
  // ----------------------------------------------------------------
  const handleExport = async () => {
    try {
      console.log('A iniciar exportação...');
      const { data, error } = await supabase.from('cartao_saude').select('*');
      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }
      console.log('Dados recebidos:', data);
      // Cabeçalhos obrigatórios que têm de existir sempre
      const headers = ['Nº Cartão', 'Nome Completo', 'NIF', 'Telefone', 'Estado Entrega', 'Data Nascimento'];
      let dadosMapeados: any[] = [];
      // Se tivermos dados, mapeamos. Se não tivermos (array vazio), criamos uma linha vazia só para forçar os cabeçalhos.
      if (data && data.length > 0) {
        dadosMapeados = data.map(item => ({
          'Nº Cartão': item.numero_cartao || '',
          'Nome Completo': item.nome_completo || '',
          'NIF': item.nif || '',
          'Telefone': item.telefone || '',
          'Estado Entrega': item.estado_entrega || '',
          'Data Nascimento': item.data_nascimento || ''
        }));
      } else {
        dadosMapeados = [{
          'Nº Cartão': '', 'Nome Completo': '', 'NIF': '', 'Telefone': '', 'Estado Entrega': '', 'Data Nascimento': ''
        }];
        console.warn('Nenhum dado encontrado no Supabase. A gerar apenas o molde.');
      }
      const XLSX = await import('xlsx');
      // json_to_sheet com a opção header força a ordem e a existência das colunas
      const worksheet = XLSX.utils.json_to_sheet(dadosMapeados, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cartoes');
      XLSX.writeFile(workbook, 'cartoes_saude_molde.xlsx');
      console.log('Ficheiro Excel gerado com sucesso.');

    } catch (error) {
      console.error('Falha crítica ao exportar:', error);
    }
  };

  // ----------------------------------------------------------------
  // Import
  // ----------------------------------------------------------------
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    toast.loading('A importar dados...', { id: 'import-toast' });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        // 1. Normaliza os cabeçalhos (tudo minúsculo, sem espaços extra)
        const normalizeKeys = (obj: any) => {
          const newObj: any = {};
          Object.keys(obj).forEach(key => {
            newObj[key.trim().toLowerCase()] = obj[key];
          });
          return newObj;
        };

        // 2. Converte datas do Excel para o formato YYYY-MM-DD do Supabase (suporta anos a 2 dígitos)
        const parseExcelDate = (dateVal: any): string | null => {
          if (!dateVal) return null;
          // Número de série do Excel
          if (typeof dateVal === 'number') {
            const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
            return date.toISOString().split('T')[0];
          }
          // String DD/MM/YY ou DD/MM/YYYY
          if (typeof dateVal === 'string') {
            const cleanStr = dateVal.trim();
            const parts = cleanStr.split('/');
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              let year = parts[2];
              // Anos a 2 dígitos: >30 → 19xx, ≤30 → 20xx
              if (year.length === 2) {
                year = parseInt(year) > 30 ? `19${year}` : `20${year}`;
              }
              return `${year}-${month}-${day}`;
            }
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
          }
          return null;
        };

        // 3. Mapeamento robusto com chaves normalizadas + dedução de tipo_documento
        const formattedData = (jsonData as any[])
          .map((rawRow: any) => {
            const row = normalizeKeys(rawRow);

            // 1. Extrair o Número do Documento
            const rawNumDoc = row['numero documento'] || row['numero_documento'] || row['cc/b.i'] || row['cc/b.i.'] || null;
            const strNumDoc = rawNumDoc ? String(rawNumDoc).trim() : '';

            // 2. Deduzir o Tipo de Documento
            let tipoDocFinal: string | null = row['tipo de documento'] || row['tipo_documento'] || null;
            if (!tipoDocFinal && strNumDoc) {
              const strLower = strNumDoc.toLowerCase();
              if (strLower.includes('vitalicio') || strLower.includes('vitalício')) {
                tipoDocFinal = 'BI';
              } else if (/\d/.test(strNumDoc)) {
                tipoDocFinal = 'CC';
              }
            }

            return {
              numero_cartao: row['nº cartão'] || row['numero_cartao'] || null,
              nome_completo: row['nome completo'] || row['nome'] || null,
              nif: row['nif'] ? String(row['nif']).trim() : null,
              data_nascimento: parseExcelDate(row['data de nascimento'] || row['data nascimento'] || row['data_nascimento']),
              numero_documento: strNumDoc || null,
              validade_documento: parseExcelDate(row['data de validade'] || row['validade_documento'] || row['validade']),
              tipo_documento: tipoDocFinal,
              telefone: row['telefone'] ? String(row['telefone']).trim() : null,
              email: row['email'] || null,
              morada: row['morada'] || null,
              freguesia: row['freguesia'] || null,
              estado_entrega: (row['estado entrega'] || row['estado_entrega'] || 'PENDENTE') as EstadoEntrega,
            };
          })
          .filter((item: any) => item.nif && item.nome_completo);

        if (formattedData.length === 0) {
          toast.error('Sem dados válidos para importar. Verifique as colunas (NIF e Nome Completo são obrigatórios).', { id: 'import-toast' });
          return;
        }

        const { error } = await supabase
          .from('cartao_saude')
          .upsert(formattedData as any, { onConflict: 'nif' });

        if (error) throw error;

        toast.success(`Importação concluída: ${formattedData.length} registos processados`, { id: 'import-toast' });
        refreshPage();
      } catch (err: any) {
        console.error('Import error:', err);
        toast.error('Erro ao processar ficheiro: ' + (err.message || 'Erro desconhecido'), { id: 'import-toast' });
      }
    };
    reader.onerror = () => toast.error('Erro ao ler ficheiro', { id: 'import-toast' });
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  // ----------------------------------------------------------------
  // Table columns
  // ----------------------------------------------------------------
  const allCurrentPageSelected =
    cartoes.length > 0 && cartoes.every((c) => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      // deselect all on this page
      setSelectedIds((prev) => prev.filter((id) => !cartoes.some((c) => c.id === id)));
    } else {
      // add all on this page that aren't already selected
      setSelectedIds((prev) => [
        ...prev,
        ...cartoes.filter((c) => !prev.includes(c.id)).map((c) => c.id),
      ]);
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const baseColumns: Column<CartaoSaude>[] = [

    {
      key: 'numero_cartao',
      header: 'Nº Cartão',
      cell: (item) => (
        <span className="font-medium text-primary">{item.numero_cartao || '-'}</span>
      ),
    },
    {
      key: 'nome_completo',
      header: 'Nome Completo',
      cell: (item) => <span className="font-medium">{item.nome_completo}</span>,
    },
    {
      key: 'nif',
      header: 'NIF',
      cell: (item) => item.nif,
    },
    {
      key: 'data_nascimento',
      header: 'Data Nasc.',
      cell: (item) => formatDate(item.data_nascimento),
    },
    {
      key: 'tipo_documento',
      header: 'Doc. Tipo',
      cell: (item) => item.tipo_documento || '-',
    },
    {
      key: 'telefone',
      header: 'Telefone',
      cell: (item) => item.telefone || '-',
    },
    {
      key: 'estado_entrega',
      header: 'Estado Entrega',
      cell: (item) => {
        const estado = (item.estado_entrega || 'PENDENTE') as EstadoEntrega;
        return (
          <Badge className={estadoEntregaColorsMap[estado]}>
            {estadoEntregaLabelsMap[estado]}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (item) => (
        <div className="flex items-center gap-1">
          {canEdit && (
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
          {isSuperAdmin && (
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
      className: 'w-20',
    },
  ];
  const checkboxColumn: Column<CartaoSaude> = {
    key: 'select' as any,
    header: (
      <Checkbox
        checked={allCurrentPageSelected}
        onCheckedChange={toggleSelectAll}
        aria-label="Selecionar todos"
        onClick={(e) => e.stopPropagation()}
      />
    ) as any,
    cell: (item) => (
      <Checkbox
        checked={selectedIds.includes(item.id)}
        onCheckedChange={() => toggleSelectRow(item.id)}
        aria-label="Selecionar linha"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    className: 'w-10',
  };

  const columns = canManageBulk ? [checkboxColumn, ...baseColumns] : baseColumns;


  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <div className="page-enter flex flex-col h-full gap-3">
      <PageHeader
        title="Cartão de Saúde"
        description="Gestão de aderentes ao cartão de saúde"
      >
        {canEdit && (
          <>
            {canManageBulk && (
              <>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv, .xlsx"
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
              </>
            )}
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Cartão
            </Button>
          </>
        )}
      </PageHeader>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {(role === 'admin' || role === 'manager') && (
          <Button
            variant={estadoEntregaFilter === 'AGUARDAR_VALIDACAO' ? 'default' : 'outline'}
            onClick={() => setEstadoEntregaFilter(f => f === 'AGUARDAR_VALIDACAO' ? 'todos' : 'AGUARDAR_VALIDACAO')}
            className={estadoEntregaFilter === 'AGUARDAR_VALIDACAO' ? 'bg-blue-600 hover:bg-blue-700' : 'text-blue-600 border-blue-200 hover:bg-blue-50'}
          >
            Pedidos de Validação
          </Button>
        )}
        {/* Search — full width, prominent */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          {loading && searchTerm && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
          <Input
            placeholder="Pesquisar por NIF, número do cartão ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 h-10"
          />
        </div>
        {/* Estado entrega filter */}
        <Select value={estadoEntregaFilter} onValueChange={setEstadoEntregaFilter}>
          <SelectTrigger className="w-full sm:w-52 h-10">
            <SelectValue placeholder="Estado Entrega" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os estados</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
            <SelectItem value="ENTREGUE">Entregue</SelectItem>
            <SelectItem value="NAO_ENTREGUE">Não Entregue</SelectItem>
            <SelectItem value="CANCELADO">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        {/* Sort filter */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-52 h-10">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="numero_asc">Nº Cartão (Crescente)</SelectItem>
            <SelectItem value="numero_desc">Nº Cartão (Decrescente)</SelectItem>
            <SelectItem value="nome_asc">Nome (A-Z)</SelectItem>
            <SelectItem value="nome_desc">Nome (Z-A)</SelectItem>
            <SelectItem value="recentes">Mais Recentes</SelectItem>
          </SelectContent>
        </Select>
        {/* Bulk delete button — only visible when rows are selected */}
        {isSuperAdmin && selectedIds.length > 0 && (
          <Button
            variant="destructive"
            className="gap-2 shrink-0"
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            Eliminar Selecionados ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={cartoes} // Always displays the current exact 50 page
        loading={loading}
        emptyTitle="Sem cartões de saúde"
        emptyDescription={searchTerm || estadoEntregaFilter !== 'todos' ? 'Nenhum resultado para os filtros aplicados.' : 'Ainda não existem cartões de saúde registados.'}
        onRowClick={canEdit ? openEditModal : undefined}
      />

      {/* Pagination footer */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          {/* Info text */}
          <p className="text-sm text-muted-foreground">
            A mostrar{' '}
            <span className="font-medium text-foreground">
              {currentPage * PAGE_SIZE + 1}
            </span>
            {' '}a{' '}
            <span className="font-medium text-foreground">
              {Math.min((currentPage + 1) * PAGE_SIZE, totalCount)}
            </span>
            {' '}de{' '}
            <span className="font-medium text-foreground">{totalCount}</span>
            {' '}cartões
          </p>

          {/* Page controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0 || loading}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground px-1">
              Pág. {currentPage + 1} / {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={(currentPage + 1) * PAGE_SIZE >= totalCount || loading}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      <DeleteConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
        title="Eliminar cartões selecionados"
        description={`Tem a certeza que deseja eliminar ${selectedIds.length} cartão(ões) de saúde? Esta ação não pode ser desfeita.`}
      />

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {editingCartao ? 'Editar Cartão' : 'Novo Cartão de Saúde'}
            </DialogTitle>
            <DialogDescription>
              {editingCartao
                ? 'Atualize os dados do cartão de saúde'
                : 'Preencha os dados do novo aderente. O número do cartão é gerado automaticamente.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Show auto-generated numero_cartao when editing */}
            {editingCartao?.numero_cartao && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Nº Cartão:</span>
                <span className="font-semibold text-primary">{editingCartao.numero_cartao}</span>
                <span className="text-xs text-muted-foreground ml-auto">(gerado automaticamente)</span>
              </div>
            )}

            {/* Row 1: NIF + Estado Entrega */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NIF *</Label>
                <Input
                  value={formData.nif}
                  onChange={(e) =>
                    setFormData({ ...formData, nif: e.target.value.replace(/\D/g, '').slice(0, 9) })
                  }
                  placeholder="123456789"
                  disabled={!!editingCartao}
                  maxLength={9}
                  className={formErrors.nif ? 'border-destructive' : ''}
                />
                {formErrors.nif && (
                  <p className="text-sm text-destructive">{formErrors.nif}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Estado Entrega</Label>
                <Select
                  value={formData.estado_entrega}
                  onValueChange={(value: EstadoEntrega) =>
                    setFormData({ ...formData, estado_entrega: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    {role !== 'staff' && <SelectItem value="ENTREGUE">Entregue</SelectItem>}
                    <SelectItem value="AGUARDAR_VALIDACAO">Aguardar Validação</SelectItem>
                    <SelectItem value="NAO_ENTREGUE">Não Entregue</SelectItem>
                    <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Nome Completo */}
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={formData.nome_completo}
                onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                placeholder="Nome completo do aderente"
                disabled={!!editingCartao && role === 'staff'}
                className={formErrors.nome_completo ? 'border-destructive' : ''}
              />
              {formErrors.nome_completo && (
                <p className="text-sm text-destructive">{formErrors.nome_completo}</p>
              )}
            </div>

            {/* Row 3: Data Nascimento */}
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                disabled={!!editingCartao && role === 'staff'}
              />
            </div>

            {/* Row 4: Documento */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo Documento</Label>
                <Select
                  value={formData.tipo_documento}
                  onValueChange={(value: DocumentoTipo | '') =>
                    setFormData({ ...formData, tipo_documento: value, validade_documento: value === 'BI' ? '' : formData.validade_documento })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC">Cartão de Cidadão</SelectItem>
                    <SelectItem value="BI">Bilhete de Identidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Número Documento</Label>
                <Input
                  value={formData.numero_documento}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_documento: e.target.value.slice(0, 20) })
                  }
                  placeholder="Nº do documento"
                />
              </div>
              <div className="space-y-2">
                <Label>Validade Documento</Label>
                <Input
                  type="date"
                  value={formData.validade_documento}
                  onChange={(e) =>
                    setFormData({ ...formData, validade_documento: e.target.value })
                  }
                  disabled={formData.tipo_documento === 'BI'}
                />
              </div>
            </div>

            {/* Row 5: Morada + Freguesia */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Morada</Label>
                <Input
                  value={formData.morada}
                  onChange={(e) => setFormData({ ...formData, morada: e.target.value })}
                  placeholder="Rua, número, código postal"
                />
              </div>
              <div className="space-y-2">
                <Label>Freguesia</Label>
                <Input
                  value={formData.freguesia}
                  onChange={(e) => setFormData({ ...formData, freguesia: e.target.value })}
                  placeholder="Nome da freguesia"
                />
              </div>
            </div>

            {/* Row 6: Email + Telefone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className={formErrors.email ? 'border-destructive' : ''}
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive">{formErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, '').slice(0, 9) })
                  }
                  placeholder="912345678"
                  maxLength={9}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            {(role === 'admin' || role === 'manager') && editingCartao?.estado_entrega === 'AGUARDAR_VALIDACAO' && (
              <div className="flex items-center gap-2 mr-auto">
                <Button
                  type="button"
                  onClick={async () => {
                    setSaving(true);
                    const { error } = await supabase.from('cartao_saude').update({ estado_entrega: 'ENTREGUE' }).eq('id', editingCartao.id);
                    setSaving(false);
                    if (!error) { toast.success('Cartão validado e Entregue!'); setModalOpen(false); refreshPage(); }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Validar e Entregar
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    setSaving(true);
                    const { error } = await supabase.from('cartao_saude').update({ estado_entrega: 'PENDENTE' }).eq('id', editingCartao.id);
                    setSaving(false);
                    if (!error) { toast.info('Cartão devolvido para correção.'); setModalOpen(false); refreshPage(); }
                  }}
                  variant="outline"
                  className="text-orange-600 border-orange-200 hover:bg-orange-50 gap-2"
                >
                  <XCircle className="w-4 h-4" /> Devolver (Pendente)
                </Button>
              </div>
            )}

            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCartao ? 'Guardar' : 'Criar'}
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
        title="Eliminar Cartão de Saúde"
        description={`Tem a certeza que deseja eliminar o cartão de "${deletingCartao?.nome_completo}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
