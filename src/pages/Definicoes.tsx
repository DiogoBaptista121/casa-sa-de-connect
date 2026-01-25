import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Shield, Bell } from 'lucide-react';
import { GeneralSettingsTab } from '@/components/definicoes/GeneralSettingsTab';
import { UsersTab } from '@/components/definicoes/UsersTab';
import { SecurityTab } from '@/components/definicoes/SecurityTab';
import { NotificationsTab } from '@/components/definicoes/NotificationsTab';

export default function DefinicoesPage() {
  return (
    <div className="page-enter space-y-6">
      <PageHeader title="Definições" description="Configurações do sistema e da sua conta" />

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="geral" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="utilizadores" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Utilizadores</span>
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-6">
          <GeneralSettingsTab />
        </TabsContent>

        <TabsContent value="utilizadores" className="mt-6">
          <UsersTab />
        </TabsContent>

        <TabsContent value="seguranca" className="mt-6">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-6">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
