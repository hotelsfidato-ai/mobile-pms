import { AdminRoute } from "../../../src/modules/admin/Route";
import { Modules } from "../../../src/modules/admin/Modules";

/* Modules (Settings → Modules and connections → Modules: the owner and an Admin). */
export default function ModulesRoute() {
  return <AdminRoute screen={Modules} />;
}
