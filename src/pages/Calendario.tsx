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
import { AppointmentModal } from '@/components/calendario/AppointmentModal';
import { Loader2 } from 'lucide-react';
import type { Consulta, ConsultaMT, Servico, ConsultaOrigem, ConsultaStatus } from '@/types/database';

const origemLabels: Record<ConsultaOrigem, string> = {
  casa_saude: 'Casa de Saúde',
  unidade_movel: 'Unidade Móvel',
};

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
  const [unidadeFilter, setUnidadeFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);

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
    if (tipoFilter === 'todos' || tipoFilter === 'consulta') {
      consultas.forEach((c) => {
        // Filter by unidade (origem)
        if (unidadeFilter !== 'todos' && c.origem !== unidadeFilter) return;
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
          origem: c.origem,
          origemLabel: origemLabels[c.origem] || 'Casa de Saúde',
        });
      });
    }

    // Consultas Medicina do Trabalho - sempre associadas à Casa de Saúde
    if (tipoFilter === 'todos' || tipoFilter === 'medicina_trabalho') {
      // MT está sempre associado a Casa de Saúde, então excluir quando filtro é Unidade Móvel
      if (unidadeFilter !== 'unidade_movel') {
        consultasMT.forEach((c) => {
          if (statusFilter !== 'todos' && c.status !== statusFilter) return;

          const funcionario = c.funcionario as any;

          allEvents.push({
            id: c.id,
            title: funcionario?.nome || 'Funcionário',
            subtitle: c.tipo_exame || 'Exame',
            date: c.data,
            time: c.hora?.substring(0, 5) || '00:00',
            status: c.status,
            color: '#f59e0b',
            isMT: true,
            type: 'consulta_mt',
            origem: 'casa_saude' as ConsultaOrigem,
            origemLabel: 'Casa de Saúde • MT',
          });
        });
      }
    }

    return allEvents.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  }, [consultas, consultasMT, servicoFilter, tipoFilter, unidadeFilter, statusFilter]);

  const handleEventClick = (event: CalendarEventData) => {
    // Find the original data to edit
    if (event.type === 'consulta') {
      const consulta = consultas.find((c) => c.id === event.id);
      if (consulta) {
        setEditingAppointment({
          id: consulta.id,
          type: 'consulta' as const,
          cartao_saude_id: consulta.cartao_saude_id,
          servico_id: consulta.servico_id,
          origem: consulta.origem,
          data: consulta.data,
          hora: consulta.hora?.substring(0, 5) || '09:00',
          status: consulta.status,
          notas: consulta.notas || '',
        });
      }
    } else {
      const consultaMT = consultasMT.find((c) => c.id === event.id);
      if (consultaMT) {
        setEditingAppointment({
          id: consultaMT.id,
          type: 'consulta_mt' as const,
          funcionario_id: consultaMT.funcionario_id,
          tipo_exame: consultaMT.tipo_exame || 'Periódico',
          data: consultaMT.data,
          hora: consultaMT.hora?.substring(0, 5) || '09:00',
          status: consultaMT.status,
          notas: consultaMT.notas || '',
        });
      }
    }
    setModalOpen(true);
  };

  const handleNewAppointment = () => {
    setEditingAppointment(null);
    setModalOpen(true);
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
        unidadeFilter={unidadeFilter}
        setUnidadeFilter={setUnidadeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onToday={handleToday}
        onNewConsulta={handleNewAppointment}
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

      {/* Appointment Modal for Create/Edit */}
      <AppointmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialData={editingAppointment}
        initialDate={currentDate}
        onSuccess={fetchData}
      />
    </div>
  );
}
