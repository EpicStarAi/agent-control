import React from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  dismissTelegramAlert,
  useTelegramSessionAlert,
} from "@/hooks/useTelegramSessionWatchdog";

/**
 * Global fixed banner — mounts once in the root layout and shows whenever the
 * owner's Telegram session drops unexpectedly (auth.state_changed +
 * unexpectedDrop=true on the SSE bus). Mirrors TelegramSessionAlertBanner.tsx
 * from epicgram-web but uses React Native primitives.
 */
export default function SessionAlertBanner() {
  const alert = useTelegramSessionAlert();

  if (!alert) return null;

  function handleGoToSettings() {
    dismissTelegramAlert();
    router.push("/settings");
  }

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Feather
        name="alert-triangle"
        size={16}
        color="#fff"
        style={styles.icon}
      />
      <Text style={styles.message} numberOfLines={2}>
        Telegram session disconnected
        {alert.authorizationState ? ` (${alert.authorizationState})` : ""}.
        Re-authenticate in Settings.
      </Text>
      <Pressable
        onPress={handleGoToSettings}
        style={styles.settingsBtn}
        accessibilityLabel="Open settings to re-authenticate"
        hitSlop={8}
      >
        <Text style={styles.settingsText}>Settings</Text>
      </Pressable>
      <Pressable
        onPress={() => dismissTelegramAlert()}
        style={styles.closeBtn}
        accessibilityLabel="Dismiss alert"
        hitSlop={8}
      >
        <Feather name="x" size={16} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: Platform.OS === "web" ? 67 : 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7a1f1f",
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  icon: {
    flexShrink: 0,
  },
  message: {
    flex: 1,
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  settingsBtn: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  settingsText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    flexShrink: 0,
  },
});
