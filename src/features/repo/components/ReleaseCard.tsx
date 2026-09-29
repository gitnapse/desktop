import { useId, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Badge, Button, Markdown, RelativeTime } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { ReleaseDto } from "../../../lib/types";

export interface ReleaseCardProps {
  release: ReleaseDto;
  defaultOpen?: boolean;
}

export function ReleaseCard({ release, defaultOpen = false }: ReleaseCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const title = release.name ?? release.tag_name;

  return (
    <article className="releasecard glass-flat">
      <header className="releasecard__head">
        <div className="releasecard__titles">
          <p className="t-label releasecard__tag">{release.tag_name}</p>
          <h3 className="releasecard__name">{title}</h3>
        </div>
        <div className="releasecard__meta">
          {release.prerelease ? <Badge tone="warn">Pre-release</Badge> : null}
          <RelativeTime value={release.published_at ?? release.created_at} />
        </div>
      </header>
      {release.body ? (
        <>
          <div>
            <Button
              variant="technical"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? "Hide notes" : "Show notes"}
            </Button>
          </div>
          <div id={bodyId} className="releasecard__body" hidden={!open}>
            <Markdown source={release.body} />
          </div>
        </>
      ) : (
        <p className="t-label releasecard__empty">[NO RELEASE NOTES]</p>
      )}
      <footer className="releasecard__foot">
        <Button
          variant="technical"
          icon={ExternalLink}
          onClick={() => {
            void bridge.openExternal(release.html_url);
          }}
        >
          Open on GitHub
        </Button>
      </footer>
    </article>
  );
}
