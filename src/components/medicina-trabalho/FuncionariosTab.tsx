import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { DataTable, Column } from '@/components/ui/data-table';
import { EstadoBadge } from '@/components/ui/status-badge';
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
import type { FuncionarioMT, EstadoRegisto } from '@/types/database';
import {
  categoriaOptions,
  divisaoOptions,
  departamentoOptions,
  gabinetesOptions,
  servicosOptions,
} from '@/types/database';
import * as XLSX from 'xlsx';

// Helper to format date for display
const formatDate = (date: string | null): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-PT');
};

export function FuncionariosTab() {
  const { canEdit } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [funcionarios, setFuncionarios] = useState<FuncionarioMT[]>([]);
  const [filteredFuncionarios, setFilteredFuncionarios] = useState<FuncionarioMT[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<FuncionarioMT | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFuncionario, setDeletingFuncionario] = useState<FuncionarioMT | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Form state - aligned with database columns (no posicao)
  const [formData, setFormData] = useState({
    numero_funcionario: '',
    nome_completo: '',
    telefone: '',
    data_nascimento: '',
    departamento: '',
    categoria: '',
    divisao: '',
    gabinetes: '',
    servicos: '',
    admissao: '',
    ultimo_exame: '',
    estado: 'ativo' as EstadoRegisto,
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchFuncionarios();
  }, []);

  useEffect(() => {
    filterFuncionarios();
  }, [funcionarios, searchTerm, estadoFilter]);

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
      setFuncionarios(data as FuncionarioMT[]);
    }
    setLoading(false);
  };

  const filterFuncionarios = () => {
    let filtered = [...funcionarios];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.nome_completo.toLowerCase().includes(term) ||
          f.numero_funcionario.toLowerCase().includes(term) ||
          f.telefone?.toLowerCase().includes(term) ||
          f.departamento?.toLowerCase().includes(term) ||
          f.categoria?.toLowerCase().includes(term) ||
          f.divisao?.toLowerCase().includes(term)
      );
    }

    if (estadoFilter !== 'todos') {
      filtered = filtered.filter((f) => f.estado === estadoFilter);
    }

    setFilteredFuncionarios(filtered);
  };

  const resetForm = () => {
    setFormData({
      numero_funcionario: '',
      nome_completo: '',
      telefone: '',
      data_nascimento: '',
      departamento: '',
      categoria: '',
      divisao: '',
      gabinetes: '',
      servicos: '',
      admissao: '',
      ultimo_exame: '',
      estado: 'ativo',
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
      nome_completo: funcionario.nome_completo,
      telefone: funcionario.telefone || '',
      data_nascimento: funcionario.data_nascimento || '',
      departamento: funcionario.departamento || '',
      categoria: funcionario.categoria || '',
      divisao: funcionario.divisao || '',
      gabinetes: funcionario.gabinetes || '',
      servicos: funcionario.servicos || '',
      admissao: funcionario.admissao || '',
      ultimo_exame: funcionario.ultimo_exame || '',
      estado: funcionario.estado,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate numero_funcionario - required and numeric only
    if (!formData.numero_funcionario.trim()) {
      errors.numero_funcionario = 'Nº de Funcionário é obrigatório';
    } else if (!/^\d+$/.test(formData.numero_funcionario.trim())) {
      errors.numero_funcionario = 'Nº de Funcionário deve conter apenas números';
    }

    // Validate nome_completo - required
    if (!formData.nome_completo.trim()) {
      errors.nome_completo = 'Nome Completo é obrigatório';
    }

    // Validate telefone - if provided, must be 9 digits
    if (formData.telefone && !/^\d{9}$/.test(formData.telefone.trim())) {
      errors.telefone = 'Telefone deve ter 9 dígitos';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    const payload = {
      numero_funcionario: formData.numero_funcionario.trim(),
      nome_completo: formData.nome_completo.trim(),
      telefone: formData.telefone.trim() || null,
      data_nascimento: formData.data_nascimento || null,
      departamento: formData.departamento || null,
      categoria: formData.categoria || null,
      divisao: formData.divisao || null,
      gabinetes: formData.gabinetes || null,
      servicos: formData.servicos || null,
      admissao: formData.admissao || null,
      ultimo_exame: formData.ultimo_exame || null,
      estado: formData.estado,
    };

    if (editingFuncionario) {
      const { error } = await supabase
        .from('funcionarios_mt')
        .update(payload)
        .eq('id', editingFuncionario.id);

      if (error) {
        console.error('Error updating funcionario:', error);
        if (error.code === '23505') {
          toast.error('Já existe um funcionário com este Nº');
        } else if (error.code === '23514') {
          toast.error('Valor inválido. Selecione uma opção da lista.');
        } else {
          toast.error('Erro ao atualizar funcionário');
        }
      } else {
        toast.success('Funcionário atualizado com sucesso');
        setModalOpen(false);
        fetchFuncionarios();
      }
    } else {
      const { error } = await supabase.from('funcionarios_mt').insert([payload]);

      if (error) {
        console.error('Error creating funcionario:', error);
        if (error.code === '23505') {
          toast.error('Já existe um funcionário com este Nº');
        } else if (error.code === '23514') {
          toast.error('Valor inválido. Selecione uma opção da lista.');
        } else {
          toast.error('Erro ao criar funcionário');
        }
      } else {
        toast.success('Funcionário criado com sucesso');
        setModalOpen(false);
        fetchFuncionarios();
      }
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

  const handleExport = () => {
    const exportData = filteredFuncionarios.map((f) => ({
      'numero_funcionario': f.numero_funcionario,
      'nome_completo': f.nome_completo,
      'categoria': f.categoria || '',
      'divisao': f.divisao || '',
      'departamento': f.departamento || '',
      'gabinetes': f.gabinetes || '',
      'servicos': f.servicos || '',
      'admissao': f.admissao || '',
      'ultimo_exame': f.ultimo_exame || '',
      'data_nascimento': f.data_nascimento || '',
      'telefone': f.telefone || '',
      'estado': f.estado,
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

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let imported = 0;
        let updated = 0;
        let errors = 0;

        for (const row of jsonData as any[]) {
          const payload = {
            numero_funcionario: String(row['numero_funcionario'] || row['Número Funcionário'] || ''),
            nome_completo: row['nome_completo'] || row['Nome Completo'] || row['Nome'] || '',
            categoria: row['categoria'] || row['Categoria'] || null,
            divisao: row['divisao'] || row['Divisão'] || null,
            departamento: row['departamento'] || row['Departamento'] || null,
            gabinetes: row['gabinetes'] || row['Gabinetes'] || null,
            servicos: row['servicos'] || row['Serviços'] || null,
            admissao: row['admissao'] || row['Admissão'] || null,
            ultimo_exame: row['ultimo_exame'] || row['Último Exame'] || null,
            data_nascimento: row['data_nascimento'] || row['Data Nascimento'] || null,
            telefone: row['telefone'] || row['Telefone'] || null,
            estado: (row['estado'] || row['Estado'] || 'ativo') as EstadoRegisto,
          };

          // Validate required fields
          if (!payload.numero_funcionario || !payload.nome_completo) {
            errors++;
            continue;
          }

          // Validate numero_funcionario is numeric
          if (!/^\d+$/.test(payload.numero_funcionario)) {
            errors++;
            continue;
          }

          const { data: existing } = await supabase
            .from('funcionarios_mt')
            .select('id')
            .eq('numero_funcionario', payload.numero_funcionario)
            .single();

          if (existing) {
            const { error } = await supabase
              .from('funcionarios_mt')
              .update(payload)
              .eq('id', existing.id);
            if (!error) updated++;
            else errors++;
          } else {
            const { error } = await supabase.from('funcionarios_mt').insert([payload]);
            if (!error) imported++;
            else errors++;
          }
        }

        toast.success(`Importação concluída: ${imported} criados, ${updated} atualizados, ${errors} erros`);
        fetchFuncionarios();
      } catch (err) {
        console.error('Import error:', err);
        toast.error('Erro ao processar ficheiro');
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const columns: Column<FuncionarioMT>[] = [
    {
      key: 'numero_funcionario',
      header: 'Nº Funcionário',
      cell: (item) => (
        <span className="font-medium text-primary">{item.numero_funcionario}</span>
      ),
    },
    {
      key: 'nome_completo',
      header: 'Nome Completo',
      cell: (item) => <span className="font-medium">{item.nome_completo}</span>,
    },
    {
      key: 'categoria',
      header: 'Categoria',
      cell: (item) => item.categoria || '-',
    },
    {
      key: 'divisao',
      header: 'Divisão',
      cell: (item) => item.divisao || '-',
    },
    {
      key: 'departamento',
      header: 'Departamento',
      cell: (item) => item.departamento || '-',
    },
    {
      key: 'gabinetes',
      header: 'Gabinetes',
      cell: (item) => item.gabinetes || '-',
    },
    {
      key: 'servicos',
      header: 'Serviços',
      cell: (item) => item.servicos || '-',
    },
    {
      key: 'admissao',
      header: 'Admissão',
      cell: (item) => formatDate(item.admissao),
    },
    {
      key: 'ultimo_exame',
      header: 'Último Exame',
      cell: (item) => formatDate(item.ultimo_exame),
    },
    {
      key: 'telefone',
      header: 'Telefone',
      cell: (item) => item.telefone || '-',
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

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, número, telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
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
              Novo Funcionário
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredFuncionarios}
        loading={loading}
        emptyTitle="Sem funcionários"
        emptyDescription="Ainda não existem funcionários registados."
        onRowClick={canEdit ? openEditModal : undefined}
      />

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
                  onValueChange={(value: EstadoRegisto) =>
                    setFormData({ ...formData, estado: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
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
                placeholder="Nome do funcionário"
                className={formErrors.nome_completo ? 'border-destructive' : ''}
              />
              {formErrors.nome_completo && (
                <p className="text-sm text-destructive">{formErrors.nome_completo}</p>
              )}
            </div>

            {/* Row 3: Telefone + Data Nascimento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="912345678"
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

            {/* Row 4: Categoria + Divisão */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriaOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Divisão</Label>
                <Select
                  value={formData.divisao}
                  onValueChange={(value) => setFormData({ ...formData, divisao: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {divisaoOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 5: Departamento + Gabinetes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select
                  value={formData.departamento}
                  onValueChange={(value) => setFormData({ ...formData, departamento: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentoOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gabinetes</Label>
                <Select
                  value={formData.gabinetes}
                  onValueChange={(value) => setFormData({ ...formData, gabinetes: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {gabinetesOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 6: Serviços */}
            <div className="space-y-2">
              <Label>Serviços</Label>
              <Select
                value={formData.servicos}
                onValueChange={(value) => setFormData({ ...formData, servicos: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {servicosOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 7: Admissão + Último Exame */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Admissão</Label>
                <Input
                  type="date"
                  value={formData.admissao}
                  onChange={(e) => setFormData({ ...formData, admissao: e.target.value })}
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
        description={`Tem a certeza que deseja eliminar o funcionário "${deletingFuncionario?.nome_completo}"? Esta ação não pode ser desfeita e irá remover todas as consultas MT associadas.`}
      />
    </div>
  );
}
