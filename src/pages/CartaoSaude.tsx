import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/use-super-admin';
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
import { 
  Plus, 
  Search, 
  FileDown, 
  FileUp, 
  Edit2, 
  Loader2,
  CreditCard,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import type { CartaoSaude, DocumentoTipo, EstadoEntrega, estadoEntregaLabels, estadoEntregaColors } from '@/types/database';
import * as XLSX from 'xlsx';

type FormData = {
  nome_completo: string;
  data_nascimento: string;
  nif: string;
  documento_tipo: DocumentoTipo | '';
  documento_numero: string;
  documento_validade: string;
  morada: string;
  freguesia: string;
  email: string;
  telefone: string;
  estado_entrega: EstadoEntrega;
};

const initialFormData: FormData = {
  nome_completo: '',
  data_nascimento: '',
  nif: '',
  documento_tipo: '',
  documento_numero: '',
  documento_validade: '',
  morada: '',
  freguesia: '',
  email: '',
  telefone: '',
  estado_entrega: 'PENDENTE',
};

const estadoEntregaLabelsMap: Record<EstadoEntrega, string> = {
  ENTREGUE: 'Entregue',
  NAO_ENTREGUE: 'Não Entregue',
  PENDENTE: 'Pendente',
  CANCELADO: 'Cancelado',
};

const estadoEntregaColorsMap: Record<EstadoEntrega, string> = {
  ENTREGUE: 'bg-green-100 text-green-800',
  NAO_ENTREGUE: 'bg-red-100 text-red-800',
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  CANCELADO: 'bg-gray-100 text-gray-800',
};

export default function CartaoSaudePage() {
  const { canEdit } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [cartoes, setCartoes] = useState<CartaoSaude[]>([]);
  const [filteredCartoes, setFilteredCartoes] = useState<CartaoSaude[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoEntregaFilter, setEstadoEntregaFilter] = useState<string>('todos');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCartao, setEditingCartao] = useState<CartaoSaude | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCartao, setDeletingCartao] = useState<CartaoSaude | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    fetchCartoes();
  }, []);

  useEffect(() => {
    filterCartoes();
  }, [cartoes, searchTerm, estadoEntregaFilter]);

  const fetchCartoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cartao_saude')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cartoes:', error);
      toast.error('Erro ao carregar cartões de saúde');
    } else {
      setCartoes(data as CartaoSaude[]);
    }
    setLoading(false);
  };

  const filterCartoes = () => {
    let filtered = [...cartoes];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.nome_completo.toLowerCase().includes(term) ||
          c.numero_cartao?.toLowerCase().includes(term) ||
          c.nif?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.telefone?.toLowerCase().includes(term)
      );
    }

    if (estadoEntregaFilter !== 'todos') {
      filtered = filtered.filter((c) => c.estado_entrega === estadoEntregaFilter);
    }

    setFilteredCartoes(filtered);
  };

  const openCreateModal = () => {
    setEditingCartao(null);
    setFormData(initialFormData);
    setModalOpen(true);
  };

  const openEditModal = (cartao: CartaoSaude) => {
    setEditingCartao(cartao);
    setFormData({
      nome_completo: cartao.nome_completo,
      data_nascimento: cartao.data_nascimento || '',
      nif: cartao.nif,
      documento_tipo: cartao.documento_tipo || '',
      documento_numero: cartao.documento_numero?.toString() || '',
      documento_validade: cartao.documento_validade || '',
      morada: cartao.morada || '',
      freguesia: cartao.freguesia || '',
      email: cartao.email || '',
      telefone: cartao.telefone || '',
      estado_entrega: cartao.estado_entrega || 'PENDENTE',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome_completo.trim()) {
      toast.error('O nome completo é obrigatório');
      return;
    }
    if (!formData.nif.trim()) {
      toast.error('O NIF é obrigatório');
      return;
    }
    if (formData.nif.length !== 9 || !/^\d+$/.test(formData.nif)) {
      toast.error('O NIF deve ter exatamente 9 dígitos');
      return;
    }

    setSaving(true);

    const payload = {
      nome_completo: formData.nome_completo.trim(),
      data_nascimento: formData.data_nascimento || null,
      nif: formData.nif.trim(),
      documento_tipo: formData.documento_tipo || null,
      documento_numero: formData.documento_numero ? parseInt(formData.documento_numero) : null,
      documento_validade: formData.documento_validade || null,
      morada: formData.morada.trim() || null,
      freguesia: formData.freguesia.trim() || null,
      email: formData.email.trim() || null,
      telefone: formData.telefone.trim() || null,
      estado_entrega: formData.estado_entrega,
    };

    if (editingCartao) {
      // On update, don't change NIF
      const { nif, ...updatePayload } = payload;
      const { error } = await supabase
        .from('cartao_saude')
        .update(updatePayload)
        .eq('id', editingCartao.id);

      if (error) {
        console.error('Error updating cartao:', error);
        toast.error('Erro ao atualizar cartão');
      } else {
        toast.success('Cartão atualizado com sucesso');
        setModalOpen(false);
        fetchCartoes();
      }
    } else {
      const { error } = await supabase.from('cartao_saude').insert([payload]);

      if (error) {
        console.error('Error creating cartao:', error);
        if (error.code === '23505') {
          toast.error('Já existe um cartão com este NIF');
        } else {
          toast.error('Erro ao criar cartão');
        }
      } else {
        toast.success('Cartão criado com sucesso');
        setModalOpen(false);
        fetchCartoes();
      }
    }

    setSaving(false);
  };

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
      toast.error('Erro ao eliminar cartão');
    } else {
      toast.success('Cartão eliminado com sucesso');
      setDeleteDialogOpen(false);
      setDeletingCartao(null);
      fetchCartoes();
    }
    setDeleting(false);
  };

  const handleExport = () => {
    const exportData = filteredCartoes.map((c) => ({
      'numero_cartao': c.numero_cartao || '',
      'nome_completo': c.nome_completo,
      'data_nascimento': c.data_nascimento || '',
      'nif': c.nif,
      'documento_tipo': c.documento_tipo || '',
      'documento_numero': c.documento_numero || '',
      'documento_validade': c.documento_validade || '',
      'morada': c.morada || '',
      'freguesia': c.freguesia || '',
      'email': c.email || '',
      'telefone': c.telefone || '',
      'estado_entrega': c.estado_entrega || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cartões de Saúde');
    XLSX.writeFile(wb, `cartoes_saude_${new Date().toISOString().split('T')[0]}.xlsx`);
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

        for (const row of jsonData as Record<string, unknown>[]) {
          const nif = (row['nif'] || '').toString().trim();
          const nome_completo = (row['nome_completo'] || '').toString().trim();
          
          // NIF and nome_completo are required
          if (!nif || !nome_completo) {
            errors++;
            continue;
          }

          const payload = {
            nome_completo,
            data_nascimento: row['data_nascimento'] ? String(row['data_nascimento']) : null,
            nif,
            documento_tipo: row['documento_tipo'] ? String(row['documento_tipo']) as DocumentoTipo : null,
            documento_numero: row['documento_numero'] ? parseInt(String(row['documento_numero'])) : null,
            documento_validade: row['documento_validade'] ? String(row['documento_validade']) : null,
            morada: row['morada'] ? String(row['morada']) : null,
            freguesia: row['freguesia'] ? String(row['freguesia']) : null,
            email: row['email'] ? String(row['email']) : null,
            telefone: row['telefone'] ? String(row['telefone']) : null,
            estado_entrega: (row['estado_entrega'] ? String(row['estado_entrega']) : 'PENDENTE') as EstadoEntrega,
          };

          // Check if record exists by NIF (unique identifier)
          const { data: existing } = await supabase
            .from('cartao_saude')
            .select('id')
            .eq('nif', nif)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase
              .from('cartao_saude')
              .update(payload)
              .eq('id', existing.id);
            if (!error) updated++;
            else errors++;
          } else {
            // Insert without numero_cartao - it will be auto-generated
            const { error } = await supabase.from('cartao_saude').insert([payload]);
            if (!error) imported++;
            else errors++;
          }
        }

        toast.success(`Importação concluída: ${imported} criados, ${updated} atualizados, ${errors} erros`);
        fetchCartoes();
      } catch (err) {
        console.error('Import error:', err);
        toast.error('Erro ao processar ficheiro');
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const columns: Column<CartaoSaude>[] = [
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
      key: 'documento_tipo',
      header: 'Doc. Tipo',
      cell: (item) => item.documento_tipo || '-',
    },
    {
      key: 'documento_numero',
      header: 'Doc. Número',
      cell: (item) => item.documento_numero || '-',
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
        const estado = item.estado_entrega || 'PENDENTE';
        return (
          <Badge className={estadoEntregaColorsMap[estado as EstadoEntrega]}>
            {estadoEntregaLabelsMap[estado as EstadoEntrega]}
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

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Cartão de Saúde"
        description="Gestão de aderentes ao cartão de saúde"
      >
        {canEdit && (
          <>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls"
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
              Novo Cartão
            </Button>
          </>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, número, NIF, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={estadoEntregaFilter} onValueChange={setEstadoEntregaFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Estado Entrega" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
            <SelectItem value="ENTREGUE">Entregue</SelectItem>
            <SelectItem value="NAO_ENTREGUE">Não Entregue</SelectItem>
            <SelectItem value="CANCELADO">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredCartoes}
        loading={loading}
        emptyTitle="Sem cartões de saúde"
        emptyDescription="Ainda não existem cartões de saúde registados."
        onRowClick={canEdit ? openEditModal : undefined}
      />

      {/* Modal */}
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
                : 'Preencha os dados do novo aderente'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {editingCartao && editingCartao.numero_cartao && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground">Nº Cartão:</span>
                <span className="font-medium text-primary">{editingCartao.numero_cartao}</span>
              </div>
            )}
            
            {/* Row 1: NIF + Estado Entrega */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NIF *</Label>
                <Input
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  placeholder="123456789"
                  disabled={!!editingCartao}
                  maxLength={9}
                />
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
                    <SelectItem value="ENTREGUE">Entregue</SelectItem>
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
              />
            </div>

            {/* Row 3: Data Nascimento */}
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
              />
            </div>

            {/* Row 4: Documento */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo Documento</Label>
                <Select
                  value={formData.documento_tipo}
                  onValueChange={(value: DocumentoTipo | '') =>
                    setFormData({ ...formData, documento_tipo: value })
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
                  value={formData.documento_numero}
                  onChange={(e) => setFormData({ ...formData, documento_numero: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  placeholder="123456789"
                  maxLength={9}
                />
              </div>
              <div className="space-y-2">
                <Label>Validade Documento</Label>
                <Input
                  type="date"
                  value={formData.documento_validade}
                  onChange={(e) => setFormData({ ...formData, documento_validade: e.target.value })}
                  disabled={formData.documento_tipo === 'BI'}
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
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  placeholder="912345678"
                  maxLength={9}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                'Guardar'
              )}
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
        title="Eliminar Cartão de Saúde"
        description={`Tem a certeza que deseja eliminar o cartão "${deletingCartao?.nome_completo}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
