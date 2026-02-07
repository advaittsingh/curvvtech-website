'use client';

import { motion } from 'motion/react';

const heroAnimation = {
  initial: { y: '20%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 1, delay: 0.3 },
};

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function AnimatedHero({ children, className = '' }: Props) {
  return (
    <motion.div
      {...heroAnimation}
      className={className}
    >
      {children}
    </motion.div>
  );
}
