import { AdminRoute } from "../../../src/modules/admin/Route";
import { SigningIn } from "../../../src/modules/admin/SigningIn";

/* Signing in (Settings → People and security → Signing in). */
export default function SigningInRoute() {
  return <AdminRoute screen={SigningIn} />;
}
