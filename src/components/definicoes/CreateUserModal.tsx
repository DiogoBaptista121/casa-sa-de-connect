import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import type { AppRole } from '@/types/database';

interface CreateUserModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const roleLabels: Record<AppRole, string> = {
    admin: 'Administrador',
    manager: 'Gestor',
    staff: 'Colaborador',
    viewer: 'Visualizador',
};

export function CreateUserModal({ open, onOpenChange, onSuccess }: CreateUserModalProps) {
    const [email, setEmail] = useState('');
    const [nome, setNome] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<AppRole>('viewer');
    const [sendWelcome, setSendWelcome] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!email.trim()) newErrors.email = 'Email é obrigatório';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Email inválido';
        if (!nome.trim()) newErrors.nome = 'Nome é obrigatório';
        if (!password) newErrors.password = 'Password é obrigatória';
        else if (password.length < 6) newErrors.password = 'Password deve ter pelo menos 6 caracteres';
        return newErrors;
    };

    const handleSubmit = async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});
        setLoading(true);

        try {
            // Step 1: Create user directly via Admin RPC (bypasses "Signups not allowed")
            // This function handlesauth.users, auth.identities, roles, and profiles atomically.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: createdUserId, error: authError } = await (supabase.rpc as any)('admin_create_user', {
                email_str: email.trim().toLowerCase(),
                password_str: password,
                nome_str: nome.trim(),
                role_str: role
            });

            if (authError) throw new Error(authError.message);
            if (!createdUserId) throw new Error('Utilizador não foi criado corretamente.');

            // Wait briefly for the UI to be ready to fetch
            await new Promise(resolve => setTimeout(resolve, 800));

            toast({
                title: 'Utilizador criado com sucesso',
                description: `${nome} foi adicionado como ${roleLabels[role]}.`,
            });

            // Reset form
            setEmail('');
            setNome('');
            setPassword('');
            setRole('viewer');
            setSendWelcome(true);
            onOpenChange(false);
            onSuccess();
        } catch (error) {
            console.error('[CreateUser] Error:', error);
            toast({
                title: 'Erro ao criar utilizador',
                description: error instanceof Error ? error.message : 'Erro desconhecido',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setEmail('');
            setNome('');
            setPassword('');
            setRole('viewer');
            setSendWelcome(true);
            setErrors({});
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Adicionar Utilizador
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Nome */}
                    <div className="space-y-1.5">
                        <Label htmlFor="create-nome">Nome completo *</Label>
                        <Input
                            id="create-nome"
                            placeholder="João Silva"
                            value={nome}
                            onChange={(e) => { setNome(e.target.value); setErrors(p => ({ ...p, nome: '' })); }}
                            disabled={loading}
                        />
                        {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <Label htmlFor="create-email">Email *</Label>
                        <Input
                            id="create-email"
                            type="email"
                            placeholder="joao@exemplo.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                            disabled={loading}
                        />
                        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <Label htmlFor="create-password">Password temporária *</Label>
                        <div className="relative">
                            <Input
                                id="create-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Mínimo 6 caracteres"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                                disabled={loading}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                    </div>

                    {/* Role */}
                    <div className="space-y-1.5">
                        <Label htmlFor="create-role">Permissão</Label>
                        <Select value={role} onValueChange={(v: AppRole) => setRole(v)} disabled={loading}>
                            <SelectTrigger id="create-role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="viewer">Visualizador — só leitura</SelectItem>
                                <SelectItem value="staff">Colaborador — ver e editar consultas</SelectItem>
                                <SelectItem value="manager">Gestor — gerir dados, sem admin</SelectItem>
                                <SelectItem value="admin">Administrador — acesso total</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Send welcome email */}
                    <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                            id="send-welcome"
                            checked={sendWelcome}
                            onCheckedChange={(v) => setSendWelcome(!!v)}
                            disabled={loading}
                        />
                        <Label htmlFor="send-welcome" className="text-sm font-normal cursor-pointer">
                            Enviar email de confirmação ao utilizador
                        </Label>
                    </div>

                    {!sendWelcome && (
                        <p className="text-xs text-muted-foreground bg-muted rounded p-2">
                            ⚠️ O utilizador receberá um email de confirmação do Supabase independentemente desta opção.
                            Partilhe a password temporária com o utilizador de forma segura.
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'A criar...' : 'Criar Utilizador'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
