import { Link } from "react-router-dom";
import { List, ListItem, RelativeTime } from "../ui";
import type { EventDto } from "../lib/types";
import { eventDescription, eventKindLabel } from "../lib/format";

export interface EventListProps {
  events: readonly EventDto[];
  label?: string;
}

export function EventList({ events, label = "Activity" }: EventListProps) {
  return (
    <List label={label}>
      {events.map((event) => (
        <ListItem
          key={event.id}
          primary={eventDescription(event)}
          secondary={event.repo ? <Link to={`/repos/${event.repo}`}>{event.repo}</Link> : undefined}
          meta={`${eventKindLabel(event.kind)} · @${event.actor}`}
          trailing={<RelativeTime value={event.created_at} className="t-caption" />}
        />
      ))}
    </List>
  );
}
