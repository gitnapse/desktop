export interface LoadingTextProps {
  label?: string;
  className?: string;
}

export function LoadingText({ label = "LOADING", className }: LoadingTextProps) {
  return (
    <p
      className={["statusline", className].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
    >
      {`[${label}…]`}
    </p>
  );
}
