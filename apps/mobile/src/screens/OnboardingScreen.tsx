import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  useFonts,
} from "@expo-google-fonts/montserrat";
import { appStorage } from "../storage/appStorage";
import { colors } from "../theme/colors";
import { getOnboardingHeroHeight, heroImageWidth } from "../theme/heroLayout";
import type { OnboardingScreenProps } from "../navigation/types";

const w = Dimensions.get("window").width;
const LAST = 3;

const onboardingSlides = [
  {
    key: "slide1",
    title: "Welcome to FollowUp",
    description:
      "Turn everyday chats into real business opportunities.\n\nStop relying on memory or scattered notes. Everything stays organized, clear, and in your control.",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2084&q=80",
  },
  {
    key: "slide2",
    title: "From Chats to Leads",
    description:
      "Simply share a conversation and we'll structure it for you.\n\nUnderstand what your customer wants instantly. No manual entry, no complicated setup.",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80",
  },
  {
    key: "slide3",
    title: "Never Miss a Follow-Up",
    description:
      "Get smart reminders at the right time.\n\nKnow exactly who needs your attention next.\n\nStay consistent without the stress.",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2071&q=80",
  },
  {
    key: "slide4",
    title: "Clarity, Simplified",
    description:
      "All your leads in one clean, focused view.\n\nPrioritized and ready for action.\n\nSo you can spend less time managing, more time closing.",
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2072&q=80",
  },
];

type Slide = (typeof onboardingSlides)[number];

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const handleFinish = useCallback(async () => {
    try {
      await appStorage.setOnboardingSlidesDone();
      navigation.replace("AuthChoice");
    } catch (error) {
      console.error("Error in handleFinish:", error);
      navigation.replace("AuthChoice");
    }
  }, [navigation]);

  const goNext = useCallback(() => {
    if (currentIndex >= LAST) return;
    const next = currentIndex + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setCurrentIndex(next);
  }, [currentIndex]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    const prev = currentIndex - 1;
    listRef.current?.scrollToIndex({ index: prev, animated: true });
    setCurrentIndex(prev);
  }, [currentIndex]);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / w);
    setCurrentIndex(Math.min(Math.max(0, i), LAST));
  }, []);

  const titleFont = fontsLoaded ? "Montserrat_700Bold" : undefined;
  const bodyFont = fontsLoaded ? "Montserrat_400Regular" : undefined;
  const ctaFont = fontsLoaded ? "Montserrat_600SemiBold" : undefined;

  const heroImageHeight = useMemo(
    () => getOnboardingHeroHeight(insets.top, insets.bottom),
    [insets.top, insets.bottom]
  );

  const renderItem: ListRenderItem<Slide> = useCallback(
    ({ item }) => (
      <View style={styles.slidePage}>
        <View style={styles.slideInner}>
          <Image
            source={{ uri: item.image }}
            style={[styles.img, { height: heroImageHeight, width: heroImageWidth }]}
            onError={(error) => {
              console.error("Image load error:", error);
            }}
            resizeMode="cover"
          />
          <Text style={[styles.title, titleFont ? { fontFamily: titleFont } : null]}>{item.title}</Text>
          <Text style={[styles.text, bodyFont ? { fontFamily: bodyFont } : null]}>{item.description}</Text>
        </View>
      </View>
    ),
    [bodyFont, heroImageHeight, titleFont]
  );

  const isLast = currentIndex === LAST;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={onboardingSlides}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        getItemLayout={(_, index) => ({
          length: w,
          offset: w * index,
          index,
        })}
        onScrollToIndexFailed={({ index: i }) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index: i, animated: true }), 100);
        }}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View style={styles.paginationRow}>
          {onboardingSlides.map((_, i) => (
            <View
              key={onboardingSlides[i].key}
              style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        <View style={styles.buttonRow}>
          <View style={styles.buttonRowLeft}>
            {currentIndex > 0 && !isLast ? (
              <TouchableOpacity
                onPress={goPrev}
                style={styles.roundNavBtn}
                accessibilityRole="button"
                accessibilityLabel="Previous slide"
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color={colors.onPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.buttonRowRight}>
            {!isLast ? (
              <TouchableOpacity
                onPress={goNext}
                style={styles.roundNavBtn}
                accessibilityRole="button"
                accessibilityLabel="Next slide"
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.onPrimary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleFinish}
                style={styles.getStartedButton}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Get started"
              >
                <Text style={[styles.getStartedText, ctaFont ? { fontFamily: ctaFont } : null]}>
                  Get Started
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  slidePage: {
    width: w,
    flex: 1,
  },
  slideInner: {
    flex: 1,
    paddingTop: 36,
    paddingHorizontal: 30,
    paddingBottom: 20,
    justifyContent: "flex-start",
  },
  img: {
    alignSelf: "center",
    borderTopRightRadius: 80,
    borderBottomLeftRadius: 80,
    resizeMode: "cover",
  },
  title: {
    marginTop: 24,
    marginHorizontal: 10,
    fontSize: 32,
    color: colors.textPrimary,
  },
  text: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
    lineHeight: 25,
    marginLeft: 10,
    marginBottom: 4,
  },
  getStartedButton: {
    height: 60,
    minWidth: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
  },
  getStartedText: {
    fontSize: 16,
    color: colors.onPrimary,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 30,
    paddingTop: 12,
    backgroundColor: colors.bg,
  },
  paginationRow: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
    width: "100%",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.textSecondary,
    opacity: 0.45,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  buttonRowLeft: {
    minWidth: 60,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  buttonRowRight: {
    minWidth: 60,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  roundNavBtn: {
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    backgroundColor: colors.primary,
  },
});
