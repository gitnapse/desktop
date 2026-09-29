import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, KeyRound, LogOut, RefreshCw } from "lucide-react";
import { Badge, Button, IconButton, Input, StatusLine } from "../ui";
import * as bridge from "../lib/bridge";
import type { DeviceFlowPoll, DeviceFlowStart } from "../lib/types";
import { authSourceLabel } from "../lib/format";
import { authQueryKey, invalidateAuthState, useSignOut } from "./auth";

export interface AuthFlowProps {
  variant?: "onboarding" | "settings";
}

export function AuthFlow({ variant = "settings" }: AuthFlowProps) {
  const queryClient = useQueryClient();
  const auth = useQuery({ queryKey: authQueryKey, queryFn: bridge.authStatus });
  const signOut = useSignOut();
  const [token, setToken] = useState("");
  const [device, setDevice] = useState<DeviceFlowStart | null>(null);
  const [poll, setPoll] = useState<DeviceFlowPoll | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const saveToken = useMutation({
    mutationFn: bridge.authSetToken,
    onSuccess: () => {
      setToken("");
      invalidateAuthState(queryClient);
    },
  });

  const beginFlow = useMutation({
    mutationFn: () => bridge.authLoginBegin(),
    onSuccess: (data) => {
      setDevice(data);
      setPoll(null);
      setPollError(null);
      setCopied(false);
    },
  });

  useEffect(() => {
    if (auth.data?.has_token) {
      setDevice(null);
      setPoll(null);
      setPollError(null);
      setCopied(false);
    }
  }, [auth.data?.has_token]);

  useEffect(() => {
    if (!device) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const delay = Math.max(device.interval, 1) * 1000;
    const tick = () => {
      bridge
        .authLoginPoll(device.device_code)
        .then((result) => {
          if (cancelled) {
            return;
          }
          setPoll(result);
          if (result.status === "pending") {
            timer = setTimeout(tick, delay);
          } else if (result.status === "slow_down") {
            timer = setTimeout(tick, delay * 2);
          } else if (result.status === "done") {
            invalidateAuthState(queryClient);
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setPollError(error instanceof Error ? error.message : String(error));
          }
        });
    };
    timer = setTimeout(tick, delay);
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [device, queryClient]);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function cancelFlow() {
    setDevice(null);
    setPoll(null);
    setPollError(null);
    setCopied(false);
  }

  function submitToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = token.trim();
    if (value.length > 0) {
      saveToken.mutate(value);
    }
  }

  if (auth.isPending) {
    return <StatusLine kind="loading" />;
  }

  if (auth.isError) {
    return (
      <div className="settings-stack">
        <StatusLine kind="error" message={auth.error.message} />
        <div className="auth-actions">
          <Button variant="technical" icon={RefreshCw} onClick={() => void auth.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (auth.data.has_token) {
    return (
      <div className="settings-stack">
        <div className="auth-status">
          <StatusLine
            kind="saved"
            message={auth.data.login ? `signed in as @${auth.data.login}` : "token present"}
          />
          <Badge tone="ok">{authSourceLabel(auth.data.source)}</Badge>
        </div>
        {variant === "settings" ? (
          <div className="settings-row">
            <span className="t-caption">
              The token lives in the core secure store; this UI keeps no copy.
            </span>
            <Button
              variant="technical"
              danger
              icon={LogOut}
              disabled={signOut.isPending}
              onClick={() => signOut.mutate()}
            >
              Sign out
            </Button>
          </div>
        ) : null}
        {signOut.isError ? <StatusLine kind="error" message={signOut.error.message} /> : null}
      </div>
    );
  }

  return (
    <div className="settings-stack">
      {variant === "onboarding" ? (
        <p className="t-body-sm auth-intro">
          Connect a GitHub identity to load repositories, starred projects and activity. Both
          paths write to the same core secure store used by the CLI and TUI.
        </p>
      ) : null}
      <div className="authgrid">
        <div className="authblock">
          <p className="t-label">Personal access token</p>
          <form className="auth-form" onSubmit={submitToken}>
            <Input
              label="Token"
              type="password"
              mono
              autoComplete="off"
              spellCheck={false}
              placeholder="ghp_…"
              hint="Classic or fine-grained token with repo scope."
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <div className="auth-actions">
              <Button
                type="submit"
                primary
                disabled={token.trim().length === 0 || saveToken.isPending}
              >
                Save token
              </Button>
            </div>
          </form>
          {saveToken.isPending ? <StatusLine kind="loading" /> : null}
          {saveToken.isError ? (
            <StatusLine kind="error" message={saveToken.error.message} />
          ) : null}
        </div>
        <div className="authblock">
          <p className="t-label">Device flow</p>
          {!device ? (
            <div className="auth-form">
              <p className="t-caption">
                Generate a one-time code, approve it on GitHub, and the session signs in by
                itself.
              </p>
              <div className="auth-actions">
                <Button
                  variant="technical"
                  icon={KeyRound}
                  disabled={beginFlow.isPending}
                  onClick={() => beginFlow.mutate()}
                >
                  Start device flow
                </Button>
              </div>
              {beginFlow.isPending ? <StatusLine kind="loading" /> : null}
              {beginFlow.isError ? (
                <StatusLine kind="error" message={beginFlow.error.message} />
              ) : null}
            </div>
          ) : (
            <div className="device">
              <ol className="authsteps">
                <li>Open the GitHub device page and enter the code below.</li>
                <li>Approve access for GitNapse. This panel completes sign-in on its own.</li>
              </ol>
              <div className="device__code">
                <code className="t-data">{device.user_code}</code>
                <IconButton
                  icon={Copy}
                  label="Copy user code"
                  onClick={() => void copyCode(device.user_code)}
                />
                <Button
                  variant="technical"
                  icon={ExternalLink}
                  onClick={() => void bridge.openExternal(device.verification_uri)}
                >
                  {device.verification_uri.replace(/^https?:\/\//, "")}
                </Button>
              </div>
              {copied ? <StatusLine kind="saved" message="code copied" /> : null}
              {poll?.status === "pending" ? (
                <StatusLine kind="loading" message="waiting for approval" />
              ) : null}
              {poll?.status === "slow_down" ? (
                <StatusLine kind="warn" message="polling slowed down" />
              ) : null}
              {poll?.status === "denied" ? (
                <StatusLine kind="error" message="authorization denied" />
              ) : null}
              {poll?.status === "expired" ? (
                <StatusLine kind="error" message="device code expired" />
              ) : null}
              {pollError ? <StatusLine kind="error" message={pollError} /> : null}
              <div className="auth-actions">
                <Button variant="technical" onClick={cancelFlow}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
