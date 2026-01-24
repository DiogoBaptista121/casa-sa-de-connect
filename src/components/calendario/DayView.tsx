import { CalendarEvent, CalendarEventData } from './CalendarEvent';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { CalendarDays } from 'lucide-react';

interface DayViewProps {
  date: Date;
  events: CalendarEventData[];
  onEventClick: (event: CalendarEventData) => void;
}

const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

export function DayView({ date, events, onEventClick }: DayViewProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEvents = events.filter(e => e.date === dateStr);

  const getEventsForHour = (hour: number) => {
    return dayEvents.filter(e => {
      const eventHour = parseInt(e.time.split(':')[0], 10);
      return eventHour === hour;
    });
  };

  if (dayEvents.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={CalendarDays}
          title="Sem consultas"
          description="Não existem consultas marcadas para este dia."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="divide-y">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div key={hour} className="flex min-h-16">
              <div className="w-20 p-2 text-sm text-muted-foreground bg-muted/30 flex-shrink-0 border-r">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 p-2 space-y-1">
                {hourEvents.map((event) => (
                  <CalendarEvent
                    key={event.id}
                    event={event}
                    onClick={onEventClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
