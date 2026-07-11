import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  dismissTelegramAlert,
  useTelegramSessionAlert,
} from "@/hooks/useTelegramSessionWatchdog";
import { useColors } from "@/hooks/useColors";
import { router } from "expo-router";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const alert = useTelegramSessionAlert();

  // Extra top padding when the alert banner is visible
  const alertBannerHeight = alert ? 46 : 0;
  const topPad =
    Platform.OS === "web" ? 67 + alertBannerHeight : alertBannerHeight;

  const statusColor = alert ? colors.destructive : colors.accent;
  const statusLabel = alert ? "Session disconnected" : "Connected";
  const statusIcon: "wifi-off" | "wifi" = alert ? "wifi-off" : "wifi";

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + (Platform.OS !== "web" ? insets.top + 16 : 16),
          paddingBottom:
            Platform.OS === "web" ? 34 : insets.bottom + 16,
        },
      ]}
    >
      {/* Status card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={styles.statusBody}>
          <Text style={[styles.statusLabel, { color: colors.foreground }]}>
            Telegram Session
          </Text>
          <View style={styles.statusRow}>
            <Feather name={statusIcon} size={14} color={statusColor} />
            <Text style={[styles.statusValue, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
          {alert?.authorizationState ? (
            <Text style={[styles.statusDetail, { color: colors.mutedForeground }]}>
              State: {alert.authorizationState}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Alert CTA — only visible when a session drop is active */}
      {alert ? (
        <View style={[styles.alertCard, { borderColor: colors.destructive }]}>
          <Feather name="alert-triangle" size={20} color={colors.destructive} />
          <View style={styles.alertBody}>
            <Text style={[styles.alertTitle, { color: colors.foreground }]}>
              Re-authentication required
            </Text>
            <Text style={[styles.alertDesc, { color: colors.mutedForeground }]}>
              Your Telegram session ended unexpectedly. Open Settings to log in again and restore message delivery.
            </Text>
          </View>
          <View style={styles.alertActions}>
            <Pressable
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={() => {
                dismissTelegramAlert();
                router.push("/settings");
              }}
              accessibilityLabel="Open settings"
            >
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                Settings
              </Text>
            </Pressable>
            <Pressable
              style={[styles.btnOutline, { borderColor: colors.border }]}
              onPress={() => dismissTelegramAlert()}
              accessibilityLabel="Dismiss alert"
            >
              <Text style={[styles.btnOutlineText, { color: colors.mutedForeground }]}>
                Dismiss
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Info row */}
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          This app monitors your EPICGRAM Telegram session and alerts you
          instantly if the connection drops unexpectedly.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  statusBody: { flex: 1, gap: 2 },
  statusLabel: { fontSize: 13, fontWeight: "600" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusValue: { fontSize: 14, fontWeight: "700" },
  statusDetail: { fontSize: 11, marginTop: 2 },
  alertCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
    alignItems: "flex-start",
    flexDirection: "column",
  },
  alertBody: { gap: 4 },
  alertTitle: { fontSize: 14, fontWeight: "700" },
  alertDesc: { fontSize: 13, lineHeight: 18 },
  alertActions: { flexDirection: "row", gap: 8 },
  btn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnText: { fontSize: 13, fontWeight: "700" },
  btnOutline: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnOutlineText: { fontSize: 13, fontWeight: "600" },
  infoCard: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
