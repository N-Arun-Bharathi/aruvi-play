import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center bg-bg p-5">
        <Text className="text-text text-xl">This screen doesn{"'"}t exist.</Text>
        <Link href="/" className="mt-4">
          <Text className="text-accent">Go home</Text>
        </Link>
      </View>
    </>
  );
}
