import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Shield, Bell } from 'lucide-react';

export default function DefinicoesPage() {
  const { profile, role } = useAuth();

  return (
    <div className="page-enter space-y-6">
      <PageHeader title="Definições" description="Configurações do sistema" />

      <Tabs defaultValue="seguranca" className="w-full">
        <TabsList>
          <TabsTrigger value="utilizadores" className="gap-2"><Users className="w-4 h-4" />Utilizadores</TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-2"><Shield className="w-4 h-4" />Segurança</TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-2"><Bell className="w-4 h-4" />Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="utilizadores" className="mt-6">
          <Card className="card-elevated"><CardContent className="py-12 text-center text-muted-foreground">Gestão de utilizadores em desenvolvimento</CardContent></Card>
        </TabsContent>

        <TabsContent value="seguranca" className="mt-6">
          <Card className="card-elevated">
            <CardHeader><CardTitle>Sessão Atual</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Nome:</strong> {profile?.nome || '-'}</p>
              <p><strong>Email:</strong> {profile?.email || '-'}</p>
              <p><strong>Role:</strong> {role || '-'}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-6">
          <Card className="card-elevated"><CardContent className="py-12 text-center text-muted-foreground">Configurações de notificações em desenvolvimento</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
