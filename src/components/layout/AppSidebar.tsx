import { 
  Home, 
  CreditCard, 
  Calendar, 
  CalendarDays,
  Stethoscope,
  BarChart3,
  FileSpreadsheet,
  Settings,
  LogOut,
  HeartPulse
} from 'lucide-react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Início', url: '/', icon: Home },
  { title: 'Cartão de Saúde', url: '/cartao-saude', icon: CreditCard },
  { title: 'Consultas', url: '/consultas', icon: Calendar },
  { title: 'Calendário', url: '/calendario', icon: CalendarDays },
  { title: 'Medicina do Trabalho', url: '/medicina-trabalho', icon: Stethoscope },
  { title: 'Dashboard', url: '/dashboard', icon: BarChart3 },
  { title: 'Importar/Exportar', url: '/importar-exportar', icon: FileSpreadsheet },
  { title: 'Definições', url: '/definicoes', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const isCollapsed = state === 'collapsed';

  const getInitials = (nome: string | null) => {
    if (!nome) return 'U';
    return nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'staff': return 'Colaborador';
      case 'viewer': return 'Visualizador';
      default: return 'Utilizador';
    }
  };

  return (
    <Sidebar className="sidebar-gradient border-r-0">
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-display font-semibold text-white">Casa de Saúde</span>
              <span className="text-xs text-white/70">Sistema de Gestão</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url || 
                  (item.url !== '/' && location.pathname.startsWith(item.url));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <RouterNavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                          "text-white/80 hover:text-white hover:bg-white/10",
                          isActive && "bg-white/15 text-white font-medium shadow-sm"
                        )}
                      >
                        <item.icon className={cn(
                          "w-5 h-5 flex-shrink-0",
                          isActive ? "text-white" : "text-white/70"
                        )} />
                        {!isCollapsed && (
                          <span className="truncate">{item.title}</span>
                        )}
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-9 h-9 border-2 border-white/20">
            <AvatarFallback className="bg-white/15 text-white text-sm font-medium">
              {getInitials(profile?.nome)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.nome || 'Utilizador'}
              </p>
              <p className="text-xs text-white/60 truncate">
                {getRoleLabel(role)}
              </p>
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          onClick={signOut}
          className={cn(
            "w-full justify-start gap-2 text-white/80 hover:text-white hover:bg-accent/80",
            "bg-accent/60 border border-accent/20",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span>Terminar Sessão</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
