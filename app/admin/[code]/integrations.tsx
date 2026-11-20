import { AdminRoute } from "../../../src/modules/admin/Route";
import { Integrations } from "../../../src/modules/admin/Server";

/* Integrations (the web's /admin/integrations, Settings → Modules and connections). */
export default function IntegrationsRoute() {
  return <AdminRoute screen={Integrations} />;
}
