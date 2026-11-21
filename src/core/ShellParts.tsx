import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet } from "react-native";

/* What the frame's pieces share (Shell, ShellAccount, ShellMenu, ShellNotes). In a file of its own:
   kept in Shell.tsx, the pieces and the frame imported each other, and on load ShellAccount's styles
   read `regular` before it existed - the whole app stopped at its first screen (MEMORY 28). */

/** The web's regular weight. theme.ts's `face` starts at 500. */
export const regular = { fontFamily: "Inter_400Regular" };
/** text-sm / text-base: the web's 14 on 21. */
export const body = { fontSize: 14, lineHeight: 21 };

/** bg-ink-900/40, the drawer's and the dialog's. */
export const SCRIM = "rgba(3,23,40,0.4)";

/** A drawer from one side (AppShell.tsx, Overlays.tsx): 200 ms, as motion-drawer. */
export function Slide({ from, width, scrim, onClose, children }: {
  from: "left" | "right"; width: number; scrim: string; onClose: () => void; children: ReactNode;
}) {
  const x = useRef(new Animated.Value(from === "left" ? -width : width)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" }).start();
  }, [x]);
  return (
    <Modal transparent visible onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width, transform: [{ translateX: x }] }, from === "left" ? { left: 0 } : { right: 0 }]}>
        {children}
      </Animated.View>
    </Modal>
  );
}
