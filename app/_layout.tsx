import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { HeldBar } from "../src/core/HeldBar";
import { SessionProvider, useSession } from "../src/core/session";
import { c } from "../src/core/theme";

/* ══════════════════════════════════════════════════════════════════
   THE FIDATO PMS ON A PHONE — every screen sits in this one stack
   (expo-router, M-4). A route file only finds who is signed in and hands
   a module's screen what it needs; the screens live in src/modules.
   Android's back button walks the stack; signing in and out replaces it.
   ══════════════════════════════════════════════════════════════════ */

/* The web's own read settings (src/App.tsx): no retries, no re-read on
   focus. Unlike the web, nothing is kept stale: every screen re-reads its
   figures when it opens, as the web does for money (FIN-3).
   ponytail: memory only - a week on disk (the web's persister) comes with
   slice 2's offline work. */
const cache = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });

export default function Layout() {
  /* The Type Ladder's three faces (src/core/theme.ts). If they cannot
     load, the phone's own font is used rather than a blank screen. */
  const [loaded, failed] = useFonts({ Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!loaded && !failed) return null;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={cache}>
        <SessionProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: c.grey50 }}>
            <StatusBar style="dark" />
            <SignedInBar />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.grey50 } }} />
          </SafeAreaView>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/** The held changes belong to a person: shown, and sent, only while someone is signed in. */
function SignedInBar() {
  return useSession().who ? <HeldBar /> : null;
}
