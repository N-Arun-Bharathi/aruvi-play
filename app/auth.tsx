import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import { Icon } from "../components/Icon";
import * as Linking from "expo-linking";

type AuthTabMode = "login" | "signup" | "reset" | "update_password";

export default function AuthScreen() {
  const {
    loginWithEmail,
    signUpWithEmail,
    resetPassword,
    updatePassword,
    continueAsGuest,
    authMode,
  } = useAuthStore();

  const toast = useToastStore();
  const [mode, setMode] = useState<AuthTabMode>("login");
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const url = Linking.useURL();

  useEffect(() => {
    if (url && url.includes("type=recovery")) {
      setMode("update_password");
    }
  }, [url]);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setSubmitting(true);

    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else if (mode === "signup") {
        const success = await signUpWithEmail(email, password, displayName);
        if (success) {
          setMode("login");
        }
      } else if (mode === "reset") {
        await resetPassword(email);
        setMode("login");
      } else if (mode === "update_password") {
        if (password !== confirmPassword) {
          useToastStore.getState().show("Passwords do not match");
          return;
        }
        const success = await updatePassword(password);
        if (success) {
          setMode("login");
          setPassword("");
          setConfirmPassword("");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuest = async () => {
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await continueAsGuest();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView className="flex-1 bg-bg px-6 justify-center">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-center"
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo & Welcome Header */}
            <View className="items-center mb-8">
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  overflow: "hidden",
                  borderWidth: 2,
                  borderColor: "rgba(16, 185, 129, 0.3)",
                  marginBottom: 16,
                }}
              >
                <Image
                  source={require("../assets/aruvi-play.png")}
                  style={{ width: 88, height: 88, borderRadius: 44 }}
                  contentFit="cover"
                />
              </View>
              <Text className="text-text text-3xl font-extrabold tracking-tight">
                Aruvi Play
              </Text>
              <Text className="text-muted text-sm mt-2 text-center px-4 leading-relaxed">
                Welcome! Sign in to sync your music across devices or continue listening as a guest.
              </Text>
            </View>

            {/* Form Container */}
            <View className="bg-surface rounded-3xl border border-white/10 p-6 shadow-2xl backdrop-blur-lg">
              {mode === "login" && (
                <View>
                  <Text className="text-text text-xl font-bold mb-1">Sign In</Text>
                  <Text className="text-muted text-xs mb-5">
                    Enter your email and password to access your account.
                  </Text>

                  {/* Email */}
                  <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/10 px-4 py-2 mb-3">
                    <Icon name="profile" size={18} color="#A0A0A0" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email address"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="flex-1 text-text text-base ml-3 py-1.5"
                      editable={!submitting}
                    />
                  </View>

                  {/* Password */}
                  <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/10 px-4 py-2 mb-2">
                    <Icon name="lock" size={18} color="#A0A0A0" />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Password"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      secureTextEntry={!showPassword}
                      className="flex-1 text-text text-base ml-3 py-1.5"
                      editable={!submitting}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={15} className="p-1">
                      <Icon name={showPassword ? "eye-off" : "eye"} size={18} color="#A0A0A0" />
                    </Pressable>
                  </View>

                  {/* Forgot Password Link */}
                  <Pressable
                    onPress={() => setMode("reset")}
                    className="align-self-end mb-5 py-1"
                  >
                    <Text className="text-accent text-xs font-medium text-right">
                      Forgot Password?
                    </Text>
                  </Pressable>

                  {/* Log In Button */}
                  <Pressable
                    onPress={handleSubmit}
                    disabled={submitting}
                    className="bg-accent active:bg-accent/85 rounded-2xl py-3.5 items-center justify-center flex-row shadow-lg mb-4"
                  >
                    {submitting ? (
                      <ActivityIndicator color="#000000" size="small" />
                    ) : (
                      <>
                        <Text className="text-black font-extrabold text-base">
                          Log In
                        </Text>
                        <View className="ml-2">
                          <Icon name="chevron-right" size={16} color="#000000" />
                        </View>
                      </>
                    )}
                  </Pressable>

                  {/* Toggle Create Account */}
                  <Pressable
                    onPress={() => setMode("signup")}
                    className="py-2 items-center mb-2"
                  >
                    <Text className="text-muted text-xs font-semibold">
                      Don&apos;t have an account?{" "}
                      <Text className="text-accent font-bold">Create Account</Text>
                    </Text>
                  </Pressable>
                </View>
              )}

              {mode === "signup" && (
                <View>
                  <Text className="text-text text-xl font-bold mb-1">Create Account</Text>
                  <Text className="text-muted text-xs mb-5">
                    Sign up to save your playlists, favourites, and history permanently.
                  </Text>

                  {/* Display Name */}
                  <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/10 px-4 py-2 mb-3">
                    <Icon name="profile" size={18} color="#A0A0A0" />
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Your Display Name"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      className="flex-1 text-text text-base ml-3 py-1.5"
                      editable={!submitting}
                    />
                  </View>

                  {/* Email */}
                  <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/10 px-4 py-2 mb-3">
                    <Icon name="profile" size={18} color="#A0A0A0" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email address"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="flex-1 text-text text-base ml-3 py-1.5"
                      editable={!submitting}
                    />
                  </View>

                  {/* Password */}
                  <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/10 px-4 py-2 mb-5">
                    <Icon name="lock" size={18} color="#A0A0A0" />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Password (min 6 characters)"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      secureTextEntry={!showPassword}
                      className="flex-1 text-text text-base ml-3 py-1.5"
                      editable={!submitting}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={15} className="p-1">
                      <Icon name={showPassword ? "eye-off" : "eye"} size={18} color="#A0A0A0" />
                    </Pressable>
                  </View>

                  {/* Register Button */}
                  <Pressable
                    onPress={handleSubmit}
                    disabled={submitting}
                    className="bg-accent active:bg-accent/85 rounded-2xl py-3.5 items-center justify-center flex-row shadow-lg mb-4"
                  >
                    {submitting ? (
                      <ActivityIndicator color="#000000" size="small" />
                    ) : (
                      <Text className="text-black font-extrabold text-base">
                        Register Account
                      </Text>
                    )}
                  </Pressable>

                  {/* Toggle Log In */}
                  <Pressable
                    onPress={() => setMode("login")}
                    className="py-2 items-center mb-2"
                  >
                    <Text className="text-muted text-xs font-semibold">
                      Already have an account?{" "}
                      <Text className="text-accent font-bold">Log In</Text>
                    </Text>
                  </Pressable>
                </View>
              )}

              {mode === "reset" && (
                <View>
                  <Text className="text-text text-xl font-bold mb-1">Reset Password</Text>
                  <Text className="text-muted text-xs mb-5">
                    Enter your account email to receive a password reset link.
                  </Text>

                  {/* Email */}
                  <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/10 px-4 py-2 mb-5">
                    <Icon name="profile" size={18} color="#A0A0A0" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email address"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="flex-1 text-text text-base ml-3 py-1.5"
                      editable={!submitting}
                    />
                  </View>

                  {/* Reset Button */}
                  <Pressable
                    onPress={handleSubmit}
                    disabled={submitting}
                    className="bg-accent active:bg-accent/85 rounded-2xl py-3.5 items-center justify-center flex-row shadow-lg mb-4"
                  >
                    {submitting ? (
                      <ActivityIndicator color="#000000" size="small" />
                    ) : (
                      <Text className="text-black font-extrabold text-base">
                        Send Reset Link
                      </Text>
                    )}
                  </Pressable>

                  {/* Back to Login */}
                  <Pressable
                    onPress={() => setMode("login")}
                    className="py-2 items-center mb-2"
                  >
                    <Text className="text-muted text-xs font-semibold">
                      Back to <Text className="text-accent font-bold">Log In</Text>
                    </Text>
                  </Pressable>
                </View>
              )}

              {mode === "update_password" && (
                <View>
                  <Text className="text-text text-xl font-bold mb-1">Update Password</Text>
                  <Text className="text-muted text-xs mb-5">
                    Enter your new password below.
                  </Text>

                  {/* Password */}
                  <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/10 px-4 py-2 mb-3">
                    <Icon name="lock" size={18} color="#A0A0A0" />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="New Password"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      secureTextEntry={!showPassword}
                      className="flex-1 text-text text-base ml-3 py-1.5"
                      editable={!submitting}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={15} className="p-1">
                      <Icon name={showPassword ? "eye-off" : "eye"} size={18} color="#A0A0A0" />
                    </Pressable>
                  </View>

                  {/* Confirm Password */}
                  <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/10 px-4 py-2 mb-5">
                    <Icon name="lock" size={18} color="#A0A0A0" />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm New Password"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      secureTextEntry={!showPassword}
                      className="flex-1 text-text text-base ml-3 py-1.5"
                      editable={!submitting}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={15} className="p-1">
                      <Icon name={showPassword ? "eye-off" : "eye"} size={18} color="#A0A0A0" />
                    </Pressable>
                  </View>

                  {/* Update Button */}
                  <Pressable
                    onPress={handleSubmit}
                    disabled={submitting}
                    className="bg-accent active:bg-accent/85 rounded-2xl py-3.5 items-center justify-center flex-row shadow-lg mb-4"
                  >
                    {submitting ? (
                      <ActivityIndicator color="#000000" size="small" />
                    ) : (
                      <Text className="text-black font-extrabold text-base">
                        Save New Password
                      </Text>
                    )}
                  </Pressable>

                  {/* Back to Login */}
                  <Pressable
                    onPress={() => setMode("login")}
                    className="py-2 items-center mb-2"
                  >
                    <Text className="text-muted text-xs font-semibold">
                      Cancel & <Text className="text-accent font-bold">Log In</Text>
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Divider & Continue as Guest Button */}
              <View className="flex-row items-center my-4">
                <View className="flex-1 h-[1px] bg-white/10" />
                <Text className="text-muted/40 text-[10px] mx-3 font-semibold uppercase">Or</Text>
                <View className="flex-1 h-[1px] bg-white/10" />
              </View>

              <Pressable
                onPress={handleGuest}
                disabled={submitting}
                className="border border-white/15 active:bg-white/5 rounded-2xl py-3.5 items-center justify-center flex-row"
              >
                <Icon name="play" size={16} color="#FFFFFF" />
                <Text className="text-text font-bold text-sm ml-2">
                  Continue as Guest
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
