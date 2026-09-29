export interface AvatarProps {
  login: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  labelled?: boolean;
}

export function Avatar({ login, src, size = "md", labelled = false }: AvatarProps) {
  const initials = login.slice(0, 1).toUpperCase();
  return (
    <span
      className={`avatar avatar--${size}`}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? login : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {src ? <img src={src} alt="" /> : initials}
    </span>
  );
}
