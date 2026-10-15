import { Redirect, router } from "expo-router";
import { useSession } from "../src/core/session";
import { AllProperties } from "../src/modules/reports/AllProperties";

export default function AllPropertiesRoute() {
  const s = useSession();
  if (!s.who) return <Redirect href="/" />;
  return (
    <AllProperties
      hotels={s.who.hotels}
      who={s.who.scope.fullName}
      onOpen={(hotel) => router.push(`/hotel/${hotel.code}`)}
      onSignOut={s.signOut}
    />
  );
}
