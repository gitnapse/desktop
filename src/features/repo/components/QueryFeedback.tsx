import { RefreshCw } from "lucide-react";
import { Button, StatusLine } from "../../../ui";

export interface QueryFeedbackProps {
  pending?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function QueryFeedback({ pending = false, error = null, onRetry }: QueryFeedbackProps) {
  if (pending) {
    return <StatusLine kind="loading" />;
  }
  if (error) {
    return (
      <div className="settings-row">
        <StatusLine kind="error" message={error.message} />
        {onRetry ? (
          <Button variant="technical" icon={RefreshCw} onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }
  return null;
}
