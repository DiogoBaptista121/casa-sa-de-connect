import { CalendarEvent, CalendarEventData } from './CalendarEvent';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WeekViewProps {
  date: Date;
  events: CalendarEventData[];
  onEventClick: (event: CalendarEventData) => void;
}

export function WeekView({ date, events, onEventClick }: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const getEventsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return events
      .filter(e => e.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 divide-x">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, today);
          
          return (
            <div key={day.toISOString()} className="min-h-48">
              <div className={cn(
                "p-2 text-center border-b",
                isToday && "bg-primary/10"
              )}>
                <p className="text-xs text-muted-foreground capitalize">
                  {format(day, 'EEE', { locale: pt })}
                </p>
                <p className={cn(
                  "text-lg font-semibold",
                  isToday && "text-primary"
                )}>
                  {format(day, 'd')}
                </p>
              </div>
              <div className="p-1 space-y-1 max-h-64 overflow-y-auto">
                {dayEvents.map((event) => (
                  <CalendarEvent
                    key={event.id}
                    event={event}
                    onClick={onEventClick}
                    compact
                  />
                ))}
                {dayEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">-</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
