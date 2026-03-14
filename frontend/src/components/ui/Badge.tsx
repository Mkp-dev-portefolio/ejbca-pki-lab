import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const variants: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  neutral: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

export function Badge({
  children,
  variant = 'neutral',
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: 'success',
    OK: 'success',
    REVOKED: 'danger',
    EXPIRED: 'danger',
    OFFLINE: 'danger',
    ERROR: 'danger',
    UNREACHABLE: 'danger',
    NEW: 'info',
    GENERATED: 'success',
    INPROCESS: 'warning',
    INITIALIZED: 'info',
    FAILED: 'danger',
    HISTORICAL: 'neutral',
    WARNING: 'warning',
  };
  return map[status] || 'neutral';
}
