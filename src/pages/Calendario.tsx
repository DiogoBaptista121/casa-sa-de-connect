import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { CalendarFilters } from '@/components/calendario/CalendarFilters';
import { CalendarViewSelector, CalendarView } from '@/components/calendario/CalendarViews';
import { CalendarEventData } from '@/components/calendario/CalendarEvent';
import { DayView } from '@/components/calendario/DayView';
import { WeekView } from '@/components/calendario/WeekView';
import { MonthView } from '@/components/calendario/MonthView';
import { YearView } from '@/components/calendario/YearView';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge, OrigemBadge } from '@/components/ui/status-badge';
import { toast } from 'sonner';
import { Loader2, Calendar, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Consulta, ConsultaMT, Servico, ConsultaStatus, ConsultaOrigem } from '@/types/database';

export default function CalendarioPage() {
  const { canEdit } = useAuth();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CalendarView>('mes');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Data
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [consultasMT, setConsultasMT] = useState<ConsultaMT[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  // Filters
  const [servicoFilter, setServicoFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Event modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
  const [editStatus, setEditStatus] = useState<ConsultaStatus>('agendada');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [consultasRes, consultasMTRes, servicosRes] = await Promise.all([
      supabase
        .from('consultas')
        .select(`
          *,
          cartao_saude:cartao_saude_id (id, nome, numero_cartao),
          servico:servico_id (id, nome, cor)
        `)
        .order('data', { ascending: true }),
      supabase
        .from('consultas_mt')
        .select(`
          *,
          funcionario:funcionario_id (id, nome, numero_funcionario)
        `)
        .order('data', { ascending: true }),
      supabase
        .from('servicos')
        .select('*')
        .eq('ativo', true)
        .order('nome'),
    ]);

    if (consultasRes.error) {
      console.error('Error fetching consultas:', consultasRes.error);
    } else {
      setConsultas(consultasRes.data as unknown as Consulta[]);
    }

    if (consultasMTRes.error) {
      console.error('Error fetching consultas_mt:', consultasMTRes.error);
    } else {
      setConsultasMT(consultasMTRes.data as unknown as ConsultaMT[]);
    }

    if (servicosRes.data) setServicos(servicosRes.data as Servico[]);

    setLoading(false);
  };

  // Transform data into calendar events
  const events = useMemo(() => {
    const allEvents: CalendarEventData[] = [];

    // Consultas Casa de Saúde
    if (tipoFilter === 'todos' || tipoFilter === 'casa_saude' || tipoFilter === 'unidade_movel') {
      consultas.forEach((c) => {
        if (tipoFilter !== 'todos' && c.origem !== tipoFilter) return;
        if (servicoFilter !== 'todos' && c.servico_id !== servicoFilter) return;
        if (statusFilter !== 'todos' && c.status !== statusFilter) return;

        const cartao = c.cartao_saude as any;
        const servico = c.servico as any;

        allEvents.push({
          id: c.id,
          title: cartao?.nome || 'Paciente',
          subtitle: servico?.nome || 'Serviço',
          date: c.data,
          time: c.hora?.substring(0, 5) || '00:00',
          status: c.status,
          color: servico?.cor,
          isMT: false,
          type: 'consulta',
        });
      });
    }

    // Consultas Medicina do Trabalho
    if (tipoFilter === 'todos' || tipoFilter === 'medicina_trabalho') {
      consultasMT.forEach((c) => {
        if (statusFilter !== 'todos' && c.status !== statusFilter) return;

        const funcionario = c.funcionario as any;

        allEvents.push({
          id: c.id,
          title: funcionario?.nome || 'Funcionário',
          subtitle: `MT - ${c.tipo_exame || 'Exame'}`,
          date: c.data,
          time: c.hora?.substring(0, 5) || '00:00',
          status: c.status,
          color: '#f59e0b',
          isMT: true,
          type: 'consulta_mt',
        });
      });
    }

    return allEvents.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  }, [consultas, consultasMT, servicoFilter, tipoFilter, statusFilter]);

  const handleEventClick = (event: CalendarEventData) => {
    setSelectedEvent(event);
    setEditStatus(event.status);
  };

  const handleUpdateStatus = async () => {
    if (!selectedEvent) return;
    setSaving(true);

    const table = selectedEvent.type === 'consulta' ? 'consultas' : 'consultas_mt';
    const { error } = await supabase
      .from(table)
      .update({ status: editStatus })
      .eq('id', selectedEvent.id);

    if (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } else {
      toast.success('Status atualizado');
      setSelectedEvent(null);
      fetchData();
    }
    setSaving(false);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleMonthClick = (month: Date) => {
    setCurrentDate(month);
    setView('mes');
  };

  if (loading) {
    return (
      <div className="page-enter space-y-6">
        <PageHeader
          title="Calendário"
          description="Visualização das consultas agendadas"
        />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Calendário"
        description="Visualização das consultas agendadas"
      />

      <CalendarFilters
        servicos={servicos}
        servicoFilter={servicoFilter}
        setServicoFilter={setServicoFilter}
        tipoFilter={tipoFilter}
        setTipoFilter={setTipoFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onToday={handleToday}
        onNewConsulta={() => window.location.href = '/consultas'}
        canEdit={canEdit}
      />

      <CalendarViewSelector
        view={view}
        setView={setView}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      />

      {view === 'dia' && (
        <DayView date={currentDate} events={events} onEventClick={handleEventClick} />
      )}
      {view === 'semana' && (
        <WeekView date={currentDate} events={events} onEventClick={handleEventClick} />
      )}
      {view === 'mes' && (
        <MonthView date={currentDate} events={events} onEventClick={handleEventClick} />
      )}
      {view === 'ano' && (
        <YearView date={currentDate} events={events} onMonthClick={handleMonthClick} />
      )}

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent?.isMT ? (
                <Briefcase className="w-5 h-5 text-amber-500" />
              ) : (
                <Calendar className="w-5 h-5 text-primary" />
              )}
              {selectedEvent?.isMT ? 'Consulta MT' : 'Consulta'}
            </DialogTitle>
            <DialogDescription>
              Detalhes da consulta agendada
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">
                    {format(new Date(selectedEvent.date), "dd 'de' MMMM, yyyy", { locale: pt })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Hora</Label>
                  <p className="font-medium">{selectedEvent.time}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">
                  {selectedEvent.isMT ? 'Funcionário' : 'Paciente'}
                </Label>
                <p className="font-medium">{selectedEvent.title}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">
                  {selectedEvent.isMT ? 'Tipo de Exame' : 'Serviço'}
                </Label>
                <p className="font-medium">{selectedEvent.subtitle}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Status Atual</Label>
                <div className="mt-1">
                  <StatusBadge status={selectedEvent.status} />
                </div>
              </div>

              {canEdit && (
                <div className="space-y-2">
                  <Label>Alterar Status</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ConsultaStatus)}>
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
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Fechar
            </Button>
            {canEdit && (
              <Button onClick={handleUpdateStatus} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
