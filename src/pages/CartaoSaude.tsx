import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { EstadoBadge } from '@/components/ui/status-badge';
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
  Plus, 
  Search, 
  FileDown, 
  FileUp, 
  Edit2, 
  Loader2,
  CreditCard 
} from 'lucide-react';
import { toast } from 'sonner';
import type { CartaoSaude, EstadoRegisto } from '@/types/database';
import * as XLSX from 'xlsx';

export default function CartaoSaudePage() {
  const { canEdit } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cartoes, setCartoes] = useState<CartaoSaude[]>([]);
  const [filteredCartoes, setFilteredCartoes] = useState<CartaoSaude[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCartao, setEditingCartao] = useState<CartaoSaude | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    numero_cartao: '',
    nome: '',
    email: '',
    telefone: '',
    nif: '',
    data_nascimento: '',
    morada: '',
    estado: 'ativo' as EstadoRegisto,
    notas: '',
  });

  useEffect(() => {
    fetchCartoes();
  }, []);

  useEffect(() => {
    filterCartoes();
  }, [cartoes, searchTerm, estadoFilter]);

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
          c.nome.toLowerCase().includes(term) ||
          c.numero_cartao.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.nif?.toLowerCase().includes(term)
      );
    }

    if (estadoFilter !== 'todos') {
      filtered = filtered.filter((c) => c.estado === estadoFilter);
    }

    setFilteredCartoes(filtered);
  };

  const generateNumeroCartao = () => {
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `HC-${num}`;
  };

  const openCreateModal = () => {
    setEditingCartao(null);
    setFormData({
      numero_cartao: generateNumeroCartao(),
      nome: '',
      email: '',
      telefone: '',
      nif: '',
      data_nascimento: '',
      morada: '',
      estado: 'ativo',
      notas: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (cartao: CartaoSaude) => {
    setEditingCartao(cartao);
    setFormData({
      numero_cartao: cartao.numero_cartao,
      nome: cartao.nome,
      email: cartao.email || '',
      telefone: cartao.telefone || '',
      nif: cartao.nif || '',
      data_nascimento: cartao.data_nascimento || '',
      morada: cartao.morada || '',
      estado: cartao.estado,
      notas: cartao.notas || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }
    if (!formData.numero_cartao.trim()) {
      toast.error('O número do cartão é obrigatório');
      return;
    }

    setSaving(true);

    const payload = {
      numero_cartao: formData.numero_cartao.trim(),
      nome: formData.nome.trim(),
      email: formData.email.trim() || null,
      telefone: formData.telefone.trim() || null,
      nif: formData.nif.trim() || null,
      data_nascimento: formData.data_nascimento || null,
      morada: formData.morada.trim() || null,
      estado: formData.estado,
      notas: formData.notas.trim() || null,
    };

    if (editingCartao) {
      const { error } = await supabase
        .from('cartao_saude')
        .update(payload)
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
          toast.error('Já existe um cartão com este número');
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

  const handleExport = () => {
    const exportData = filteredCartoes.map((c) => ({
      'Número Cartão': c.numero_cartao,
      'Nome': c.nome,
      'Email': c.email || '',
      'Telefone': c.telefone || '',
      'NIF': c.nif || '',
      'Data Nascimento': c.data_nascimento || '',
      'Morada': c.morada || '',
      'Estado': c.estado,
      'Notas': c.notas || '',
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

        for (const row of jsonData as any[]) {
          const payload = {
            numero_cartao: row['Número Cartão'] || row['numero_cartao'],
            nome: row['Nome'] || row['nome'],
            email: row['Email'] || row['email'] || null,
            telefone: row['Telefone'] || row['telefone'] || null,
            nif: row['NIF'] || row['nif'] || null,
            data_nascimento: row['Data Nascimento'] || row['data_nascimento'] || null,
            morada: row['Morada'] || row['morada'] || null,
            estado: (row['Estado'] || row['estado'] || 'ativo') as EstadoRegisto,
            notas: row['Notas'] || row['notas'] || null,
          };

          if (!payload.numero_cartao || !payload.nome) {
            errors++;
            continue;
          }

          const { data: existing } = await supabase
            .from('cartao_saude')
            .select('id')
            .eq('numero_cartao', payload.numero_cartao)
            .single();

          if (existing) {
            const { error } = await supabase
              .from('cartao_saude')
              .update(payload)
              .eq('id', existing.id);
            if (!error) updated++;
            else errors++;
          } else {
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
        <span className="font-medium text-primary">{item.numero_cartao}</span>
      ),
    },
    {
      key: 'nome',
      header: 'Nome',
      cell: (item) => <span className="font-medium">{item.nome}</span>,
    },
    {
      key: 'telefone',
      header: 'Telefone',
      cell: (item) => item.telefone || '-',
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
            placeholder="Pesquisar por nome, número, email ou NIF..."
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
        <DialogContent className="max-w-lg">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número do Cartão *</Label>
                <Input
                  value={formData.numero_cartao}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_cartao: e.target.value })
                  }
                  placeholder="HC-0000"
                  disabled={!!editingCartao}
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
                placeholder="Nome do aderente"
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
                <Label>NIF</Label>
                <Input
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                  placeholder="123456789"
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

            <div className="space-y-2">
              <Label>Morada</Label>
              <Input
                value={formData.morada}
                onChange={(e) => setFormData({ ...formData, morada: e.target.value })}
                placeholder="Rua, número, código postal, cidade"
              />
            </div>

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
    </div>
  );
}
