import { cn } from '@/lib/utils';
import { statusColors, statusLabels, ConsultaStatus } from '@/types/database';
import { Briefcase } from 'lucide-react';

export interface CalendarEventData {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  status: ConsultaStatus;
  color?: string;
  isMT: boolean;
  type: 'consulta' | 'consulta_mt';
}

interface CalendarEventProps {
  event: CalendarEventData;
  onClick: (event: CalendarEventData) => void;
  compact?: boolean;
}

const statusBgColors: Record<ConsultaStatus, string> = {
  agendada: 'bg-blue-100 border-blue-300 text-blue-800',
  confirmada: 'bg-green-100 border-green-300 text-green-800',
  concluida: 'bg-gray-100 border-gray-300 text-gray-700',
  cancelada: 'bg-red-100 border-red-300 text-red-700',
  falta: 'bg-amber-100 border-amber-300 text-amber-800',
  remarcada: 'bg-purple-100 border-purple-300 text-purple-800',
};

export function CalendarEvent({ event, onClick, compact = false }: CalendarEventProps) {
  return (
    <button
      onClick={() => onClick(event)}
      className={cn(
        'w-full text-left rounded-md border transition-all hover:shadow-md cursor-pointer',
        statusBgColors[event.status],
        compact ? 'p-1 text-xs' : 'p-2 text-sm'
      )}
      style={event.color ? { borderLeftColor: event.color, borderLeftWidth: 3 } : undefined}
    >
      <div className="flex items-center gap-1">
        {event.isMT && (
          <Briefcase className="w-3 h-3 shrink-0" />
        )}
        <span className="font-medium truncate">{event.time}</span>
      </div>
      {!compact && (
        <>
          <p className="font-medium truncate">{event.title}</p>
          <p className="text-xs opacity-80 truncate">{event.subtitle}</p>
        </>
      )}
      {compact && (
        <p className="truncate">{event.title}</p>
      )}
    </button>
  );
}
