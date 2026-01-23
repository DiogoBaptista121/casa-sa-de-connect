import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, Users } from 'lucide-react';

export default function MedicinaTrabalhoPage() {
  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Medicina do Trabalho"
        description="Gestão de funcionários e consultas de medicina do trabalho"
      />

      <Tabs defaultValue="funcionarios" className="w-full">
        <TabsList>
          <TabsTrigger value="funcionarios" className="gap-2">
            <Users className="w-4 h-4" />
            Funcionários
          </TabsTrigger>
          <TabsTrigger value="consultas" className="gap-2">
            <Stethoscope className="w-4 h-4" />
            Consultas MT
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funcionarios" className="mt-6">
          <Card className="card-elevated min-h-[400px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Gestão de funcionários em desenvolvimento</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="consultas" className="mt-6">
          <Card className="card-elevated min-h-[400px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Consultas de medicina do trabalho em desenvolvimento</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
