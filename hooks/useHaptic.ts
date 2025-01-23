import { useCallback, useMemo } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useSettings } from "@/utils/atoms/settings";

export type HapticFeedbackType =
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "success"
  | "warning"
  | "error";

export const useHaptic = (feedbackType: HapticFeedbackType = "selection") => {
  const [settings] = useSettings();

  const createHapticHandler = useCallback(
    (type: Haptics.ImpactFeedbackStyle) => {
      return Platform.OS === "web" ? () => {} : () => Haptics.impactAsync(type);
    },
    []
  );
  const createNotificationFeedback = useCallback(
    (type: Haptics.NotificationFeedbackType) => {
      return Platform.OS === "web"
        ? () => {}
        : () => Haptics.notificationAsync(type);
    },
    []
  );

  const hapticHandlers = useMemo(
    () => ({
      light: createHapticHandler(Haptics.ImpactFeedbackStyle.Light),
      medium: createHapticHandler(Haptics.ImpactFeedbackStyle.Medium),
      heavy: createHapticHandler(Haptics.ImpactFeedbackStyle.Heavy),
      selection: Platform.OS === "web" ? () => {} : Haptics.selectionAsync,
      success: createNotificationFeedback(
        Haptics.NotificationFeedbackType.Success
      ),
      warning: createNotificationFeedback(
        Haptics.NotificationFeedbackType.Warning
      ),
      error: createNotificationFeedback(Haptics.NotificationFeedbackType.Error),
    }),
    [createHapticHandler, createNotificationFeedback]
  );

  if (settings?.disableHapticFeedback) {
    return () => {};
  }
  return hapticHandlers[feedbackType];
};
