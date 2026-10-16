import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "../hooks/useSocket";
import { SERVER_URL } from "../config/env";
import { COLORS, RADIUS, SPACING } from "../config/theme";

type Props = {
  onManageZones: () => void;
};

function AlertBell({ connected }: { connected: boolean }) {
  return (
    <View
      style={[styles.headerIconContainer, !connected && styles.headerIconOff]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        connected ? "Alertas activas" : "Alertas desactivadas"
      }
    >
      <Ionicons
        name={connected ? "notifications" : "notifications-off"}
        size={36}
        color={COLORS.white}
      />
      <View
        style={[
          styles.bellBadge,
          { backgroundColor: connected ? COLORS.success : COLORS.danger },
        ]}
      />
    </View>
  );
}

export default function ConnectionStatusScreen({ onManageZones }: Props) {
  const { isConnected, socketId, reconnect, currentZone } = useSocket();
  const [showDetails, setShowDetails] = useState<boolean>(true);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* HEADER */}
      <View style={styles.header}>
        <AlertBell connected={isConnected} />
        <Text style={styles.headerTitle}>Alertas Comunitarias</Text>
        <Text style={styles.headerSubtitle}>Emergencias en tiempo real</Text>
      </View>

      {/* TARJETA DE ESTADO */}
      <View style={styles.card}>
        <View
          style={[
            styles.statusBadge,
            isConnected ? styles.badgeConnected : styles.badgeDisconnected,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isConnected ? styles.dotConnected : styles.dotDisconnected,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              isConnected ? styles.textConnected : styles.textDisconnected,
            ]}
          >
            {isConnected ? "Conectado" : "Desconectado"}
          </Text>
        </View>

        <Text style={styles.statusDescription}>
          {isConnected
            ? "Recibiendo alertas del servidor en tiempo real."
            : "Sin conexión con el servidor. Reintentando automáticamente…"}
        </Text>

        {!isConnected && (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={styles.spinner}
          />
        )}
      </View>

      {/* DETALLES */}
      <TouchableOpacity
        style={styles.detailsToggle}
        onPress={() => setShowDetails((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.detailsToggleText}>
          {showDetails ? "▾ Ocultar detalles" : "▸ Ver detalles de conexión"}
        </Text>
      </TouchableOpacity>

      {showDetails && (
        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>SERVIDOR</Text>
            <Text style={styles.detailValue} selectable>
              {SERVER_URL}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ID DE SESIÓN</Text>
            <Text style={styles.detailValue} selectable>
              {socketId ?? "—"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ZONA ACTUAL</Text>
            <Text style={styles.detailValue} selectable>
              {currentZone ? currentZone.toUpperCase() : "Sin asignar"}
            </Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={styles.detailLabel}>PROTOCOLO</Text>
            <Text style={styles.detailValue}>WebSocket (RFC 6455)</Text>
          </View>
        </View>
      )}

      {/* BOTÓN PRINCIPAL */}
      <TouchableOpacity
        style={styles.zoneButton}
        onPress={onManageZones}
        activeOpacity={0.7}
      >
        <Ionicons name="location-outline" size={20} color={COLORS.white} />
        <Text style={styles.zoneButtonText}>
          {currentZone ? `Cambiar zona (${currentZone})` : "Seleccionar zona"}
        </Text>
      </TouchableOpacity>

      {/* BOTÓN SECUNDARIO */}
      <TouchableOpacity
        style={[styles.button, isConnected && styles.buttonSecondary]}
        onPress={reconnect}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            isConnected && styles.buttonTextSecondary,
          ]}
        >
          {isConnected ? "Reiniciar conexión" : "Reconectar ahora"}
        </Text>
      </TouchableOpacity>

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
    paddingHorizontal: SPACING.xl,
    paddingTop: Platform.OS === "android" ? 50 : 60,
    paddingBottom: Platform.OS === "android" ? 60 : 40,
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.xxl,
  },
  headerIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  headerIconOff: {
    backgroundColor: COLORS.grayLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  bellBadge: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.grayBg,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: RADIUS.round,
    marginBottom: 14,
  },
  badgeConnected: { backgroundColor: COLORS.successLight },
  badgeDisconnected: { backgroundColor: COLORS.dangerLight },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotConnected: { backgroundColor: COLORS.success },
  dotDisconnected: { backgroundColor: COLORS.danger },
  statusText: { fontSize: 15, fontWeight: "600" },
  textConnected: { color: COLORS.success },
  textDisconnected: { color: COLORS.danger },
  statusDescription: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 10,
  },
  spinner: { marginTop: 12 },
  detailsToggle: {
    paddingVertical: 12,
    alignItems: "center",
  },
  detailsToggleText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
  detailsBox: {
    backgroundColor: COLORS.grayBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    marginBottom: SPACING.lg,
  },
  detailRow: { marginBottom: 14 },
  detailRowLast: { marginBottom: 0 },
  detailLabel: {
    fontSize: 10,
    color: COLORS.grayLight,
    letterSpacing: 0.8,
    marginBottom: 4,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  zoneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    gap: 8,
  },
  zoneButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginTop: 10,
  },
  buttonSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  buttonTextSecondary: { color: COLORS.primary },
  footer: {
    marginTop: "auto",
    alignItems: "center",
    paddingTop: SPACING.lg,
    paddingBottom: 4,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.grayLight,
    lineHeight: 16,
    textAlign: "center",
  },
});