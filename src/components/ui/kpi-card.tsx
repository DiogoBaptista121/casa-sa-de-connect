import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  loading?: boolean;
  className?: string;
  iconClassName?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  loading,
  className,
  iconClassName,
}: KpiCardProps) {
  return (
    <div className={cn("kpi-card animate-fade-in", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-9 w-20 bg-muted rounded animate-pulse mt-1" />
          ) : (
            <p className="text-3xl font-display font-bold text-foreground mt-1">
              {value}
            </p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                "text-xs font-medium",
                trend.positive ? "text-success" : "text-destructive"
              )}>
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl",
          "bg-primary/10",
          iconClassName
        )}>
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
