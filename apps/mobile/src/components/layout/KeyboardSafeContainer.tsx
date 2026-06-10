import React from "react";
import { KeyboardAvoidingView, Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * iOS: added to safe-area top for KeyboardAvoidingView (header bar height inside stack/tab).
   * Android: ignored — rely on windowSoftInputMode=adjustResize (see AndroidManifest).
   */
  keyboardVerticalOffsetExtra?: number;
};

/**
 * Android: `KeyboardAvoidingView` + `behavior="height"` fights `adjustResize` and commonly leaves
 * the composer under the keyboard. Use a plain flex `View` and let the activity resize.
 * iOS: keep `KeyboardAvoidingView` + `padding`.
 */
export function KeyboardSafeContainer({
  children,
  style,
  keyboardVerticalOffsetExtra = 56,
}: Props) {
  const insets = useSafeAreaInsets();

  if (Platform.OS === "android") {
    return <View style={[{ flex: 1 }, style]}>{children}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior="padding"
      keyboardVerticalOffset={insets.top + keyboardVerticalOffsetExtra}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
