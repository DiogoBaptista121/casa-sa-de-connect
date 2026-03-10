import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Calendar,
  CreditCard,
  Clock,
  MapPin,
  ArrowRight,
  UserPlus,
  Stethoscope,
  Briefcase,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import type { ConsultaStatus } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AgendaItem {
  id: string;
  hora: string;
  paciente_nif: string;
  nome_completo: string | null;
  servico_nome: string | null;
  servico_cor: string | null;
  local: string | null;
  status: ConsultaStatus;
}

interface ChartPoint {
  dia: string;
  consultas: number;
  cartoes: number;
}

const KPI_CONFIG = [
  { key: 'consultasHoje', label: 'Consultas Hoje', description: 'Marcadas para hoje', icon: Calendar, iconBg: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-500', accent: 'from-blue-500/10 to-transparent' },
  { key: 'totalCartoes', label: 'Cartões de Saúde', description: 'Total registados', icon: CreditCard, iconBg: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-500', accent: 'from-emerald-500/10 to-transparent' },
  { key: 'localHoje', label: 'Unidade Móvel', description: 'Consultas hoje', icon: MapPin, iconBg: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-500', accent: 'from-violet-500/10 to-transparent' },
  { key: 'pendentes', label: 'Pendentes', description: 'Agendadas / confirmadas', icon: Clock, iconBg: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-500', accent: 'from-amber-500/10 to-transparent' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-muted/60 ${className}`} />
);

const formatDate = () => new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 19) return 'Boa tarde';
  return 'Boa noite';
};

const getLast7DaysLabels = () => {
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return labels[d.getDay()];
  });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur border border-border/50 shadow-xl rounded-xl px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span>{p.name}: <span className="font-medium text-foreground">{p.value}</span></span>
        </div>
      ))}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const { profile, canEdit, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ consultasHoje: 0, totalCartoes: 0, localHoje: 0, pendentes: 0, pendentesValidacao: 0 });
  const [agendaHoje, setAgendaHoje] = useState<AgendaItem[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const labels = getLast7DaysLabels();
    const dateRange = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    try {
      // @ts-ignore
      const q1 = supabase.from('cartao_saude').select('id', { count: 'exact', head: true });
      // @ts-ignore
      const q2 = supabase.from('cartao_saude').select('id', { count: 'exact', head: true }).eq('estado_entrega', 'PENDENTE');
      // @ts-ignore
      const q3 = supabase.from('consultas').select('id', { count: 'exact', head: true }).eq('data', today).in('status', ['confirmada', 'remarcada']);
      // @ts-ignore
      const q4 = supabase.from('consultas').select('id', { count: 'exact', head: true }).eq('data', today).eq('local', 'Unidade Móvel');
      // @ts-ignore
      const q5 = supabase.from('cartao_saude').select('id', { count: 'exact', head: true }).eq('estado_entrega', 'AGUARDAR_VALIDACAO');
      // @ts-ignore
      const q6 = supabase.from('consultas').select('id, hora, paciente_nif, status, local, servicos(nome, cor)').eq('data', today).order('hora', { ascending: true }).limit(10);
      // @ts-ignore
      const q7 = supabase.from('consultas').select('data').gte('data', dateRange[0]).lte('data', dateRange[6]);
      // @ts-ignore
      const q8 = supabase.from('cartao_saude').select('created_at').gte('created_at', dateRange[0]).lte('created_at', dateRange[6] + 'T23:59:59');

      const [totalRes, pendentesRes, hojeRes, movelRes, validacaoRes, agendaRes, consultasWeekRes, cartoesWeekRes] = await Promise.all([q1, q2, q3, q4, q5, q6, q7, q8]);

      setKpis({
        consultasHoje: hojeRes.count ?? 0,
        totalCartoes: totalRes.count ?? 0,
        localHoje: movelRes.count ?? 0,
        pendentes: pendentesRes.count ?? 0,
        pendentesValidacao: validacaoRes.count ?? 0,
      });

      const consultasByDay: Record<string, number> = {};
      const cartoesByDay: Record<string, number> = {};
      dateRange.forEach(d => { consultasByDay[d] = 0; cartoesByDay[d] = 0; });

      (consultasWeekRes.data ?? []).forEach((r: any) => {
        const d = (r.data ?? '').substring(0, 10);
        if (d in consultasByDay) consultasByDay[d]++;
      });
      (cartoesWeekRes.data ?? []).forEach((r: any) => {
        const d = (r.created_at ?? '').substring(0, 10);
        if (d in cartoesByDay) cartoesByDay[d]++;
      });

      setChartData(dateRange.map((d, i) => ({ dia: labels[i], consultas: consultasByDay[d], cartoes: cartoesByDay[d] })));

      const rawAgenda = (agendaRes.data ?? []);
      if (rawAgenda.length > 0) {
        const nifs = [...new Set(rawAgenda.map((r: any) => r.paciente_nif).filter(Boolean))];
        const { data: cartoes } = await supabase.from('cartao_saude').select('nif, nome_completo').in('nif', nifs as any);
        const map = new Map();
        (cartoes ?? []).forEach((c: any) => map.set(c.nif, c.nome_completo));

        setAgendaHoje(rawAgenda.map((r: any) => ({
          id: r.id, hora: (r.hora ?? '').substring(0, 5), paciente_nif: r.paciente_nif,
          nome_completo: map.get(r.paciente_nif) ?? null, servico_nome: r.servicos?.nome ?? null,
          servico_cor: r.servicos?.cor ?? null, local: r.local ?? null, status: r.status ?? 'agendada'
        })));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const firstName = profile?.nome?.split(' ')[0] || 'Utilizador';

  return (
    <div className="page-enter space-y-6 w-full relative">

      {/* ── Badge de Versão (Canto Superior Direito) ────────────────── */}
      <div className="fixed top-[18px] right-[24px] z-[100] hidden sm:block">
        <span className="text-[10px] font-mono text-muted-foreground/40 border border-border/50 rounded-md px-2 py-0.5 bg-background/80 backdrop-blur-sm">
          Versão: 1.0.0.2026
        </span>
      </div>

      {/* ── Greeting header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {getGreeting()}, {firstName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            Resumo do dia &nbsp;·&nbsp; {formatDate()}
          </p>
        </div>
      </div>

      {/* ── Admin Validation Alert ────────────────────────────────────── */}
      {(role === 'admin' || role === 'manager') && kpis.pendentesValidacao > 0 && (
        <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-900 dark:text-blue-200">Tens <strong>{kpis.pendentesValidacao}</strong> cartões para validar.</p>
          </div>
          <Button onClick={() => navigate('/cartao-saude?filter=validacao')} size="sm">Rever</Button>
        </div>
      )}

      {/* ── KPI Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CONFIG.map((cfg) => (
          <div key={cfg.key} className="bg-card p-5 rounded-2xl border shadow-sm">
            <div className="flex justify-between mb-4">
              <p className="text-xs font-medium text-muted-foreground">{cfg.label}</p>
              <cfg.icon className={`w-5 h-5 ${cfg.iconColor}`} />
            </div>
            {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-3xl font-bold">{kpis[cfg.key as keyof typeof kpis]}</p>}
          </div>
        ))}
      </div>

      {/* ── Main split: Agenda + Chart ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Agenda */}
        <div className="lg:col-span-2 bg-card rounded-2xl border p-5">
          <h2 className="text-sm font-semibold mb-4">Agenda de Hoje</h2>
          {loading ? <Skeleton className="h-40 w-full" /> : agendaHoje.length === 0 ? <p className="text-xs text-muted-foreground">Sem marcações.</p> : (
            <div className="space-y-3">
              {agendaHoje.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-xl cursor-pointer" onClick={() => navigate('/consultas')}>
                  <div className="w-1 h-8 rounded-full" style={{ background: item.servico_cor ?? '#ccc' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.nome_completo ?? item.paciente_nif}</p>
                    <p className="text-xs text-muted-foreground">{item.hora} · {item.servico_nome}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="lg:col-span-3 bg-card rounded-2xl border p-5">
          <h2 className="text-sm font-semibold mb-4">Atividade Semanal</h2>
          <div className="h-[300px]">
            {loading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" strokeOpacity={0.5} />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="consultas" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="cartoes" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}