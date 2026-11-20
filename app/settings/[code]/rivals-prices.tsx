import { AdminRoute } from "../../../src/modules/admin/Route";
import { MsgRivals } from "../../../src/modules/settings/MsgRivals";

/* Rivals' prices (Settings → Modules and connections: the owner, an administrator and the GM; lane m13-set-messages). */
export default function MsgRivalsRoute() {
  return <AdminRoute screen={MsgRivals} />;
}
