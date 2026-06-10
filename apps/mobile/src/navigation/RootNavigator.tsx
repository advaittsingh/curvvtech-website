import React from "react";
import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "../theme/colors";
import { ShareIntentBootstrap } from "../components/ShareIntentBootstrap";
import { navigationRef } from "./navigationRef";
import type { RootStackParamList } from "./types";
import MainNavigator from "./MainNavigator";
import SplashScreen from "../screens/SplashScreen";
import LoadingScreen from "../screens/LoadingScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import AuthChoiceScreen from "../screens/AuthChoiceScreen";
import AuthScreen from "../screens/AuthScreen";
import WaitlistScreen from "../screens/WaitlistScreen";
import BusinessOnboardingScreen from "../screens/BusinessOnboardingScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.surfaceElevated,
    text: colors.text,
    border: colors.border,
    notification: colors.hot,
  },
};

export default function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <ShareIntentBootstrap />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Loading" component={LoadingScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="AuthChoice" component={AuthChoiceScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Waitlist" component={WaitlistScreen} />
        <Stack.Screen name="BusinessOnboarding" component={BusinessOnboardingScreen} />
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
