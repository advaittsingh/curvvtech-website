import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

export async function pickImage(options?: { aspect?: [number, number] }): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permission needed", "Allow photo library access to choose an image.", [
      { text: "OK" },
    ]);
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: options?.aspect ?? [4, 3],
    quality: 0.85,
  });
  if (res.canceled) return null;
  return res.assets[0]?.uri ?? null;
}
