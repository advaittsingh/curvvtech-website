type Props = {
  children: React.ReactNode;
  className?: string;
};

export function AnimatedHero({ children, className = '' }: Props) {
  return <div className={className}>{children}</div>;
}
