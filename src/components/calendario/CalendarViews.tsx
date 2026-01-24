import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, addYears, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import { pt } from 'date-fns/locale';

export type CalendarView = 'dia' | 'semana' | 'mes' | 'ano';

interface CalendarViewSelectorProps {
  view: CalendarView;
  setView: (view: CalendarView) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

export function CalendarViewSelector({ view, setView, currentDate, setCurrentDate }: CalendarViewSelectorProps) {
  const handlePrev = () => {
    switch (view) {
      case 'dia':
        setCurrentDate(subDays(currentDate, 1));
        break;
      case 'semana':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'mes':
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case 'ano':
        setCurrentDate(subYears(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case 'dia':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case 'semana':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'mes':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'ano':
        setCurrentDate(addYears(currentDate, 1));
        break;
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'dia':
        return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: pt });
      case 'semana':
        return format(currentDate, "'Semana de' d 'de' MMMM yyyy", { locale: pt });
      case 'mes':
        return format(currentDate, "MMMM 'de' yyyy", { locale: pt });
      case 'ano':
        return format(currentDate, 'yyyy', { locale: pt });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handlePrev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold min-w-64 text-center capitalize">
          {getTitle()}
        </h2>
        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg">
        {(['dia', 'semana', 'mes', 'ano'] as CalendarView[]).map((v) => (
          <Button
            key={v}
            variant={view === v ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView(v)}
            className="capitalize"
          >
            {v}
          </Button>
        ))}
      </div>
    </div>
  );
}
