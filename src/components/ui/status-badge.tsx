import * as React from 'react';
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

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: ConsultaStatus;
}

interface OrigemBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  origem: ConsultaOrigem;
}

interface EstadoBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  estado: EstadoRegisto;
}

const badgeBase = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border";

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(badgeBase, statusColors[status], className)} {...props}>
        {statusLabels[status]}
      </span>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';

const OrigemBadge = React.forwardRef<HTMLSpanElement, OrigemBadgeProps>(
  ({ origem, className, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(badgeBase, origemColors[origem], className)} {...props}>
        {origemLabels[origem]}
      </span>
    );
  }
);
OrigemBadge.displayName = 'OrigemBadge';

const EstadoBadge = React.forwardRef<HTMLSpanElement, EstadoBadgeProps>(
  ({ estado, className, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(badgeBase, estadoColors[estado], className)} {...props}>
        {estadoLabels[estado]}
      </span>
    );
  }
);
EstadoBadge.displayName = 'EstadoBadge';

export { StatusBadge, OrigemBadge, EstadoBadge };
