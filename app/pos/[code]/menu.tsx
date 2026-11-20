import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { MenuEditor } from "../../../src/modules/pos/MenuScreen";

/* The Menu for one property (the web's /pos/:code/menu). The web guards it
   with the POS gate only (routes.tsx); the API reads the menu for whoever may
   see it and refuses each change to anyone but the menu's four. */
export default function MenuRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <MenuEditor hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
