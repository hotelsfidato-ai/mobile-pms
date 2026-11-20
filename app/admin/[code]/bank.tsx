import { AdminRoute } from "../../../src/modules/admin/Route";
import { Bank } from "../../../src/modules/admin/Bank";

/* Bank details (Settings → Money → Bank details). */
export default function BankRoute() {
  return <AdminRoute screen={Bank} />;
}
