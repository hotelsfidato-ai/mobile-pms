import { AdminRoute } from "../../../src/modules/admin/Route";
import { FrontDeskRulesScreen } from "../../../src/modules/settings/ListsDesk";

/* Front desk rules (Settings → Front desk). */
export default function FrontDeskRoute() {
  return <AdminRoute screen={FrontDeskRulesScreen} />;
}
