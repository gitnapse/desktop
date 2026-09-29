import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Panel, StatusLine } from "../ui";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof console !== "undefined") {
      console.error("[gitnapse] render error", error, info.componentStack);
    }
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    return (
      <main className="app__content">
        <Panel title="Unhandled error" label="Runtime">
          <StatusLine kind="error" message={error.message} />
          <div className="settings-row">
            <Button variant="technical" onClick={this.reset}>
              Retry
            </Button>
            <Button
              variant="technical"
              onClick={() => {
                window.location.hash = "#/";
                this.reset();
              }}
            >
              Go home
            </Button>
          </div>
        </Panel>
      </main>
    );
  }
}
