import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge, OrigemBadge } from '@/components/ui/status-badge';
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
  Edit2, 
  Loader2,
  Calendar,
  Check,
  ChevronsUpDown,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Consulta, CartaoSaude, Servico, ConsultaStatus, ConsultaOrigem } from '@/types/database';
import * as XLSX from 'xlsx';

export default function ConsultasPage() {
  const { canEdit, user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [cartoes, setCartoes] = useState<CartaoSaude[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [origemFilter, setOrigemFilter] = useState<string>('todos');
  const [servicoFilter, setServicoFilter] = useState<string>('todos');
  const [dataFilter, setDataFilter] = useState<string>('');
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConsulta, setEditingConsulta] = useState<Consulta | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConsulta, setDeletingConsulta] = useState<Consulta | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Combobox
  const [pacienteOpen, setPacienteOpen] = useState(false);
  const [servicoOpen, setServicoOpen] = useState(false);
  
  // Form
  const [formData, setFormData] = useState({
    cartao_saude_id: '',
    servico_id: '',
    origem: 'casa_saude' as ConsultaOrigem,
    data: '',
    hora: '',
    status: 'agendada' as ConsultaStatus,
    notas: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [consultasRes, cartoesRes, servicosRes] = await Promise.all([
      supabase
        .from('consultas')
        .select(`
          *,
          cartao_saude:cartao_saude_id (id, nome, numero_cartao),
          servico:servico_id (id, nome, cor)
        `)
        .order('data', { ascending: false })
        .order('hora', { ascending: true }),
      supabase
        .from('cartao_saude')
        .select('*')
        .eq('estado', 'ativo')
        .order('nome'),
      supabase
        .from('servicos')
        .select('*')
        .eq('ativo', true)
        .order('nome'),
    ]);

    if (consultasRes.error) {
      console.error('Error fetching consultas:', consultasRes.error);
      toast.error('Erro ao carregar consultas');
    } else {
      setConsultas(consultasRes.data as unknown as Consulta[]);
    }

    if (cartoesRes.data) setCartoes(cartoesRes.data as CartaoSaude[]);
    if (servicosRes.data) setServicos(servicosRes.data as Servico[]);
    
    setLoading(false);
  };

  const filteredConsultas = consultas.filter((c) => {
    const cartao = c.cartao_saude as any;
    const servico = c.servico as any;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!cartao?.nome?.toLowerCase().includes(term) &&
          !cartao?.numero_cartao?.toLowerCase().includes(term)) {
        return false;
      }
    }
    
    if (statusFilter !== 'todos' && c.status !== statusFilter) return false;
    if (origemFilter !== 'todos' && c.origem !== origemFilter) return false;
    if (servicoFilter !== 'todos' && c.servico_id !== servicoFilter) return false;
    if (dataFilter && c.data !== dataFilter) return false;
    
    return true;
  });

  const openCreateModal = () => {
    setEditingConsulta(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      cartao_saude_id: '',
      servico_id: '',
      origem: 'casa_saude',
      data: today,
      hora: '09:00',
      status: 'agendada',
      notas: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (consulta: Consulta) => {
    setEditingConsulta(consulta);
    setFormData({
      cartao_saude_id: consulta.cartao_saude_id,
      servico_id: consulta.servico_id,
      origem: consulta.origem,
      data: consulta.data,
      hora: consulta.hora.substring(0, 5),
      status: consulta.status,
      notas: consulta.notas || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.cartao_saude_id) {
      toast.error('Selecione um paciente');
      return;
    }
    if (!formData.servico_id) {
      toast.error('Selecione um serviço');
      return;
    }
    if (!formData.data || !formData.hora) {
      toast.error('Preencha a data e hora');
      return;
    }

    setSaving(true);

    const payload = {
      cartao_saude_id: formData.cartao_saude_id,
      servico_id: formData.servico_id,
      origem: formData.origem,
      data: formData.data,
      hora: formData.hora,
      status: formData.status,
      notas: formData.notas.trim() || null,
      created_by: user?.id,
    };

    if (editingConsulta) {
      const { error } = await supabase
        .from('consultas')
        .update(payload)
        .eq('id', editingConsulta.id);

      if (error) {
        console.error('Error updating consulta:', error);
        toast.error('Erro ao atualizar consulta');
      } else {
        toast.success('Consulta atualizada com sucesso');
        setModalOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('consultas').insert([payload]);

      if (error) {
        console.error('Error creating consulta:', error);
        toast.error('Erro ao criar consulta');
      } else {
        toast.success('Consulta marcada com sucesso');
        setModalOpen(false);
        fetchData();
      }
    }

    setSaving(false);
  };

  const openDeleteDialog = (consulta: Consulta) => {
    setDeletingConsulta(consulta);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingConsulta) return;
    
    setDeleting(true);
    const { error } = await supabase
      .from('consultas')
      .delete()
      .eq('id', deletingConsulta.id);

    if (error) {
      console.error('Error deleting consulta:', error);
      toast.error('Erro ao eliminar consulta');
    } else {
      toast.success('Consulta eliminada com sucesso');
      setDeleteDialogOpen(false);
      setDeletingConsulta(null);
      fetchData();
    }
    setDeleting(false);
  };

  const handleExport = () => {
    const exportData = filteredConsultas.map((c) => ({
      'Data': c.data,
      'Hora': c.hora.substring(0, 5),
      'Paciente': (c.cartao_saude as any)?.nome || '',
      'Nº Cartão': (c.cartao_saude as any)?.numero_cartao || '',
      'Serviço': (c.servico as any)?.nome || '',
      'Origem': c.origem === 'casa_saude' ? 'Casa de Saúde' : 'Unidade Móvel',
      'Status': c.status,
      'Notas': c.notas || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consultas');
    XLSX.writeFile(wb, `consultas_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Ficheiro exportado com sucesso');
  };

  const formatData = (data: string) => {
    return format(new Date(data), "dd 'de' MMM, yyyy", { locale: pt });
  };

  const selectedPaciente = cartoes.find(c => c.id === formData.cartao_saude_id);
  const selectedServico = servicos.find(s => s.id === formData.servico_id);

  const columns: Column<Consulta>[] = [
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
      key: 'paciente',
      header: 'Paciente',
      cell: (item) => {
        const cartao = item.cartao_saude as any;
        return (
          <div>
            <p className="font-medium">{cartao?.nome}</p>
            <p className="text-sm text-muted-foreground">{cartao?.numero_cartao}</p>
          </div>
        );
      },
    },
    {
      key: 'servico',
      header: 'Serviço',
      cell: (item) => (item.servico as any)?.nome || '-',
    },
    {
      key: 'origem',
      header: 'Origem',
      cell: (item) => <OrigemBadge origem={item.origem as ConsultaOrigem} />,
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
        title="Consultas"
        description="Gestão de marcações de consultas"
      >
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

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Input
          type="date"
          value={dataFilter}
          onChange={(e) => setDataFilter(e.target.value)}
          className="w-full"
        />
        <Select value={servicoFilter} onValueChange={setServicoFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Serviço" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Serviços</SelectItem>
            {servicos.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="agendada">Agendada</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="falta">Falta</SelectItem>
            <SelectItem value="remarcada">Remarcada</SelectItem>
          </SelectContent>
        </Select>
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

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {editingConsulta ? 'Editar Consulta' : 'Nova Marcação'}
            </DialogTitle>
            <DialogDescription>
              {editingConsulta
                ? 'Atualize os dados da consulta'
                : 'Agende uma nova consulta para um paciente'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Paciente Combobox */}
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Popover open={pacienteOpen} onOpenChange={setPacienteOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={pacienteOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedPaciente
                      ? `${selectedPaciente.nome} (${selectedPaciente.numero_cartao})`
                      : 'Selecione um paciente...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar paciente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {cartoes.map((cartao) => (
                          <CommandItem
                            key={cartao.id}
                            value={cartao.nome}
                            onSelect={() => {
                              setFormData({ ...formData, cartao_saude_id: cartao.id });
                              setPacienteOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.cartao_saude_id === cartao.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {cartao.nome} ({cartao.numero_cartao})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Serviço Combobox */}
            <div className="space-y-2">
              <Label>Serviço *</Label>
              <Popover open={servicoOpen} onOpenChange={setServicoOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={servicoOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedServico?.nome || 'Selecione um serviço...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar serviço..." />
                    <CommandList>
                      <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                      <CommandGroup>
                        {servicos.map((servico) => (
                          <CommandItem
                            key={servico.id}
                            value={servico.nome}
                            onSelect={() => {
                              setFormData({ ...formData, servico_id: servico.id });
                              setServicoOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.servico_id === servico.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {servico.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem *</Label>
                <Select
                  value={formData.origem}
                  onValueChange={(value: ConsultaOrigem) =>
                    setFormData({ ...formData, origem: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casa_saude">Casa de Saúde</SelectItem>
                    <SelectItem value="unidade_movel">Unidade Móvel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            </div>

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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar Consulta"
        description={`Tem a certeza que deseja eliminar esta consulta? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
