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
  
  // Form state
  const [formData, setFormData] = useState({
    numero_funcionario: '',
    nome: '',
    email: '',
    telefone: '',
    departamento: '',
    posicao: '',
    data_nascimento: '',
    estado: 'ativo' as EstadoRegisto,
    notas: '',
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
          f.nome.toLowerCase().includes(term) ||
          f.numero_funcionario.toLowerCase().includes(term) ||
          f.email?.toLowerCase().includes(term) ||
          f.departamento?.toLowerCase().includes(term)
      );
    }

    if (estadoFilter !== 'todos') {
      filtered = filtered.filter((f) => f.estado === estadoFilter);
    }

    setFilteredFuncionarios(filtered);
  };

  const generateNumeroFuncionario = () => {
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `MT-${num}`;
  };

  const openCreateModal = () => {
    setEditingFuncionario(null);
    setFormData({
      numero_funcionario: generateNumeroFuncionario(),
      nome: '',
      email: '',
      telefone: '',
      departamento: '',
      posicao: '',
      data_nascimento: '',
      estado: 'ativo',
      notas: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (funcionario: FuncionarioMT) => {
    setEditingFuncionario(funcionario);
    setFormData({
      numero_funcionario: funcionario.numero_funcionario,
      nome: funcionario.nome,
      email: funcionario.email || '',
      telefone: funcionario.telefone || '',
      departamento: funcionario.departamento || '',
      posicao: funcionario.posicao || '',
      data_nascimento: funcionario.data_nascimento || '',
      estado: funcionario.estado,
      notas: funcionario.notas || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }
    if (!formData.numero_funcionario.trim()) {
      toast.error('O número do funcionário é obrigatório');
      return;
    }

    setSaving(true);

    const payload = {
      numero_funcionario: formData.numero_funcionario.trim(),
      nome: formData.nome.trim(),
      email: formData.email.trim() || null,
      telefone: formData.telefone.trim() || null,
      departamento: formData.departamento.trim() || null,
      posicao: formData.posicao.trim() || null,
      data_nascimento: formData.data_nascimento || null,
      estado: formData.estado,
      notas: formData.notas.trim() || null,
    };

    if (editingFuncionario) {
      const { error } = await supabase
        .from('funcionarios_mt')
        .update(payload)
        .eq('id', editingFuncionario.id);

      if (error) {
        console.error('Error updating funcionario:', error);
        toast.error('Erro ao atualizar funcionário');
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
          toast.error('Já existe um funcionário com este número');
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
      'Número Funcionário': f.numero_funcionario,
      'Nome': f.nome,
      'Email': f.email || '',
      'Telefone': f.telefone || '',
      'Departamento': f.departamento || '',
      'Posição': f.posicao || '',
      'Data Nascimento': f.data_nascimento || '',
      'Estado': f.estado,
      'Notas': f.notas || '',
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
            numero_funcionario: row['Número Funcionário'] || row['numero_funcionario'],
            nome: row['Nome'] || row['nome'],
            email: row['Email'] || row['email'] || null,
            telefone: row['Telefone'] || row['telefone'] || null,
            departamento: row['Departamento'] || row['departamento'] || null,
            posicao: row['Posição'] || row['posicao'] || null,
            data_nascimento: row['Data Nascimento'] || row['data_nascimento'] || null,
            estado: (row['Estado'] || row['estado'] || 'ativo') as EstadoRegisto,
            notas: row['Notas'] || row['notas'] || null,
          };

          if (!payload.numero_funcionario || !payload.nome) {
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
      key: 'nome',
      header: 'Nome',
      cell: (item) => <span className="font-medium">{item.nome}</span>,
    },
    {
      key: 'departamento',
      header: 'Departamento',
      cell: (item) => item.departamento || '-',
    },
    {
      key: 'email',
      header: 'Email',
      cell: (item) => item.email || '-',
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
              placeholder="Pesquisar por nome, número, email..."
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
        <DialogContent className="max-w-lg">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número do Funcionário *</Label>
                <Input
                  value={formData.numero_funcionario}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_funcionario: e.target.value })
                  }
                  placeholder="MT-0000"
                  disabled={!!editingFuncionario}
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

            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do funcionário"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: e.target.value })
                  }
                  placeholder="912345678"
                />
              </div>
            </div>

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
                <Label>Posição</Label>
                <Input
                  value={formData.posicao}
                  onChange={(e) => setFormData({ ...formData, posicao: e.target.value })}
                  placeholder="Ex: Operador"
                />
              </div>
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

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Observações adicionais..."
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
    </div>
  );
}
