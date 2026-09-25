import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("loading chunk") ||
    msg.includes("loading css chunk")
  );
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // After a deploy, the browser may still have an old index that references
    // removed hashed chunks — a hard reload fetches the new asset manifest.
    if (isChunkLoadError(error)) {
      const key = "admin_chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }

  private handleRetry = () => {
    const err = this.state.error;
    if (err && isChunkLoadError(err)) {
      sessionStorage.removeItem("admin_chunk_reload");
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const chunk = isChunkLoadError(this.state.error);
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            background: "#fafaf9",
            color: "#1c1917",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#78716c", fontSize: "0.875rem", marginBottom: 16, maxWidth: 400, textAlign: "center" }}>
            {chunk
              ? "A new version of the admin panel is available. Reload to continue."
              : this.state.error.message}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: "8px 16px",
              background: "#1c1917",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            {chunk ? "Reload" : "Try again"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
