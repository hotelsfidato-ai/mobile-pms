import { AdminRoute } from "../../../src/modules/admin/Route";
import { Users } from "../../../src/modules/admin/Users";

/* Users (the web's /admin/users): the list of accounts. */
export default function UsersRoute() {
  return <AdminRoute screen={Users} />;
}
