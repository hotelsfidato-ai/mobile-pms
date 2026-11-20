import { AdminRoute } from "../../../src/modules/admin/Route";
import { TimesAndRulesScreen } from "../../../src/modules/settings/ListsDesk";

/* Times and rules (Settings → Front desk): the hours, then the same rules card. */
export default function TimesAndRulesRoute() {
  return <AdminRoute screen={TimesAndRulesScreen} />;
}
