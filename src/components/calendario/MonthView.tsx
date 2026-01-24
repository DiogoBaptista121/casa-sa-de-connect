import { CalendarEvent, CalendarEventData } from './CalendarEvent';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MonthViewProps {
  date: Date;
  events: CalendarEventData[];
  onEventClick: (event: CalendarEventData) => void;
}

export function MonthView({ date, events, onEventClick }: MonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const today = new Date();
  const days: Date[] = [];
  let day = calendarStart;
  
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getEventsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return events
      .filter(e => e.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, 3);
  };

  const getEventCountForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.date === dateStr).length;
  };

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 divide-x border-b">
        {weekDays.map((d) => (
          <div key={d} className="p-2 text-center text-sm font-medium text-muted-foreground bg-muted/30">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="divide-y">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 divide-x min-h-28">
            {week.map((dayItem) => {
              const dayEvents = getEventsForDay(dayItem);
              const totalCount = getEventCountForDay(dayItem);
              const isCurrentMonth = isSameMonth(dayItem, date);
              const isToday = isSameDay(dayItem, today);

              return (
                <div 
                  key={dayItem.toISOString()} 
                  className={cn(
                    "p-1",
                    !isCurrentMonth && "bg-muted/20"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-full text-sm mb-1",
                    isToday && "bg-primary text-primary-foreground font-bold",
                    !isCurrentMonth && "text-muted-foreground"
                  )}>
                    {format(dayItem, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.map((event) => (
                      <CalendarEvent
                        key={event.id}
                        event={event}
                        onClick={onEventClick}
                        compact
                      />
                    ))}
                    {totalCount > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{totalCount - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}
