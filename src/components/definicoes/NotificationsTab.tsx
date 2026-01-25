import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Calendar, Clock, Save } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface NotificationSettings {
  consultas_novas: boolean;
  consultas_alteradas: boolean;
  consultas_canceladas: boolean;
  lembretes_dia_anterior: boolean;
  lembretes_manhã: boolean;
  resumo_diario: boolean;
}

const defaultSettings: NotificationSettings = {
  consultas_novas: true,
  consultas_alteradas: true,
  consultas_canceladas: true,
  lembretes_dia_anterior: true,
  lembretes_manhã: false,
  resumo_diario: false,
};

export function NotificationsTab() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('chave', `notifications_${user.id}`)
        .maybeSingle();

      if (error) throw error;

      if (data?.valor) {
        setSettings({ ...defaultSettings, ...(data.valor as object) });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('configuracoes')
        .select('id')
        .eq('chave', `notifications_${user.id}`)
        .maybeSingle();

      const jsonValue = settings as unknown as Json;

      if (existing) {
        const { error } = await supabase
          .from('configuracoes')
          .update({ valor: jsonValue })
          .eq('chave', `notifications_${user.id}`);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('configuracoes')
          .insert([{
            chave: `notifications_${user.id}`,
            valor: jsonValue,
            descricao: 'Preferências de notificação do utilizador',
          }]);
        if (error) throw error;
      }

      toast({ title: 'Preferências guardadas', description: 'As suas preferências de notificação foram atualizadas.' });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({ title: 'Erro', description: 'Não foi possível guardar as preferências.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">A carregar preferências...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Consultas */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Consultas
          </CardTitle>
          <CardDescription>Notificações relacionadas com consultas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="consultas_novas">Novas Consultas</Label>
              <p className="text-sm text-muted-foreground">Receber notificação quando uma nova consulta é agendada</p>
            </div>
            <Switch
              id="consultas_novas"
              checked={settings.consultas_novas}
              onCheckedChange={() => toggleSetting('consultas_novas')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="consultas_alteradas">Alterações de Consultas</Label>
              <p className="text-sm text-muted-foreground">Receber notificação quando uma consulta é alterada</p>
            </div>
            <Switch
              id="consultas_alteradas"
              checked={settings.consultas_alteradas}
              onCheckedChange={() => toggleSetting('consultas_alteradas')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="consultas_canceladas">Cancelamentos</Label>
              <p className="text-sm text-muted-foreground">Receber notificação quando uma consulta é cancelada</p>
            </div>
            <Switch
              id="consultas_canceladas"
              checked={settings.consultas_canceladas}
              onCheckedChange={() => toggleSetting('consultas_canceladas')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lembretes */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lembretes
          </CardTitle>
          <CardDescription>Lembretes automáticos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="lembretes_dia_anterior">Lembrete Dia Anterior</Label>
              <p className="text-sm text-muted-foreground">Receber lembrete no dia anterior às consultas</p>
            </div>
            <Switch
              id="lembretes_dia_anterior"
              checked={settings.lembretes_dia_anterior}
              onCheckedChange={() => toggleSetting('lembretes_dia_anterior')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="lembretes_manhã">Lembrete de Manhã</Label>
              <p className="text-sm text-muted-foreground">Receber resumo das consultas do dia pela manhã</p>
            </div>
            <Switch
              id="lembretes_manhã"
              checked={settings.lembretes_manhã}
              onCheckedChange={() => toggleSetting('lembretes_manhã')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Resumos */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Resumos
          </CardTitle>
          <CardDescription>Resumos periódicos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="resumo_diario">Resumo Diário</Label>
              <p className="text-sm text-muted-foreground">Receber um resumo diário das atividades</p>
            </div>
            <Switch
              id="resumo_diario"
              checked={settings.resumo_diario}
              onCheckedChange={() => toggleSetting('resumo_diario')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'A guardar...' : 'Guardar Preferências'}
        </Button>
      </div>
    </div>
  );
}
