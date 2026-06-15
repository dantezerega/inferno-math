import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

const variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/** Animated page wrapper with a centered, max-width content column. */
export function PageShell({
  children,
  className,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <motion.main
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'mx-auto flex min-h-screen w-full flex-col px-5 py-8 sm:px-8',
        wide ? 'max-w-5xl' : 'max-w-2xl',
        className,
      )}
    >
      {/* Ambient ember glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-accent/15 via-flame-2/5 to-transparent blur-2xl"
      />
      {children}
    </motion.main>
  );
}
