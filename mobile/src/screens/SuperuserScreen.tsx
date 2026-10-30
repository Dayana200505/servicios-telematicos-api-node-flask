import React, { useMemo, useState, useEffect } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SERVER_HOST, STACK_PORTS } from "../config/env";
import type { Stack } from "../config/env";
import { COLORS, RADIUS, SPACING } from "../config/theme";
import { ZONES } from "../types/zones";
import type { Zone } from "../types/zones";
import type { AlertSeverity } from "../types/alerts";
import type { AlertDraft, Distribution } from "../types/superuser";
import { useAlertEmitter } from "../hooks/useAlertEmitter";
import { useLoadTest } from "../hooks/useLoadTest";

type Props = {
  onBack: () => void;
};

type Tab = "emitir" | "alertas" | "pruebas";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const MAX_MENSAJE = 200;
const MIN_MENSAJE = 10;

const TIPOS: { value: string; label: string; icon: IconName }[] = [
  { value: "incendio", label: "Incendio", icon: "flame" },
  { value: "sismo", label: "Sismo", icon: "pulse" },
  { value: "inundación", label: "Inundación", icon: "water" },
  { value: "deslizamiento", label: "Deslizamiento", icon: "trending-down" },
  { value: "tormenta", label: "Tormenta", icon: "thunderstorm" },
  { value: "seguridad", label: "Seguridad", icon: "shield-checkmark" },
  { value: "salud", label: "Salud", icon: "medkit" },
  { value: "corte de servicio", label: "Corte servicio", icon: "flash" },
];

const GRAVEDADES: { value: AlertSeverity; label: string; color: string; bg: string }[] = [
  { value: "baja", label: "Baja", color: COLORS.success, bg: COLORS.successLight },
  { value: "media", label: "Media", color: COLORS.warning, bg: COLORS.warningLight },
  { value: "alta", label: "Alta", color: COLORS.danger, bg: COLORS.dangerLight },
];

const CANTIDADES = [50, 100, 500, 1000];

const STACKS: { value: Stack; label: string }[] = [
  { value: "node", label: "Node.js" },
  { value: "flask", label: "Flask" },
];

