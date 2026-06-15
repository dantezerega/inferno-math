import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useNotifications, type NotificationKind } from '@/store/notificationStore';
import { cn } from '@/utils/cn';

const ICON: Record<NotificationKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
};

const TONE: Record<NotificationKind, string> = {
  info: 'text-accent',
  success: 'text-success',
  error: 'text-danger',
};

/** Fixed, stacked toast notifications. Mounted once at the app root. */
export function Toasts() {
  const items = useNotifications((s) => s.items);
  const dismiss = useNotifications((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
      <AnimatePresence initial={false}>
        {items.map((n) => {
          const Icon = ICON[n.kind];
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 shadow-glass"
            >
              <Icon size={18} className={cn('mt-0.5 shrink-0', TONE[n.kind])} aria-hidden />
              <p className="flex-1 text-sm text-content">{n.message}</p>
              <button
                onClick={() => dismiss(n.id)}
                className="shrink-0 text-muted hover:text-content"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
