'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay per child (seconds). Wraps each child in a motion div with delayed animation. */
  staggerDelay?: number;
};

export function AnimatedSection({ children, className = '', staggerDelay }: Props) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const containerAnimation = {
    initial: { y: '25%', opacity: 0 },
    animate: inView ? { y: 0, opacity: 1 } : { y: '25%', opacity: 0 },
    transition: { duration: 0.5, ease: 'easeOut' as const },
  };

  if (staggerDelay != null && staggerDelay > 0) {
    const items = React.Children.toArray(children);
    return (
      <div ref={ref} className={className}>
        {items.map((child, index) => (
          <motion.div
            key={index}
            initial={{ y: '20%', opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : { y: '20%', opacity: 0 }}
            transition={{ duration: 0.4, delay: index * staggerDelay, ease: 'easeOut' as const }}
          >
            {child}
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      {...containerAnimation}
      className={className}
    >
      {children}
    </motion.div>
  );
}
