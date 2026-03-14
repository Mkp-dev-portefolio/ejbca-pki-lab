import { cn } from '@/lib/utils';

export function StatusIndicator({
  status,
  label,
  pulse = false,
}: {
  status: 'ok' | 'error' | 'warning' | 'unknown';
  label?: string;
  pulse?: boolean;
}) {
  const colors = {
    ok: 'bg-emerald-400',
    error: 'bg-red-400',
    warning: 'bg-amber-400',
    unknown: 'bg-slate-500',
  };

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {pulse && status === 'ok' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', colors[status])} />
      </span>
      {label && <span className="text-sm text-slate-300">{label}</span>}
    </span>
  );
}
