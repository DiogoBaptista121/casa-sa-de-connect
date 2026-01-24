import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Stethoscope } from 'lucide-react';
import { FuncionariosTab } from '@/components/medicina-trabalho/FuncionariosTab';
import { ConsultasMTTab } from '@/components/medicina-trabalho/ConsultasMTTab';

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
          <FuncionariosTab />
        </TabsContent>

        <TabsContent value="consultas" className="mt-6">
          <ConsultasMTTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
