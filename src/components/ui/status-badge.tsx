import { cn } from '@/lib/utils';
import { 
  ConsultaStatus, 
  ConsultaOrigem, 
  EstadoRegisto,
  statusLabels,
  statusColors,
  origemLabels,
  origemColors,
  estadoLabels,
  estadoColors,
} from '@/types/database';

interface StatusBadgeProps {
  status: ConsultaStatus;
  className?: string;
}

interface OrigemBadgeProps {
  origem: ConsultaOrigem;
  className?: string;
}

interface EstadoBadgeProps {
  estado: EstadoRegisto;
  className?: string;
}

const badgeBase = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border";

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(badgeBase, statusColors[status], className)}>
      {statusLabels[status]}
    </span>
  );
}

export function OrigemBadge({ origem, className }: OrigemBadgeProps) {
  return (
    <span className={cn(badgeBase, origemColors[origem], className)}>
      {origemLabels[origem]}
    </span>
  );
}

export function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  return (
    <span className={cn(badgeBase, estadoColors[estado], className)}>
      {estadoLabels[estado]}
    </span>
  );
}
