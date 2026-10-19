import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  CheckCheck,
  AlertTriangle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSocket } from "../hooks/useSocket";
import { ZONES } from "../types/zones";
import type { Zone } from "../types/zones";
import ZoneCard from "../components/ZoneCard";
import { COLORS, RADIUS, SPACING } from "../config/theme";

type Props = {
  onBack: () => void;
};

export default function ZoneSelectionScreen({ onBack }: Props) {
  const { currentZone, isConnected, subscribeToZone, zoneError } = useSocket();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleSelect = (zone: Zone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    subscribeToZone(zone);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={20} color={COLORS.text} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Selecciona tu zona</Text>
          <Text style={styles.headerSubtitle}>
            Recibirás alertas solo de esta zona
          </Text>
        </View>

        <View style={styles.backButton} />
      </View>

      {/* BANNER DE ESTADO */}
      <View
        style={[
          styles.connectionBanner,
          isConnected ? styles.bannerConnected : styles.bannerDisconnected,
        ]}
      >
        {isConnected ? (
          <CheckCircle2 size={16} color={COLORS.success} strokeWidth={2.5} />
        ) : (
          <AlertCircle size={16} color={COLORS.danger} strokeWidth={2.5} />
        )}
        <Text
          style={[
            styles.bannerText,
            { color: isConnected ? COLORS.success : COLORS.danger },
          ]}
        >
          {isConnected ? "Conectado al servidor" : "Sin conexión al servidor"}
        </Text>
      </View>

      {/* CONTENIDO */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>ZONAS DISPONIBLES</Text>

          {ZONES.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              selected={currentZone === zone.id}
              onPress={() => handleSelect(zone.id)}
              disabled={!isConnected}
            />
          ))}

          {!isConnected && (
            <View style={styles.infoBox}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.infoText}>
                Esperando conexión al servidor...
              </Text>
            </View>
          )}

          {zoneError && (
            <View style={styles.errorBox}>
              <AlertTriangle size={18} color={COLORS.danger} strokeWidth={2.5} />
              <Text style={styles.errorText}>{zoneError}</Text>
            </View>
          )}

          {currentZone && (
            <View style={styles.successBox}>
              <CheckCheck size={18} color={COLORS.success} strokeWidth={2.5} />
              <Text style={styles.successText}>
                Suscrito a zona {currentZone.toUpperCase()}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>UMSS · Ingeniería Informática</Text>
        <Text style={styles.footerText}>Servicios Telemáticos · Grupo 5</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === "android" ? 40 : 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: COLORS.grayBg,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  connectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xl,
    gap: 8,
  },
  bannerConnected: { backgroundColor: COLORS.successLight },
  bannerDisconnected: { backgroundColor: COLORS.dangerLight },
  bannerText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.grayLight,
    letterSpacing: 1.2,
    marginBottom: SPACING.md,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.grayBg,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 13,
    color: COLORS.gray,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  errorText: {
    marginLeft: 10,
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: "500",
    flex: 1,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  successText: {
    marginLeft: 10,
    fontSize: 13,
    color: COLORS.success,
    fontWeight: "700",
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
    paddingVertical: SPACING.lg,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.grayLight,
    lineHeight: 16,
  },
});