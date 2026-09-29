import { Markdown, Textarea } from "../../../ui";

export interface MarkdownFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  preview: boolean;
  rows?: number;
  placeholder?: string;
}

export function MarkdownField({
  label,
  value,
  onChange,
  preview,
  rows = 8,
  placeholder,
}: MarkdownFieldProps) {
  if (preview) {
    return (
      <div className="field">
        <span className="t-label field__label">{`${label} preview`}</span>
        <div className="markdownfield__preview glass-flat">
          {value.trim().length > 0 ? (
            <Markdown source={value} />
          ) : (
            <p className="t-label">[EMPTY]</p>
          )}
        </div>
      </div>
    );
  }
  return (
    <Textarea
      label={label}
      mono
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
