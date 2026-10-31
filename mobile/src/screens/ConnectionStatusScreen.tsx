import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  ScrollView,
  Animated,
  Modal,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSocket } from "../hooks/useSocket";
import { SERVER_URL } from "../config/env";
import { COLORS, RADIUS, SPACING } from "../config/theme";

type Props = {
  onManageZones: () => void;
  onOpenAdmin?: () => void;
};

// Mapeo de iconos para cada tipo de alerta
const getAlertIcon = (tipo: string) => {
  const t = tipo.toLowerCase();
  if (t.includes("incendio")) return "flame";
  if (t.includes("sismo")) return "pulse";
  if (t.includes("inundación") || t.includes("agua")) return "water";
  if (t.includes("tormenta") || t.includes("lluvia")) return "thunderstorm";
  if (t.includes("seguridad") || t.includes("robo")) return "shield-checkmark";
  if (t.includes("salud")) return "medkit";
  if (t.includes("corte")) return "flash";
  return "warning";
};

// Mapeo de colores según gravedad
const getSeverityColor = (gravedad: string) => {
  const g = gravedad.toLowerCase();
  if (g === "alta") return COLORS.danger;
  if (g === "media") return COLORS.warning;
  return COLORS.success;
};

// Campana que vibra visualmente al recibir una alerta
function AlertBell({ connected, hasNewAlert }: { connected: boolean; hasNewAlert: boolean }) {
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasNewAlert) {
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 80, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 80, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [hasNewAlert, shake]);

  const rotate = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-15deg", "15deg"],
  });

  return (
    <View
      style={[styles.headerIconContainer, !connected && styles.headerIconOff]}
      accessible
      accessibilityRole="image"
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons
          name={connected ? "notifications" : "notifications-off"}
          size={36}
          color={COLORS.white}
        />
      </Animated.View>
      <View
        style={[
          styles.bellBadge,
          { backgroundColor: connected ? COLORS.success : COLORS.danger },
        ]}
      />
    </View>
  );
}

export default function ConnectionStatusScreen({ onManageZones, onOpenAdmin }: Props) {
  const { isConnected, socketId, currentZone, alerts } = useSocket();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Solo animamos la campana cuando llega una alerta (la vibración está en el Contexto)
  useEffect(() => {
    if (alerts.length > 0) {
      setHasNewAlert(true);
      const timer = setTimeout(() => setHasNewAlert(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [alerts.length]);

  // Función de Pull to Refresh
  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* BOTÓN DE INFO (Arriba a la IZQUIERDA) */}
      <TouchableOpacity
        style={styles.infoButton}
        onPress={() => setShowDetailsModal(true)}
      >
        <Ionicons name="information-circle-outline" size={28} color={COLORS.gray} />
      </TouchableOpacity>

      {/* HEADER */}
      <View style={styles.header}>
        <AlertBell connected={isConnected} hasNewAlert={hasNewAlert} />
        <Text style={styles.headerTitle}>Alertas Comunitarias</Text>
        <Text style={styles.headerSubtitle}>Emergencias en tiempo real</Text>
      </View>

      {/* ALERTAS RECIBIDAS */}
      <View style={styles.alertsHeader}>
        <View>
          <Text style={styles.alertsTitle}>Alertas recibidas</Text>
          <Text style={styles.alertsSubtitle}>
            Zona actual: {currentZone ? currentZone.toUpperCase() : "Sin asignar"}
          </Text>
        </View>
        
        <View style={styles.alertsHeaderRight}>
          <Text style={styles.alertsCount}>{alerts.length}</Text>
          <TouchableOpacity style={styles.zoneIconButton} onPress={onManageZones}>
            <Ionicons name="location" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.alertsList}
        contentContainerStyle={alerts.length === 0 ? styles.emptyAlerts : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {alerts.length === 0 ? (
          <Text style={styles.emptyAlertsText}>
            {currentZone
              ? "Esperando alertas para tu zona..."
              : "Selecciona una zona para recibir alertas."}
          </Text>
        ) : (
          alerts.map((alert, index) => {
            const sevColor = getSeverityColor(alert.gravedad);
            return (
              <View key={`${alert.emitida_en}-${index}`} style={styles.alertCard}>
                <View style={[styles.alertBar, { backgroundColor: sevColor }]} />
                
                <View style={styles.alertContent}>
                  <View style={styles.alertCardHeader}>
                    <View style={styles.alertTitleRow}>
                      <View style={[styles.alertIconBg, { backgroundColor: sevColor + "15" }]}>
                        <Ionicons name={getAlertIcon(alert.tipo)} size={16} color={sevColor} />
                      </View>
                      <Text style={styles.alertType}>{alert.tipo.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.severityBadge, { backgroundColor: sevColor }]}>
                      <Text style={styles.alertSeverity}>{alert.gravedad.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.alertZone}>Zona {alert.zona.toUpperCase()}</Text>
                  <Text style={styles.alertMessage}>{alert.mensaje}</Text>
                  
                  <Text style={styles.alertDate}>
                    {alert.fecha_hora
                      ? new Date(alert.fecha_hora).toLocaleString()
                      : new Date(alert.emitida_en).toLocaleString()}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* BOTÓN DE SUPERUSUARIO */}
      {onOpenAdmin && (
        <TouchableOpacity style={styles.adminButton} onPress={onOpenAdmin}>
          <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.danger} />
          <Text style={styles.adminButtonText}>Panel de superusuario</Text>
        </TouchableOpacity>
      )}

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>UMSS · Ingeniería Informática</Text>
      </View>

      {/* MODAL DE DETALLES TÉCNICOS */}
      <Modal visible={showDetailsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalles de conexión</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SERVIDOR</Text>
              <Text style={styles.detailValue}>{SERVER_URL}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ID DE SESIÓN</Text>
              <Text style={styles.detailValue}>{socketId ?? "—"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ZONA ACTUAL</Text>
              <Text style={styles.detailValue}>{currentZone ? currentZone.toUpperCase() : "Sin asignar"}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>PROTOCOLO</Text>
              <Text style={styles.detailValue}>WebSocket (RFC 6455)</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingTop: Platform.OS === "android" ? 50 : 60,
    paddingBottom: Platform.OS === "android" ? 40 : 30,
  },
  infoButton: {
    position: "absolute",
    top: Platform.OS === "android" ? 45 : 55,
    left: 20,
    zIndex: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  headerIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
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
  alertsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  alertsHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  alertsSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 3,
  },
  alertsCount: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    color: COLORS.primary,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
  zoneIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  alertsList: {
    flex: 1,
    marginBottom: SPACING.md,
  },
  emptyAlerts: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.grayBg,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    minHeight: 150,
  },
  emptyAlertsText: {
    color: COLORS.gray,
    fontSize: 13,
    textAlign: "center",
  },
  alertCard: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    overflow: "hidden",
  },
  alertBar: {
    width: 6,
    height: "100%",
  },
  alertContent: {
    flex: 1,
    padding: SPACING.md,
  },
  alertCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  alertTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  alertType: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  alertSeverity: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  alertZone: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 36,
  },
  alertMessage: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginLeft: 36,
  },
  alertDate: {
    color: COLORS.grayLight,
    fontSize: 10,
    marginTop: 8,
    marginLeft: 36,
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerLight,
    marginTop: 10,
  },
  adminButtonText: { color: COLORS.danger, fontSize: 14, fontWeight: "700" },
  footer: {
    alignItems: "center",
    paddingTop: SPACING.lg,
    paddingBottom: 4,
  },
  footerText: { fontSize: 11, color: COLORS.grayLight, textAlign: "center" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  detailRow: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
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
});