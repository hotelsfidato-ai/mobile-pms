import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { asRole, mayReach } from "../../../src/core/menu";
import { Head, Screen } from "../../../src/core/ui";
import { RestaurantSetup } from "../../../src/modules/pos/SetupScreen";
import { NotYourRole } from "../../../src/modules/stores/kit";

/* Restaurant setup for one property (the web's /pos/:code/setup). The web's
   RequireAccess asks its menu: the owner, an administrator, the GM, and the
   kitchen manager for the KOT section (pos/nav.ts); the API asks again. */
export default function SetupRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  const role = roleAt(s.who, hotel.code);
  if (!mayReach(asRole(role), "/pos/:code/setup")) {
    return (
      <Screen refreshing={false} onRefresh={() => undefined}>
        <Head title="Restaurant setup" under={hotel.name} />
        <NotYourRole role={role} screen="Restaurant setup" />
      </Screen>
    );
  }
  return <RestaurantSetup hotel={hotel} role={role} />;
}
