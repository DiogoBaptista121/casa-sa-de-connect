import { cn } from '@/lib/utils';
import { ConsultaStatus } from '@/types/database';
import { Briefcase, Stethoscope } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  origem?: string;
  origemLabel?: string;
}

interface CalendarEventProps {
  event: CalendarEventData;
  onClick: (event: CalendarEventData) => void;
  compact?: boolean;
}

const statusBgColors: Record<ConsultaStatus, string> = {
  agendada: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300',
  confirmada: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300',
  concluida: 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-300',
  cancelada: 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300',
  falta: 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300',
  remarcada: 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300',
};

export function CalendarEvent({ event, onClick, compact = false }: CalendarEventProps) {
  const eventContent = (
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
        {event.isMT ? (
          <Briefcase className="w-3 h-3 shrink-0 text-amber-600 dark:text-amber-400" />
        ) : (
          <Stethoscope className="w-3 h-3 shrink-0 text-primary" />
        )}
        <span className="font-medium truncate">{event.time}</span>
        {!compact && event.origemLabel && (
          <span className="text-xs opacity-70 ml-auto truncate">
            {event.isMT ? 'MT' : event.origemLabel}
          </span>
        )}
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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {eventContent}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold flex items-center gap-1">
              {event.isMT ? (
                <>
                  <Briefcase className="w-3 h-3" />
                  MT – {event.subtitle}
                </>
              ) : (
                <>
                  <Stethoscope className="w-3 h-3" />
                  Consulta – {event.subtitle}
                </>
              )}
            </p>
            <p>{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {event.time} • {event.origemLabel || (event.isMT ? 'Medicina do Trabalho' : 'Casa de Saúde')}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
