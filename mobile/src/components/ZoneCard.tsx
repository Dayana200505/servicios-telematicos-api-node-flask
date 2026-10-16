import React, { useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from "react-native";
import {
  Compass,
  Building2,
  MapPin,
  Check,
  ChevronRight,
} from "lucide-react-native";
import type { ZoneInfo } from "../types/zones";
import { COLORS, RADIUS, SPACING } from "../config/theme";

// Mapeo: zona -> componente de icono de Lucide
const ZONE_ICONS: Record<
  string,
  React.ComponentType<{ size: number; color: string; strokeWidth?: number }>
> = {
  norte: Compass,
  centro: Building2,
  sur: MapPin,
};

type Props = {
  zone: ZoneInfo;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export default function ZoneCard({ zone, selected, onPress, disabled }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const IconComponent = ZONE_ICONS[zone.id] ?? MapPin;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          selected && styles.cardSelected,
          disabled && styles.cardDisabled,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`Zona ${zone.nombre}`}
      >
        {/* Icono circular */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: selected ? zone.color : COLORS.grayBgStrong,
              shadowColor: selected ? zone.color : "transparent",
            },
          ]}
        >
          <IconComponent
            size={26}
            color={selected ? COLORS.white : zone.color}
            strokeWidth={2.2}
          />
        </View>

        {/* Texto */}
        <View style={styles.textContainer}>
          <Text
            style={[styles.title, selected && { color: zone.color }]}
            numberOfLines={1}
          >
            {zone.nombre}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {zone.descripcion}
          </Text>
        </View>

        {/* Indicador derecho */}
        {selected ? (
          <View
            style={[styles.checkContainer, { backgroundColor: COLORS.success }]}
          >
            <Check size={16} color={COLORS.white} strokeWidth={3} />
          </View>
        ) : (
          <ChevronRight size={20} color={COLORS.grayLight} strokeWidth={2} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    borderColor: "transparent",
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  checkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});