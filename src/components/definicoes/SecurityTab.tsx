import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Key, LogOut, Smartphone, User } from 'lucide-react';

import { useEffect as UseEffectAlias } from 'react';

export function SecurityTab() {
  const { profile, role, signOut, user } = useAuth();
  UseEffectAlias(() => {
    if (profile?.nome && !isEditingName) {
      setNewName(profile.nome);
    }
  }, [profile?.nome]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // Name editing state
  const [newName, setNewName] = useState(profile?.nome || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const handleSaveName = async () => {
    if (!profile?.id) return;
    if (!newName.trim()) {
      toast({ title: 'Erro', description: 'O nome não pode estar vazio.', variant: 'destructive' });
      return;
    }

    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nome: newName.trim() })
        .eq('id', profile.id);

      if (error) throw error;

      toast({ title: 'Nome atualizado', description: 'O seu nome foi atualizado com sucesso.' });
      setIsEditingName(false);
      // Idealmente, recarregaríamos o profile aqui ou usaríamos optimista
    } catch (error) {
      console.error('Error updating name:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o nome.', variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Erro', description: 'A palavra-passe deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Erro', description: 'As palavras-passe não coincidem.', variant: 'destructive' });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: 'Palavra-passe alterada', description: 'A sua palavra-passe foi atualizada com sucesso.' });
      setPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast({ title: 'Erro', description: 'Não foi possível alterar a palavra-passe.', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOutAllSessions = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast({ title: 'Sessões terminadas', description: 'Todas as sessões foram encerradas.' });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({ title: 'Erro', description: 'Não foi possível terminar as sessões.', variant: 'destructive' });
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    staff: 'Staff',
    viewer: 'Visualizador',
  };

  return (
    <div className="space-y-6">
      {/* Current Session */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Sessão Atual
          </CardTitle>
          <CardDescription>Informações da sua conta e sessão</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground">Nome</Label>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={handleSaveName} disabled={savingName}>
                    {savingName ? '...' : 'Salvar'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsEditingName(false); setNewName(profile?.nome || ''); }}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="font-medium">{profile?.nome || '-'}</p>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setNewName(profile?.nome || ''); setIsEditingName(true); }}>
                    Editar
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{profile?.email || user?.email || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Role</Label>
              <p className="font-medium">{role ? roleLabels[role] : '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Palavra-passe
          </CardTitle>
          <CardDescription>Altere a sua palavra-passe de acesso</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Key className="mr-2 h-4 w-4" />
                Alterar Palavra-passe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alterar Palavra-passe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Palavra-passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Palavra-passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a palavra-passe"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleChangePassword} disabled={changingPassword}>
                  {changingPassword ? 'A alterar...' : 'Confirmar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* MFA */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Autenticação Multifatorial (MFA)
          </CardTitle>
          <CardDescription>Adicione uma camada extra de segurança à sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                A autenticação de dois fatores ainda não está configurada.
              </p>
            </div>
            <Button variant="outline" disabled>
              <Shield className="mr-2 h-4 w-4" />
              Configurar MFA
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Funcionalidade disponível em breve.
          </p>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Sessões
          </CardTitle>
          <CardDescription>Gerir sessões ativas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sessão Atual</p>
                <p className="text-sm text-muted-foreground">Este dispositivo</p>
              </div>
              <Badge variant="default">Ativa</Badge>
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Terminar Sessão
            </Button>
            <Button variant="destructive" onClick={handleSignOutAllSessions}>
              <LogOut className="mr-2 h-4 w-4" />
              Terminar Todas as Sessões
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'secondary' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variant === 'default' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      }`}>
      {children}
    </span>
  );
}
