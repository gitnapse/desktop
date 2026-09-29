import { useCallback, useEffect, useRef, useState } from "react";

export function useCopy(): { copied: boolean; copy: (value: string) => void } {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  const copy = useCallback((value: string) => {
    if (!navigator.clipboard) {
      return;
    }
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        if (timer.current !== null) {
          window.clearTimeout(timer.current);
        }
        timer.current = window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => undefined);
  }, []);

  return { copied, copy };
}
