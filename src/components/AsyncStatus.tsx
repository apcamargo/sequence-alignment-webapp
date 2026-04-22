interface AsyncStatusProps {
  error?: string | null;
  isLoading?: boolean;
  loadingMessage?: string;
}

export default function AsyncStatus({
  error,
  isLoading = false,
  loadingMessage = "Loading...",
}: AsyncStatusProps) {
  if (error) {
    return (
      <div className="rounded-md border border-border-default bg-surface-panel px-3 py-2 text-sm text-fg-primary shadow-sm">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-sm text-fg-secondary">{loadingMessage}</div>;
  }

  return null;
}
