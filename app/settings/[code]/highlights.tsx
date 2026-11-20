import { AdminRoute } from "../../../src/modules/admin/Route";
import { PropHighlights } from "../../../src/modules/settings/PropHighlights";

/* Highlights (Settings → Property; lane mobile/m13-set-property). */
export default function HighlightsRoute() {
  return <AdminRoute screen={PropHighlights} />;
}
