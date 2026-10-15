import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { SessionProvider } from "../src/core/session";
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
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={cache}>
        <SessionProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: c.grey50 }}>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.grey50 } }} />
          </SafeAreaView>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
