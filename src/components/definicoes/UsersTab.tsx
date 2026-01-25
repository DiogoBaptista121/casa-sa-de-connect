import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Users, Shield, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import type { AppRole } from '@/types/database';

interface UserWithRole {
  id: string;
  nome: string | null;
  email: string;
  ativo: boolean | null;
  role: AppRole | null;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  staff: 'Staff',
  viewer: 'Visualizador',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-primary text-primary-foreground',
  staff: 'bg-secondary text-secondary-foreground',
  viewer: 'bg-muted text-muted-foreground',
};

export function UsersTab() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, email, ativo')
        .order('nome');

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role as AppRole) || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar utilizadores.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    try {
      // Check if role exists
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      toast({ title: 'Role atualizado', description: 'A permissão foi alterada com sucesso.' });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ title: 'Erro', description: 'Não foi possível alterar a permissão.', variant: 'destructive' });
    }
  };

  const updateUserStatus = async (userId: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo })
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ativo } : u))
      );
      toast({ title: 'Status atualizado', description: `Utilizador ${ativo ? 'ativado' : 'suspenso'}.` });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Erro', description: 'Não foi possível alterar o status.', variant: 'destructive' });
    }
  };

  const inviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: 'Erro', description: 'Introduza um email válido.', variant: 'destructive' });
      return;
    }

    setInviting(true);
    try {
      // Use Supabase Auth admin invite (requires service role or edge function)
      // For now, we'll show a message that the user should sign up
      toast({
        title: 'Convite',
        description: `O utilizador ${inviteEmail} deve registar-se na aplicação. Após o registo, pode atribuir-lhe a role desejada.`,
      });
      setInviteOpen(false);
      setInviteEmail('');
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({ title: 'Erro', description: 'Não foi possível enviar o convite.', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.nome?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">A carregar utilizadores...</div>;
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestão de Utilizadores
            </CardTitle>
            <CardDescription>Gerir utilizadores, permissões e estados</CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Convidar Utilizador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar Novo Utilizador</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role Inicial</Label>
                    <Select value={inviteRole} onValueChange={(v: AppRole) => setInviteRole(v)}>
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button onClick={inviteUser} disabled={inviting}>
                    {inviting ? 'A enviar...' : 'Enviar Convite'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState title="Sem utilizadores" description="Nenhum utilizador encontrado." />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.nome || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Select
                          value={user.role || 'viewer'}
                          onValueChange={(v: AppRole) => updateUserRole(user.id, v)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Visualizador</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={roleColors[user.role || 'viewer']}>
                          <Shield className="mr-1 h-3 w-3" />
                          {roleLabels[user.role || 'viewer']}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Select
                          value={user.ativo ? 'ativo' : 'suspenso'}
                          onValueChange={(v) => updateUserStatus(user.id, v === 'ativo')}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="suspenso">Suspenso</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={user.ativo ? 'default' : 'secondary'}>
                          {user.ativo ? 'Ativo' : 'Suspenso'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
