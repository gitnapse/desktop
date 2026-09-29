import { useEffect, useState } from "react";
import * as bridge from "../lib/bridge";

export const serverAutoStartKey = "gitnapse.serverAutoStart";

export function readServerAutoStart(): boolean {
  if (typeof localStorage === "undefined") {
    return true;
  }
  // Default on: the app owns its server, so remote data works out of the box.
  return localStorage.getItem(serverAutoStartKey) !== "false";
}

export function writeServerAutoStart(value: boolean): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(serverAutoStartKey, value ? "true" : "false");
}

export function useServerAutoStartPreference(): [boolean, (value: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => readServerAutoStart());
  return [
    enabled,
    (value: boolean) => {
      writeServerAutoStart(value);
      setEnabled(value);
    },
  ];
}

export function useServerAutoStart(): void {
  useEffect(() => {
    if (!readServerAutoStart()) {
      return;
    }
    void bridge.serverStart().catch(() => undefined);
  }, []);
}
