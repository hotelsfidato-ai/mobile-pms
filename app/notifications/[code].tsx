import { Redirect, useLocalSearchParams } from "expo-router";
import { useSession } from "../../src/core/session";
import { NotesScreen } from "../../src/core/ShellNotes";

/* The web's /notifications, with the property in the route. */
export default function NotificationsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <NotesScreen hotel={hotel} />;
}
