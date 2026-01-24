import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, CalendarDays } from 'lucide-react';
import type { Servico } from '@/types/database';

interface CalendarFiltersProps {
  servicos: Servico[];
  servicoFilter: string;
  setServicoFilter: (value: string) => void;
  tipoFilter: string;
  setTipoFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  onToday: () => void;
  onNewConsulta: () => void;
  canEdit: boolean;
}

export function CalendarFilters({
  servicos,
  servicoFilter,
  setServicoFilter,
  tipoFilter,
  setTipoFilter,
  statusFilter,
  setStatusFilter,
  onToday,
  onNewConsulta,
  canEdit,
}: CalendarFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-wrap gap-2">
        <Select value={servicoFilter} onValueChange={setServicoFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Serviço" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Serviços</SelectItem>
            {servicos.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="casa_saude">Casa de Saúde</SelectItem>
            <SelectItem value="unidade_movel">Unidade Móvel</SelectItem>
            <SelectItem value="medicina_trabalho">Medicina do Trabalho</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            <SelectItem value="agendada">Agendada</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="falta">Falta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onToday} className="gap-2">
          <CalendarDays className="w-4 h-4" />
          Hoje
        </Button>
        {canEdit && (
          <Button onClick={onNewConsulta} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Marcação
          </Button>
        )}
      </div>
    </div>
  );
}
