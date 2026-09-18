import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useUpdateStore } from "../store/updateStore";
import { useTheme } from "../utils/theme";
import { Icon } from "./Icon";
import { getCurrentAppVersion } from "../services/updateService";

export function UpdateModal() {
  const theme = useTheme();
  const showModal = useUpdateStore((s) => s.showModal);
  const updateInfo = useUpdateStore((s) => s.updateInfo);
  const dismissModal = useUpdateStore((s) => s.dismissModal);
  const install = useUpdateStore((s) => s.install);

  if (!showModal || !updateInfo) {
    return null;
  }

  const { versionName: currentVersion } = getCurrentAppVersion();
  const newVersion = updateInfo.versionName;
  const isMandatory = updateInfo.isMandatory;

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={isMandatory ? undefined : dismissModal}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Top Icon Badge */}
          <View style={styles.headerIconContainer}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: `${theme.accent}18`,
                  borderColor: `${theme.accent}40`,
                },
              ]}
            >
              <Icon name="download" size={28} color={theme.accent} />
            </View>
          </View>

          {/* Modal Header */}
          <Text
            style={[styles.title, { color: theme.primaryText }]}
            numberOfLines={1}
          >
            Update Available!
          </Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            A new version of Aruvi Play is ready to install.
          </Text>

          {/* Version Pill Banner */}
          <View
            style={[
              styles.versionBanner,
              {
                backgroundColor: theme.elevatedSurface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.versionColumn}>
              <Text style={[styles.versionLabel, { color: theme.mutedText }]}>
                CURRENT
              </Text>
              <Text
                style={[styles.versionText, { color: theme.secondaryText }]}
              >
                v{currentVersion}
              </Text>
            </View>

            <Text style={[styles.arrowText, { color: theme.accent }]}>➔</Text>

            <View style={styles.versionColumn}>
              <Text style={[styles.versionLabel, { color: theme.accent }]}>
                NEW VERSION
              </Text>
              <View
                style={[
                  styles.newVersionBadge,
                  { backgroundColor: `${theme.accent}20` },
                ]}
              >
                <Text style={[styles.newVersionText, { color: theme.accent }]}>
                  v{newVersion}
                </Text>
              </View>
            </View>
          </View>

          {/* Release Notes */}
          {Boolean(updateInfo.releaseNotes) && (
            <View style={styles.notesContainer}>
              <Text
                style={[styles.notesHeader, { color: theme.secondaryText }]}
              >
                What's New:
              </Text>
              <ScrollView
                style={[
                  styles.notesScroll,
                  {
                    backgroundColor: theme.elevatedSurface,
                    borderColor: theme.border,
                  },
                ]}
                contentContainerStyle={styles.notesContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator={true}
              >
                <Text
                  style={[styles.notesBody, { color: theme.primaryText }]}
                >
                  {updateInfo.releaseNotes}
                </Text>
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {!isMandatory && (
              <Pressable
                onPress={dismissModal}
                style={({ pressed }) => [
                  styles.laterButton,
                  {
                    backgroundColor: theme.elevatedSurface,
                    borderColor: theme.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[styles.laterText, { color: theme.secondaryText }]}>
                  Later
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={install}
              style={({ pressed }) => [
                styles.installButton,
                {
                  backgroundColor: theme.accent,
                  opacity: pressed ? 0.85 : 1,
                },
                isMandatory ? { flex: 1 } : null,
              ]}
            >
              <Icon name="download" size={16} color="#000000" />
              <Text style={styles.installText}>Download & Install</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  headerIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  versionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  versionColumn: {
    alignItems: "center",
  },
  versionLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  versionText: {
    fontSize: 14,
    fontWeight: "700",
  },
  arrowText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  newVersionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newVersionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  notesContainer: {
    marginTop: 16,
  },
  notesHeader: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesScroll: {
    maxHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
  },
  notesContent: {
    padding: 12,
  },
  notesBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
  },
  laterButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  laterText: {
    fontSize: 13,
    fontWeight: "700",
  },
  installButton: {
    flex: 1.6,
    flexDirection: "row",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  installText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "800",
  },
});
