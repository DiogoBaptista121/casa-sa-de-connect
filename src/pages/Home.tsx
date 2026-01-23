import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge, OrigemBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  CreditCard, 
  Clock, 
  Truck, 
  Plus, 
  CalendarDays,
  ArrowRight
} from 'lucide-react';
import type { Consulta, ConsultaStatus, ConsultaOrigem } from '@/types/database';

export default function HomePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    consultasHoje: 0,
    totalCartoes: 0,
    pendentes: 0,
    unidadeMovelHoje: 0,
  });
  const [agendaHoje, setAgendaHoje] = useState<Consulta[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Fetch KPIs in parallel
      const [consultasHojeRes, totalCartoesRes, pendentesRes, unidadeMovelRes, agendaRes] = await Promise.all([
        supabase
          .from('consultas')
          .select('id', { count: 'exact', head: true })
          .eq('data', today),
        supabase
          .from('cartao_saude')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'ativo'),
        supabase
          .from('consultas')
          .select('id', { count: 'exact', head: true })
          .in('status', ['agendada', 'confirmada', 'remarcada']),
        supabase
          .from('consultas')
          .select('id', { count: 'exact', head: true })
          .eq('data', today)
          .eq('origem', 'unidade_movel'),
        supabase
          .from('consultas')
          .select(`
            *,
            cartao_saude:cartao_saude_id (id, nome, numero_cartao),
            servico:servico_id (id, nome, cor)
          `)
          .eq('data', today)
          .order('hora', { ascending: true })
          .limit(10),
      ]);

      setKpis({
        consultasHoje: consultasHojeRes.count || 0,
        totalCartoes: totalCartoesRes.count || 0,
        pendentes: pendentesRes.count || 0,
        unidadeMovelHoje: unidadeMovelRes.count || 0,
      });

      if (agendaRes.data) {
        setAgendaHoje(agendaRes.data as unknown as Consulta[]);
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHora = (hora: string) => {
    return hora.substring(0, 5);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 19) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader 
        title={`${greeting()}, ${profile?.nome?.split(' ')[0] || 'Utilizador'}!`}
        description="Resumo do dia e acesso rápido às funcionalidades principais"
      >
        <Button onClick={() => navigate('/consultas')} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Marcação
        </Button>
        <Button variant="outline" onClick={() => navigate('/calendario')} className="gap-2">
          <CalendarDays className="w-4 h-4" />
          Ver Calendário
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Consultas Hoje"
          value={kpis.consultasHoje}
          icon={Calendar}
          loading={loading}
        />
        <KpiCard
          title="Cartões de Saúde"
          value={kpis.totalCartoes}
          icon={CreditCard}
          description="Ativos"
          loading={loading}
        />
        <KpiCard
          title="Pendentes"
          value={kpis.pendentes}
          icon={Clock}
          description="Agendadas / Confirmadas / Remarcadas"
          loading={loading}
        />
        <KpiCard
          title="Unidade Móvel Hoje"
          value={kpis.unidadeMovelHoje}
          icon={Truck}
          loading={loading}
        />
      </div>

      {/* Agenda de Hoje */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-display">Agenda de Hoje</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/consultas')}
            className="gap-1 text-primary"
          >
            Ver todas
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : agendaHoje.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Sem consultas hoje"
              description="Não existem consultas agendadas para hoje."
            />
          ) : (
            <div className="space-y-3">
              {agendaHoje.map((consulta) => (
                <div
                  key={consulta.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate('/consultas')}
                >
                  <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-primary/10">
                    <span className="text-lg font-semibold text-primary">
                      {formatHora(consulta.hora)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {(consulta.cartao_saude as any)?.nome || 'Paciente'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(consulta.servico as any)?.nome || 'Serviço'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <OrigemBadge origem={consulta.origem as ConsultaOrigem} />
                    <StatusBadge status={consulta.status as ConsultaStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
