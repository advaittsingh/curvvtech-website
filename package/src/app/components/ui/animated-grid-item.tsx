'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

type Props = {
  children: React.ReactNode;
  index: number;
  /** Delay increment per index (seconds) */
  delayIncrement?: number;
  className?: string;
};

export function AnimatedGridItem({
  children,
  index,
  delayIncrement = 0.12,
  className = '',
}: Props) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ y: '20%', opacity: 0, filter: 'blur(4px)' }}
      animate={
        inView
          ? { y: 0, opacity: 1, filter: 'blur(0px)' }
          : { y: '20%', opacity: 0, filter: 'blur(4px)' }
      }
      transition={{
        duration: 0.5,
        delay: index * delayIncrement,
        ease: 'easeOut' as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
