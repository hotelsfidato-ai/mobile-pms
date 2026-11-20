import { AdminRoute } from "../../../src/modules/admin/Route";
import { Discounts } from "../../../src/modules/settings/MoneyLists";

/* /settings/5EL/discounts — the web's /settings/money/discounts: Room discounts (Settings → Money → Room discounts). Lane m13-set-money. */
export default function DiscountsRoute() {
  return <AdminRoute screen={Discounts} />;
}
