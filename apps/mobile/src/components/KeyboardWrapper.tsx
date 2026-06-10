import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type Ref,
} from "react";
import { Keyboard, Platform, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const DEFAULT_CONTENT_BOTTOM = 24;

/** RN KASV reads `contentContainerStyle.paddingBottom` as a number; arrays break that on Android. */
function mergeContentStyle(
  bottomInset: number,
  contentContainerStyle?: StyleProp<ViewStyle>
): ViewStyle {
  return StyleSheet.flatten([
    styles.content,
    { paddingBottom: DEFAULT_CONTENT_BOTTOM + bottomInset },
    contentContainerStyle,
  ]) as ViewStyle;
}

function assignRef<T>(r: Ref<T> | undefined, value: T | null) {
  if (r == null) return;
  if (typeof r === "function") r(value);
  else (r as React.MutableRefObject<T | null>).current = value;
}

export type KeyboardWrapperProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra bottom padding inside the scroll content (safe area, primary CTA clearance, etc.) */
  bottomInset?: number;
  showsVerticalScrollIndicator?: boolean;
};

const EXTRA_SCROLL = Platform.OS === "android" ? 88 : 60;
const KEYBOARD_OPEN_MS = Platform.OS === "android" ? 340 : 250;

/**
 * App-standard keyboard-aware scroll: focused inputs stay above the keyboard on iOS and Android.
 * Dismiss keyboard by dragging the scroll view (`keyboardDismissMode="on-drag"`).
 * Avoid wrapping this in TouchableWithoutFeedback — it blocks scroll gestures.
 *
 * Android + adjustResize: the library assumes the OS already pans the focused field (like adjustPan).
 * That often does not happen, so we call `update()` after the keyboard is shown to run
 * ScrollView's scroll-native-handle-to-keyboard.
 */
export const KeyboardWrapper = forwardRef<any, KeyboardWrapperProps>(function KeyboardWrapper(
  {
    children,
    style,
    contentContainerStyle,
    bottomInset = 0,
    showsVerticalScrollIndicator = false,
  },
  ref
) {
  const kasvRef = useRef<any>(null);
  const setKasvRef = useCallback(
    (node: any) => {
      kasvRef.current = node;
      assignRef(ref, node);
    },
    [ref]
  );

  const flatContent = useMemo(
    () => mergeContentStyle(bottomInset, contentContainerStyle),
    [bottomInset, contentContainerStyle]
  );

  useEffect(() => {
    if (Platform.OS !== "android") return;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        pending = undefined;
        kasvRef.current?.update?.();
      }, 100);
    });
    return () => {
      sub.remove();
      if (pending) clearTimeout(pending);
    };
  }, []);

  return (
    <KeyboardAwareScrollView
      ref={setKasvRef}
      style={[styles.flex, style]}
      contentContainerStyle={flatContent}
      enableOnAndroid
      enableAutomaticScroll
      enableResetScrollToCoords={false}
      extraScrollHeight={EXTRA_SCROLL}
      extraHeight={Platform.OS === "android" ? 120 : 100}
      keyboardOpeningTime={KEYBOARD_OPEN_MS}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    >
      {children}
    </KeyboardAwareScrollView>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
});

export default KeyboardWrapper;
