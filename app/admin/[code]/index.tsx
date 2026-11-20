import { AdminRoute } from "../../../src/modules/admin/Route";
import { Settings } from "../../../src/modules/admin/Settings";

/* The Settings console (the web's /settings): its groups and pages. */
export default function SettingsRoute() {
  return <AdminRoute screen={Settings} />;
}
