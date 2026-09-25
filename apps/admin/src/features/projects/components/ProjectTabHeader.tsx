type Props = {
  title: string;
  description?: string;
};

export function ProjectTabHeader({ title, description }: Props) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}
