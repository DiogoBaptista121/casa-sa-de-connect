import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

export default function CalendarioPage() {
  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Calendário"
        description="Visualização das consultas por mês/semana"
      />
      <Card className="card-elevated min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Vista de calendário em desenvolvimento</p>
        </div>
      </Card>
    </div>
  );
}
