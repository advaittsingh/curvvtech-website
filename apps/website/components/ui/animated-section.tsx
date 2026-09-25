import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
};

export function AnimatedSection({ children, className = '' }: Props) {
  return <div className={className}>{children}</div>;
}
