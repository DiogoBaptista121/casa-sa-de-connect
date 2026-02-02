import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { DataTable, Column } from '@/components/ui/data-table';
import { EstadoBadge } from '@/components/ui/status-badge';
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
  FileUp, 
  Edit2, 
  Loader2,
  Users,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import type { FuncionarioMT, EstadoRegisto } from '@/types/database';
import * as XLSX from 'xlsx';

// Helper to calculate age from date of birth
const calculateAge = (dataNascimento: string | null): number | null => {
  if (!dataNascimento) return null;
  const today = new Date();
  const birthDate = new Date(dataNascimento);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
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
  
  // Form state - aligned with database columns
  const [formData, setFormData] = useState({
    numero_funcionario: '',
    nome_completo: '',
    telefone: '',
    data_nascimento: '',
    departamento: '',
    posicao: '',
    categoria: '',
    divisao: '',
    gabinetes: '',
    servicos: '',
    admissao: '',
    ultimo_exame: '',
    estado: 'ativo' as EstadoRegisto,
  });

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
          f.departamento?.toLowerCase().includes(term)
      );
    }

    if (estadoFilter !== 'todos') {
      filtered = filtered.filter((f) => f.estado === estadoFilter);
    }

    setFilteredFuncionarios(filtered);
  };

  const openCreateModal = () => {
    setEditingFuncionario(null);
    setFormData({
      numero_funcionario: '',
      nome_completo: '',
      telefone: '',
      data_nascimento: '',
      departamento: '',
      posicao: '',
      categoria: '',
      divisao: '',
      gabinetes: '',
      servicos: '',
      admissao: '',
      ultimo_exame: '',
      estado: 'ativo',
    });
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
      posicao: funcionario.posicao || '',
      categoria: funcionario.categoria || '',
      divisao: funcionario.divisao || '',
      gabinetes: funcionario.gabinetes || '',
      servicos: funcionario.servicos || '',
      admissao: funcionario.admissao || '',
      ultimo_exame: funcionario.ultimo_exame || '',
      estado: funcionario.estado,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.numero_funcionario.trim()) {
      toast.error('O número do funcionário é obrigatório');
      return;
    }
    if (!formData.nome_completo.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }

    setSaving(true);

    const payload = {
      numero_funcionario: formData.numero_funcionario.trim(),
      nome_completo: formData.nome_completo.trim(),
      telefone: formData.telefone.trim() || null,
      data_nascimento: formData.data_nascimento || null,
      departamento: formData.departamento.trim() || null,
      posicao: formData.posicao.trim() || null,
      categoria: formData.categoria.trim() || null,
      divisao: formData.divisao.trim() || null,
      gabinetes: formData.gabinetes.trim() || null,
      servicos: formData.servicos.trim() || null,
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
      'telefone': f.telefone || '',
      'data_nascimento': f.data_nascimento || '',
      'departamento': f.departamento || '',
      'posicao': f.posicao || '',
      'categoria': f.categoria || '',
      'divisao': f.divisao || '',
      'gabinetes': f.gabinetes || '',
      'servicos': f.servicos || '',
      'admissao': f.admissao || '',
      'ultimo_exame': f.ultimo_exame || '',
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
            numero_funcionario: row['numero_funcionario'] || row['Número Funcionário'],
            nome_completo: row['nome_completo'] || row['Nome Completo'] || row['Nome'],
            telefone: row['telefone'] || row['Telefone'] || null,
            data_nascimento: row['data_nascimento'] || row['Data Nascimento'] || null,
            departamento: row['departamento'] || row['Departamento'] || null,
            posicao: row['posicao'] || row['Posição'] || null,
            categoria: row['categoria'] || row['Categoria'] || null,
            divisao: row['divisao'] || row['Divisão'] || null,
            gabinetes: row['gabinetes'] || row['Gabinetes'] || null,
            servicos: row['servicos'] || row['Serviços'] || null,
            admissao: row['admissao'] || row['Admissão'] || null,
            ultimo_exame: row['ultimo_exame'] || row['Último Exame'] || null,
            estado: (row['estado'] || row['Estado'] || 'ativo') as EstadoRegisto,
          };

          if (!payload.numero_funcionario || !payload.nome_completo) {
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
      header: 'Nome',
      cell: (item) => <span className="font-medium">{item.nome_completo}</span>,
    },
    {
      key: 'departamento',
      header: 'Departamento',
      cell: (item) => item.departamento || '-',
    },
    {
      key: 'telefone',
      header: 'Telefone',
      cell: (item) => item.telefone || '-',
    },
    {
      key: 'idade',
      header: 'Idade',
      cell: (item) => {
        const age = calculateAge(item.data_nascimento);
        return age !== null ? `${age} anos` : '-';
      },
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: (item) => <EstadoBadge estado={item.estado} />,
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
                />
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
              />
            </div>

            {/* Row 3: Telefone + Data Nascimento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="912345678"
                />
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

            {/* Row 4: Departamento + Divisão */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  placeholder="Ex: Recursos Humanos"
                />
              </div>
              <div className="space-y-2">
                <Label>Divisão</Label>
                <Input
                  value={formData.divisao}
                  onChange={(e) => setFormData({ ...formData, divisao: e.target.value })}
                  placeholder="Ex: Norte"
                />
              </div>
            </div>

            {/* Row 5: Categoria + Posição */}
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
                <Label>Posição</Label>
                <Input
                  value={formData.posicao}
                  onChange={(e) => setFormData({ ...formData, posicao: e.target.value })}
                  placeholder="Ex: Operador"
                />
              </div>
            </div>

            {/* Row 6: Gabinetes + Serviços */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gabinetes</Label>
                <Input
                  value={formData.gabinetes}
                  onChange={(e) => setFormData({ ...formData, gabinetes: e.target.value })}
                  placeholder="Ex: Gabinete A"
                />
              </div>
              <div className="space-y-2">
                <Label>Serviços</Label>
                <Input
                  value={formData.servicos}
                  onChange={(e) => setFormData({ ...formData, servicos: e.target.value })}
                  placeholder="Ex: Manutenção"
                />
              </div>
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
