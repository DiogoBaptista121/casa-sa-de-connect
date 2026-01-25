import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Save, Building2 } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface GeneralSettings {
  nome_organizacao: string;
  unidade_padrao: 'casa_saude' | 'unidade_movel';
  fuso_horario: string;
  formato_data: string;
}

const defaultSettings: GeneralSettings = {
  nome_organizacao: 'Casa de Saúde',
  unidade_padrao: 'casa_saude',
  fuso_horario: 'Europe/Lisbon',
  formato_data: 'DD/MM/AAAA',
};

export function GeneralSettingsTab() {
  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('chave', 'general_settings')
        .maybeSingle();

      if (error) throw error;

      if (data?.valor) {
        setSettings({ ...defaultSettings, ...(data.valor as object) });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('configuracoes')
        .select('id')
        .eq('chave', 'general_settings')
        .maybeSingle();

      const jsonValue = settings as unknown as Json;

      if (existing) {
        const { error } = await supabase
          .from('configuracoes')
          .update({ valor: jsonValue })
          .eq('chave', 'general_settings');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('configuracoes')
          .insert([{
            chave: 'general_settings',
            valor: jsonValue,
            descricao: 'Configurações gerais do sistema',
          }]);
        if (error) throw error;
      }

      toast({ title: 'Configurações guardadas', description: 'As definições foram atualizadas com sucesso.' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Erro', description: 'Não foi possível guardar as configurações.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">A carregar configurações...</div>;
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Configurações Gerais
        </CardTitle>
        <CardDescription>Definições gerais do sistema e da organização</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nome_organizacao">Nome da Organização</Label>
            <Input
              id="nome_organizacao"
              value={settings.nome_organizacao}
              onChange={(e) => setSettings({ ...settings, nome_organizacao: e.target.value })}
              placeholder="Casa de Saúde"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unidade_padrao">Unidade Padrão</Label>
            <Select
              value={settings.unidade_padrao}
              onValueChange={(value: 'casa_saude' | 'unidade_movel') =>
                setSettings({ ...settings, unidade_padrao: value })
              }
            >
              <SelectTrigger id="unidade_padrao">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casa_saude">Casa de Saúde</SelectItem>
                <SelectItem value="unidade_movel">Unidade Móvel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fuso_horario">Fuso Horário</Label>
            <Select
              value={settings.fuso_horario}
              onValueChange={(value) => setSettings({ ...settings, fuso_horario: value })}
            >
              <SelectTrigger id="fuso_horario">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Lisbon">Europe/Lisbon (WET/WEST)</SelectItem>
                <SelectItem value="Atlantic/Azores">Atlantic/Azores</SelectItem>
                <SelectItem value="Atlantic/Madeira">Atlantic/Madeira</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formato_data">Formato de Data</Label>
            <Select
              value={settings.formato_data}
              onValueChange={(value) => setSettings({ ...settings, formato_data: value })}
            >
              <SelectTrigger id="formato_data">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/AAAA">DD/MM/AAAA</SelectItem>
                <SelectItem value="AAAA-MM-DD">AAAA-MM-DD</SelectItem>
                <SelectItem value="MM/DD/AAAA">MM/DD/AAAA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'A guardar...' : 'Guardar Alterações'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
