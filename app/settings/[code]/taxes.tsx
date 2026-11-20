import { AdminRoute } from "../../../src/modules/admin/Route";
import { Taxes } from "../../../src/modules/settings/MoneyTaxes";

/* /settings/5EL/taxes — the web's /settings/rates/taxes: Taxes (Settings → Rates and tax → Taxes). Lane m13-set-money. */
export default function TaxesRoute() {
  return <AdminRoute screen={Taxes} />;
}
