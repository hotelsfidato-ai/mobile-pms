import { AdminRoute } from "../../../src/modules/admin/Route";
import { Roles } from "../../../src/modules/admin/Roles";

/* Roles and permissions (the web's /admin/roles, Settings → People and security). */
export default function RolesRoute() {
  return <AdminRoute screen={Roles} />;
}
