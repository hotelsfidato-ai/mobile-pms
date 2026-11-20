import { AdminRoute } from "../../../src/modules/admin/Route";
import { SignIns } from "../../../src/modules/admin/SignIns";

/* Sign-ins and devices (the web's /admin/sign-ins, Settings → People and security → Sign-ins and devices). */
export default function SignInsRoute() {
  return <AdminRoute screen={SignIns} />;
}
