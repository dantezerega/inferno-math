import { Flame } from 'lucide-react';
import { cn } from '@/utils/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-flame text-white shadow-glow">
        <Flame size={18} strokeWidth={2.5} fill="currentColor" />
      </div>
      <span className="text-lg font-bold tracking-tight text-content">
        Inferno
      </span>
    </div>
  );
}
