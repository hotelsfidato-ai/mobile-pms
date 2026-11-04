import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Tables } from "../../../src/modules/pos/Tables";

/* /pos/5EL/tables - the waiter's first screen (the web's WORKING_HOME for
   the till). A waiter lands here with nothing behind it: Sign out, not All. */
export default function TablesRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Tables
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      {...(router.canGoBack() ? { onBack: () => router.back() } : { onSignOut: s.signOut })}
    />
  );
}