type Errors = Partial<Record<"tipo" | "mensaje", string>>;
type Banner = { kind: "ok" | "err"; text: string } | null;
type LogEntry = {
  id: number;
  ok: boolean;
  tipo: string;
  zona: Zone;
  gravedad: AlertSeverity;
  detalle: string;
  hora: string;
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const hora = (d = new Date()) =>
  d.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const ms = (v: number | null) => (v === null ? "–" : `${v} ms`);

export default function SuperuserScreen({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("emitir");
  const [stack, setStack] = useState<Stack>("node");
  const [tipo, setTipo] = useState<string>("");
  const [gravedad, setGravedad] = useState<AlertSeverity>("alta");
  const [zona, setZona] = useState<Zone>("norte");
  const [mensaje, setMensaje] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<Banner>(null);
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  
  // Estados para el historial
  const [historialReal, setHistorialReal] = useState<any[]>([]);
  const [showZoneFilter, setShowZoneFilter] = useState(false);
  const [filtroZona, setFiltroZona] = useState<string | null>(null); // null = todas
  const [refreshing, setRefreshing] = useState(false);

  const [cantidad, setCantidad] = useState<number>(50);
  const [distribucion, setDistribucion] = useState<Distribution>("destino");

  const { connected, emitAlert, fetchHistory } = useAlertEmitter(stack);
  const load = useLoadTest();

  // Cargar historial
  const cargarHistorial = async () => {
    const data = await fetchHistory();
    setHistorialReal(data);
  };

  useEffect(() => {
    if (activeTab === "alertas") {
      cargarHistorial();
    }
  }, [activeTab, stack]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cargarHistorial().finally(() => setRefreshing(false));
  };

  // Filtrado del historial
  const historialFiltrado = historialReal.filter(
    (item) => filtroZona === null || item.zona === filtroZona
  );

  const gravedadInfo = GRAVEDADES.find((g) => g.value === gravedad) ?? GRAVEDADES[2];
  const zonaInfo = ZONES.find((z) => z.id === zona) ?? ZONES[0];
  const tipoInfo = TIPOS.find((t) => t.value === tipo);

  const draft: AlertDraft = useMemo(
    () => ({ tipo, gravedad, zona, mensaje: mensaje.trim() }),
    [tipo, gravedad, zona, mensaje]
  );

  const validate = (): Errors => {
    const e: Errors = {};
    if (!draft.tipo) e.tipo = "Selecciona el tipo de alerta.";
    if (!draft.mensaje) e.mensaje = "Escribe el mensaje de la alerta.";
    else if (draft.mensaje.length < MIN_MENSAJE)
      e.mensaje = `El mensaje es muy corto (mínimo ${MIN_MENSAJE} caracteres).`;
    else if (draft.mensaje.length > MAX_MENSAJE)
      e.mensaje = `El mensaje supera los ${MAX_MENSAJE} caracteres.`;
    return e;
  };

  const pushLog = (ok: boolean, detalle: string) => {
    setLog((l) =>
      [
        { id: Date.now(), ok, tipo: draft.tipo || "(sin tipo)", zona, gravedad, detalle, hora: hora() },
        ...l,
      ].slice(0, 15)
    );
  };

  const doEmit = async () => {
    setSending(true);
    setBanner(null);
    const res = await emitAlert(draft);
    setSending(false);
    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBanner({ kind: "ok", text: `Alerta emitida correctamente a la zona ${zona}.` });
      pushLog(true, `Emitida a la zona ${zona} vía ${stack === "node" ? "Node.js" : "Flask"}`);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setBanner({ kind: "err", text: res.error });
      pushLog(false, res.error);
    }
  };

  const handleEmit = () => {
    if (sending) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setBanner({ kind: "err", text: "Revisa los campos marcados antes de emitir." });
      return;
    }
    if (!connected) {
      setBanner({
        kind: "err",
        text: "Sin conexión con el servidor. Verifica que esté encendido y que la IP sea correcta.",
      });
      pushLog(false, "Sin conexión con el servidor");
      return;
    }
    Alert.alert(
      "Confirmar emisión",
      `Se enviará a todos los usuarios de la zona ${zona.toUpperCase()}:\n\n` +
        `${cap(draft.tipo)} · gravedad ${draft.gravedad}\n"${draft.mensaje}"`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, emitir", style: "destructive", onPress: doEmit },
      ]
    );
  };

  const handleLoadTest = () => {
    if (load.running) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setBanner({ kind: "err", text: "Completa el formulario de la pestaña Emitir: se usa para la prueba." });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    load.start({ stack, usuarios: cantidad, distribucion, alerta: draft });
  };

  const pct = load.progress && load.progress.total > 0
    ? Math.round((load.progress.hechos / load.progress.total) * 100)
    : 0;

  const result = load.outcome && load.outcome.ok ? load.outcome : null;
  const loadError = load.outcome && !load.outcome.ok ? load.outcome.error : null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
    >
      <View style={styles.container}>
        <StatusBar style="dark" />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Panel de superusuario</Text>
            <Text style={styles.headerSubtitle}>Generar y emitir alertas</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        {/* TABS */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "emitir" && styles.tabActive]}
            onPress={() => setActiveTab("emitir")}
          >
            <Ionicons name="send" size={18} color={activeTab === "emitir" ? COLORS.primary : COLORS.gray} />
            <Text style={[styles.tabText, activeTab === "emitir" && styles.tabTextActive]}>Emitir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "alertas" && styles.tabActive]}
            onPress={() => setActiveTab("alertas")}
          >
            <Ionicons name="notifications" size={18} color={activeTab === "alertas" ? COLORS.primary : COLORS.gray} />
            <Text style={[styles.tabText, activeTab === "alertas" && styles.tabTextActive]}>Alertas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "pruebas" && styles.tabActive]}
            onPress={() => setActiveTab("pruebas")}
          >
            <Ionicons name="flash" size={18} color={activeTab === "pruebas" ? COLORS.primary : COLORS.gray} />
            <Text style={[styles.tabText, activeTab === "pruebas" && styles.tabTextActive]}>Pruebas</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scroll} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            activeTab === "alertas" ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            ) : undefined
          }
        >
          
          {/* ======================= PESTAÑA 1: EMITIR ======================= */}
          {activeTab === "emitir" && (
            <>
              <View style={styles.segment}>
                {STACKS.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.segmentBtn, stack === s.value && styles.segmentBtnActive]}
                    onPress={() => setStack(s.value)}
                  >
                    <Text style={[styles.segmentText, stack === s.value && styles.segmentTextActive]}>
                      {s.label} <Text style={styles.segmentPort}>:{STACK_PORTS[s.value]}</Text>
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.statusRow, connected ? styles.statusOk : styles.statusOff]}>
                <View style={[styles.dot, { backgroundColor: connected ? COLORS.success : COLORS.danger }]} />
                <Text style={[styles.statusText, { color: connected ? COLORS.success : COLORS.danger }]}>
                  {connected ? "Conectado" : "Sin conexión"} · {SERVER_HOST}:{STACK_PORTS[stack]}
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Nueva alerta</Text>

                <Text style={styles.label}>TIPO DE ALERTA</Text>
                <View style={styles.chipsWrap}>
                  {TIPOS.map((t) => {
                    const active = tipo === t.value;
                    return (
                      <TouchableOpacity
                        key={t.value}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => {
                          setTipo(t.value);
                          setErrors((e) => ({ ...e, tipo: undefined }));
                        }}
                      >
                        <Ionicons name={t.icon} size={16} color={active ? COLORS.white : COLORS.primary} />
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.tipo && <Text style={styles.error}>{errors.tipo}</Text>}

                <Text style={[styles.label, styles.labelSpaced]}>GRAVEDAD</Text>
                <View style={styles.row}>
                  {GRAVEDADES.map((g) => {
                    const active = gravedad === g.value;
                    return (
                      <TouchableOpacity
                        key={g.value}
                        style={[styles.option, active && { backgroundColor: g.bg, borderColor: g.color }]}
                        onPress={() => setGravedad(g.value)}
                      >
                        <View style={[styles.dotSmall, { backgroundColor: g.color }]} />
                        <Text style={[styles.optionText, active && { color: g.color }]}>{g.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.label, styles.labelSpaced]}>ZONA DE DESTINO</Text>
                <View style={styles.row}>
                  {ZONES.map((z) => {
                    const active = zona === z.id;
                    return (
                      <TouchableOpacity
                        key={z.id}
                        style={[styles.option, active && { backgroundColor: z.color, borderColor: z.color }]}
                        onPress={() => setZona(z.id)}
                      >
                        <Text style={[styles.optionText, active && { color: COLORS.white }]}>{z.nombre}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={[styles.labelRow, styles.labelSpaced]}>
                  <Text style={styles.label}>MENSAJE</Text>
                  <Text style={[styles.counter, mensaje.length > MAX_MENSAJE && { color: COLORS.danger }]}>
                    {mensaje.length} / {MAX_MENSAJE}
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, errors.mensaje ? styles.inputError : null]}
                  value={mensaje}
                  onChangeText={(t) => {
                    setMensaje(t);
                    if (errors.mensaje) setErrors((e) => ({ ...e, mensaje: undefined }));
                  }}
                  placeholder="Describe la emergencia..."
                  placeholderTextColor={COLORS.grayLight}
                  multiline
                  textAlignVertical="top"
                  maxLength={260}
                />
                {errors.mensaje && <Text style={styles.error}>{errors.mensaje}</Text>}

                <TouchableOpacity
                  style={[styles.primaryBtn, (sending || !connected) && styles.btnDisabled]}
                  onPress={handleEmit}
                  disabled={sending}
                >
                  <Ionicons name="send" size={18} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>{sending ? "Enviando…" : "Emitir alerta"}</Text>
                </TouchableOpacity>

                {banner && (
                  <View style={[styles.banner, banner.kind === "ok" ? styles.bannerOk : styles.bannerErr]}>
                    <Ionicons name={banner.kind === "ok" ? "checkmark-circle" : "alert-circle"} size={18} color={banner.kind === "ok" ? COLORS.success : COLORS.danger} />
                    <Text style={[styles.bannerText, { color: banner.kind === "ok" ? COLORS.success : COLORS.danger }]}>{banner.text}</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ======================= PESTAÑA 2: ALERTAS ======================= */}
          {activeTab === "alertas" && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>HISTORIAL</Text>
                
                <TouchableOpacity 
                  style={styles.filterButton} 
                  onPress={() => setShowZoneFilter(!showZoneFilter)}
                >
                  <Text style={styles.filterText}>
                    {filtroZona ? cap(filtroZona) : "Todas las zonas"}
                  </Text>
                  <Ionicons name={showZoneFilter ? "chevron-up" : "chevron-down"} size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {showZoneFilter && (
                <View style={styles.dropdown}>
                  <TouchableOpacity 
                    style={styles.dropdownItem} 
                    onPress={() => { setFiltroZona(null); setShowZoneFilter(false); }}
                  >
                    <Text style={styles.dropdownText}>Todas las zonas</Text>
                  </TouchableOpacity>
                  {ZONES.map((z) => (
                    <TouchableOpacity 
                      key={z.id} 
                      style={styles.dropdownItem} 
                      onPress={() => { setFiltroZona(z.id); setShowZoneFilter(false); }}
                    >
                      <Text style={styles.dropdownText}>{z.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {historialFiltrado.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No hay alertas en esta zona.</Text>
                </View>
              ) : (
                historialFiltrado.map((item, idx) => (
                  <View key={idx} style={styles.logItem}>
                    <View style={[styles.tag, { backgroundColor: COLORS.primaryLight }]}>
                      <Text style={[styles.tagText, { color: COLORS.primary }]}>SQL</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.logTitle}>{cap(item.tipo)} · {item.gravedad} · {item.zona}</Text>
                      <Text style={styles.logDetail}>{item.mensaje}</Text>
                      {/* FECHA Y HORA AQUÍ */}
                      <View style={styles.dateContainer}>
                        <Ionicons name="calendar-outline" size={12} color={COLORS.gray} />
                        <Text style={styles.logDate}>
                          {new Date(item.fecha_hora).toLocaleDateString("es-BO", { day: '2-digit', month: 'short' })} · {new Date(item.fecha_hora).toLocaleTimeString("es-BO", { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {/* ======================= PESTAÑA 3: PRUEBAS ======================= */}
          {activeTab === "pruebas" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Prueba de carga de usuarios</Text>
              <Text style={styles.cardSub}>Simula usuarios y cuenta a cuántos les llegó.</Text>

              <View style={[styles.statusRow, load.panelConnected ? styles.statusOk : styles.statusOff]}>
                <View style={[styles.dot, { backgroundColor: load.panelConnected ? COLORS.success : COLORS.danger }]} />
                <Text style={[styles.statusText, { color: load.panelConnected ? COLORS.success : COLORS.danger }]}>
                  {load.panelConnected ? "Servicio conectado" : "Servicio apagado (npm start en /superusuario)"}
                </Text>
              </View>

              <Text style={styles.label}>CANTIDAD DE USUARIOS</Text>
              <View style={styles.row}>
                {CANTIDADES.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.option, cantidad === n && styles.optionActive]}
                    onPress={() => setCantidad(n)}
                  >
                    <Text style={[styles.optionText, cantidad === n && styles.optionTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, styles.labelSpaced]}>DISTRIBUCIÓN</Text>
              {[
                { value: "destino", label: "Todos en la zona destino" },
                { value: "repartido", label: "Repartidos (norte, centro, sur)" },
              ].map((d) => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.radio, distribucion === d.value && styles.radioActive]}
                  onPress={() => setDistribucion(d.value as Distribution)}
                >
                  <Ionicons name={distribucion === d.value ? "radio-button-on" : "radio-button-off"} size={18} color={distribucion === d.value ? COLORS.primary : COLORS.grayLight} />
                  <Text style={[styles.radioText, distribucion === d.value && { color: COLORS.primary }]}>{d.label}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.primaryBtn, styles.testBtn, (load.running || !load.panelConnected) && styles.btnDisabled]}
                onPress={handleLoadTest}
                disabled={load.running}
              >
                <Ionicons name="flash" size={18} color={COLORS.white} />
                <Text style={styles.primaryBtnText}>{load.running ? "Ejecutando…" : `Iniciar con ${cantidad} usuarios`}</Text>
              </TouchableOpacity>

              {load.running && load.progress && (
                <View style={styles.progressBox}>
                  <View style={styles.progressTop}>
                    <Text style={styles.progressText}>{load.progress.texto}</Text>
                    <Text style={styles.progressText}>{pct}%</Text>
                  </View>
                  <View style={styles.bar}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
                </View>
              )}

              {loadError && (
                <View style={[styles.banner, styles.bannerErr]}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                  <Text style={[styles.bannerText, { color: COLORS.danger }]}>{loadError}</Text>
                </View>
              )}

              {result && (
                <View style={styles.resultBox}>
                  <View style={[styles.verdict, result.recibieron === result.objetivo ? styles.verdictOk : result.entrega_pct >= 90 ? styles.verdictWarn : styles.verdictBad]}>
                    <Text style={styles.verdictTitle}>
                      {result.recibieron === result.objetivo ? `✔ Llegó a TODOS (${result.recibieron}/${result.objetivo})` : `⚠ Llegó a ${result.recibieron} de ${result.objetivo}`}
                    </Text>
                  </View>
                  <View style={styles.statsGrid}>
                    <Stat label="Conectados" value={String(result.suscritos)} />
                    <Stat label="Recibieron" value={String(result.recibieron)} tone="good" />
                    <Stat label="No recibieron" value={String(result.no_recibieron)} tone="bad" />
                  </View>
                  <View style={styles.latRow}>
                    <Lat label="Prom." value={ms(result.latencia.prom)} />
                    <Lat label="P95" value={ms(result.latencia.p95)} />
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>UMSS · Ingeniería Informática</Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone === "good" && { color: COLORS.success }, tone === "bad" && { color: COLORS.danger }]}>{value}</Text>
    </View>
  );
}

function Lat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.lat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.latValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.white, paddingTop: Platform.OS === "android" ? 40 : 50 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center", borderRadius: 20, backgroundColor: COLORS.grayBg },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 19, fontWeight: "700", color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  
  tabsContainer: { flexDirection: "row", paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: COLORS.gray },
  tabTextActive: { color: COLORS.primary },

  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },
  segment: { flexDirection: "row", backgroundColor: COLORS.grayBgStrong, borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.md },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: "center" },
  segmentBtnActive: { backgroundColor: COLORS.white, elevation: 2 },
  segmentText: { fontSize: 14, fontWeight: "600", color: COLORS.gray },
  segmentTextActive: { color: COLORS.primary },
  segmentPort: { fontWeight: "400", fontSize: 12 },

  statusRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.md, marginBottom: SPACING.lg, gap: 8 },
  statusOk: { backgroundColor: COLORS.successLight },
  statusOff: { backgroundColor: COLORS.dangerLight },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotSmall: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12.5, fontWeight: "600", flex: 1 },

  card: { backgroundColor: COLORS.grayBg, borderRadius: RADIUS.lg, padding: SPACING.xl, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.md },
  cardSub: { fontSize: 12.5, color: COLORS.gray, marginTop: -6, marginBottom: SPACING.lg },

  label: { fontSize: 11, fontWeight: "700", color: COLORS.grayLight, letterSpacing: 1, marginBottom: SPACING.sm },
  labelSpaced: { marginTop: SPACING.lg },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  counter: { fontSize: 11, color: COLORS.gray, marginBottom: SPACING.sm },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.round, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.borderStrong },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: COLORS.textLight },
  chipTextActive: { color: COLORS.white },

  row: { flexDirection: "row", gap: 8 },
  option: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border },
  optionActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  optionText: { fontSize: 14, fontWeight: "700", color: COLORS.gray },
  optionTextActive: { color: COLORS.primary },

  input: { minHeight: 100, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.text },
  inputError: { borderColor: COLORS.danger },
  error: { color: COLORS.danger, fontSize: 12, marginTop: 6, fontWeight: "500" },

  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: COLORS.danger, paddingVertical: 15, borderRadius: RADIUS.md, marginTop: SPACING.xl },
  testBtn: { backgroundColor: COLORS.primary },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },

  banner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: RADIUS.md, marginTop: SPACING.md },
  bannerOk: { backgroundColor: COLORS.successLight },
  bannerErr: { backgroundColor: COLORS.dangerLight },
  bannerText: { flex: 1, fontSize: 13, fontWeight: "600" },

  sectionTitle: { fontSize: 11, fontWeight: "700", color: COLORS.grayLight, letterSpacing: 1.2, marginBottom: SPACING.md },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.xl, marginBottom: SPACING.sm },
  
  // Estilos del filtro
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.sm,
  },
  filterText: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },
  dropdown: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownText: { fontSize: 14, color: COLORS.text },

  empty: { padding: SPACING.lg, backgroundColor: COLORS.grayBg, borderRadius: RADIUS.md, alignItems: "center" },
  emptyText: { color: COLORS.gray, fontSize: 13 },
  logItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: COLORS.grayBg, borderRadius: RADIUS.md, marginBottom: SPACING.sm },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: "800" },
  logTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  logDetail: { fontSize: 11.5, color: COLORS.gray, marginTop: 2 },
  
  // NUEVOS ESTILOS PARA LA FECHA
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  logDate: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: "500",
  },

  radio: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: SPACING.sm },
  radioActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  radioText: { fontSize: 13.5, fontWeight: "600", color: COLORS.textLight, flex: 1 },

  progressBox: { marginTop: SPACING.lg },
  progressTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressText: { fontSize: 12.5, color: COLORS.textLight, fontWeight: "600" },
  bar: { height: 10, backgroundColor: COLORS.grayBgStrong, borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: COLORS.primary },

  resultBox: { marginTop: SPACING.xl },
  verdict: { padding: 14, borderRadius: RADIUS.md, marginBottom: SPACING.md, borderWidth: 1 },
  verdictOk: { backgroundColor: COLORS.successLight, borderColor: COLORS.success },
  verdictWarn: { backgroundColor: COLORS.warningLight, borderColor: COLORS.warning },
  verdictBad: { backgroundColor: COLORS.dangerLight, borderColor: COLORS.danger },
  verdictTitle: { fontSize: 14.5, fontWeight: "800", color: COLORS.text, lineHeight: 20 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: SPACING.md },
  stat: { width: "31.5%", backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 10 },
  statLabel: { fontSize: 10.5, color: COLORS.gray, marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: "800", color: COLORS.text },

  latRow: { flexDirection: "row", gap: 8, marginBottom: SPACING.md },
  lat: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, padding: 8 },
  latValue: { fontSize: 13, fontWeight: "700", color: COLORS.text },

  footer: { alignItems: "center", paddingTop: SPACING.lg },
  footerText: { fontSize: 11, color: COLORS.grayLight, lineHeight: 16 },
});