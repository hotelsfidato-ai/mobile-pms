import { AdminRoute } from "../../../src/modules/admin/Route";
import { MsgSwitches } from "../../../src/modules/settings/MsgSwitches";

/* Guest messages on/off (Settings → Messages: the owner, an administrator and the GM; lane m13-set-messages). */
export default function MsgSwitchesRoute() {
  return <AdminRoute screen={MsgSwitches} />;
}
