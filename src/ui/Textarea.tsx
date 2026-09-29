import { useId, type ComponentPropsWithoutRef } from "react";

export interface TextareaProps extends ComponentPropsWithoutRef<"textarea"> {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
}

export function Textarea({
  label,
  hint,
  error,
  mono = false,
  id,
  className,
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const hintId = hint ? `${textareaId}-hint` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      {label ? (
        <label className="t-label field__label" htmlFor={textareaId}>
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        className={["textarea", mono ? "textarea--mono" : "", className ?? ""]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {hint ? (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field__error">{`[ERROR: ${error}]`}</p>
      ) : null}
    </div>
  );
}
