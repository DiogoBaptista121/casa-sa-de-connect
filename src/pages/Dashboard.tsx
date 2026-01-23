import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ExternalLink } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Dashboard"
        description="Relatórios e indicadores do projeto"
      />

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Dashboard Power BI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Dashboard Power BI</h3>
            <p className="text-muted-foreground max-w-md mb-4">
              Configure o URL do seu dashboard Power BI nas Definições para visualizar os relatórios embebidos aqui.
            </p>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Configurar Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
