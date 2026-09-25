type Props = {
  children: React.ReactNode;
  index?: number;
  delayIncrement?: number;
  className?: string;
};

export function AnimatedGridItem({
  children,
  className = '',
}: Props) {
  return <div className={className}>{children}</div>;
}
