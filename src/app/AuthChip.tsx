import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LogIn, LogOut, Settings, User } from "lucide-react";
import { Badge, Dropdown, DropdownItem } from "../ui";
import * as bridge from "../lib/bridge";
import { authSourceLabel } from "../lib/format";
import { authQueryKey, useSignOut } from "./auth";

export function AuthChip() {
  const auth = useQuery({ queryKey: authQueryKey, queryFn: bridge.authStatus });
  const signOut = useSignOut();
  const navigate = useNavigate();

  if (auth.isPending) {
    return <Badge>AUTH…</Badge>;
  }

  if (auth.isError) {
    return <Badge tone="warn">AUTH UNKNOWN</Badge>;
  }

  const { has_token, login, source } = auth.data;
  const sourceLabel = authSourceLabel(source);
  const label = has_token ? (login ? `@${login}` : sourceLabel) : "SIGN IN";

  return (
    <Dropdown align="end" label="Account menu" trigger={<Badge tone={has_token ? "ok" : "neutral"}>{label}</Badge>}>
      {has_token && login ? (
        <DropdownItem icon={User} onSelect={() => navigate(`/users/${login}`)}>
          Open profile
        </DropdownItem>
      ) : null}
      {has_token ? (
        <DropdownItem icon={Settings} onSelect={() => navigate("/settings")}>
          {`Account settings · ${sourceLabel}`}
        </DropdownItem>
      ) : (
        <DropdownItem icon={LogIn} onSelect={() => navigate("/settings")}>
          Sign in
        </DropdownItem>
      )}
      {has_token ? (
        <DropdownItem
          icon={LogOut}
          disabled={signOut.isPending}
          onSelect={() => signOut.mutate()}
        >
          Sign out
        </DropdownItem>
      ) : null}
    </Dropdown>
  );
}
