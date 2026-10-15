import { Minus, Plus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { dateLong } from "../../core/format";
import { c, t } from "../../core/theme";
import { s } from "../../core/ui";
import { addDays } from "./block";

/** The day stepper, for every date on the housekeeping forms (M-7: no
    date-picker package; the web uses its date input). Never below `min`. */
export function Day({ label, value, min, off, onChange }: {
  label: string; value: string; min?: string; off: boolean; onChange: (date: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Step icon={Minus} a11y={`${label}: a day earlier`} disabled={off || (min != null && value <= min)} onPress={() => onChange(addDays(value, -1))} />
      <Text style={[t.label, t.tab, { flex: 1, textAlign: "center", color: off ? c.grey500 : c.ink900 }]} accessibilityLiveRegion="polite">
        {dateLong(value)}
      </Text>
      <Step icon={Plus} a11y={`${label}: a day later`} disabled={off} onPress={() => onChange(addDays(value, 1))} />
    </View>
  );
}

function Step({ icon: Icon, a11y, disabled, onPress }: { icon: typeof Plus; a11y: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y}
      style={({ pressed }) => [s.capsule, { width: 44, paddingHorizontal: 0 }, disabled ? { backgroundColor: c.grey50, borderColor: c.grey200 } : pressed && { backgroundColor: c.grey100 }]}
    >
      <Icon size={18} color={disabled ? c.grey300 : c.grey700} />
    </Pressable>
  );
}
