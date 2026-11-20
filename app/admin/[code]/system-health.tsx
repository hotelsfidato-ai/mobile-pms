import { AdminRoute } from "../../../src/modules/admin/Route";
import { SystemHealth } from "../../../src/modules/admin/Server";

/* System health (the web's /admin/system-health, Settings → Modules and connections). */
export default function SystemHealthRoute() {
  return <AdminRoute screen={SystemHealth} />;
}
