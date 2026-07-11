import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTelegramSessionAlert } from "@/hooks/useTelegramSessionWatchdog";

type RowProps = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sub?: string;
  accent?: boolean;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
};

function Row({ icon, label, sub, accent, onPress, colors }: RowProps) {
  const textColor = accent ? colors.primary : colors.foreground;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Feather name={icon} size={18} color={accent ? colors.primary : colors.accent} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{sub}</Text>
        ) : null}
      </View>
      {onPress ? (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const alert = useTelegramSessionAlert();
  const alertBannerHeight = alert ? 46 : 0;
  const topPad =
    Platform.OS === "web" ? 67 + alertBannerHeight : alertBannerHeight;

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const webUrl = domain ? `https://${domain}/settings` : null;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + (Platform.OS !== "web" ? insets.top + 16 : 16),
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16,
        },
      ]}
    >
      {/* Session alert prompt */}
      {alert ? (
        <View style={[styles.alertBadge, { backgroundColor: "#7a1f1f" }]}>
          <Feather name="alert-triangle" size={14} color="#fff" />
          <Text style={styles.alertBadgeText}>
            Session offline — re-authenticate below
          </Text>
        </View>
      ) : null}

      <Text style={[styles.section, { color: colors.mutedForeground }]}>
        TELEGRAM
      </Text>

      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row
          icon="log-in"
          label="Re-authenticate"
          sub={
            alert
              ? "Session dropped — tap to open the web app"
              : "Manage Telegram account in the web app"
          }
          accent={!!alert}
          onPress={webUrl ? () => Linking.openURL(`${webUrl}`) : undefined}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Row
          icon="monitor"
          label="Open EPICGRAM web"
          sub="Full admin interface"
          onPress={webUrl ? () => Linking.openURL(`https://${domain}`) : undefined}
          colors={colors}
        />
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>
        ABOUT
      </Text>

      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row
          icon="bell"
          label="Session alerts"
          sub="Notified instantly when your Telegram session drops"
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Row
          icon="shield"
          label="EPICGRAM Mobile"
          sub="Session watchdog companion app"
          colors={colors}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 8 },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  alertBadgeText: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1 },
  section: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 8 },
  group: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 46 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14, fontWeight: "600" },
  rowSub: { fontSize: 12, lineHeight: 16 },
});
