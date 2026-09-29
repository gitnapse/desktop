import { Page } from "../Page";
import { EmptyState } from "../../ui";

export default function NotFoundPage() {
  return (
    <Page title="Not found" label="GitNapse // 404">
      <EmptyState
        title="NO ROUTE"
        hint="The requested view does not exist in this shell yet."
      />
    </Page>
  );
}
