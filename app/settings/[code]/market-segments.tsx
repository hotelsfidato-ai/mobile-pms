import { AdminRoute } from "../../../src/modules/admin/Route";
import { MarketSegments } from "../../../src/modules/settings/Lists";

/* Market segments (Settings → Lists): the list screen, its kind from lists.ts LIST_PAGES. */
export default function MarketSegmentsRoute() {
  return <AdminRoute screen={MarketSegments} />;
}
