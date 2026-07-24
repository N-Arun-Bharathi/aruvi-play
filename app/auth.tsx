import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import { Icon } from "../components/Icon";

export default function AuthScreen() {
  const {
    sendOtp,
    verifyOtp,
    signInAnonymously,
    loading,
    otpSent,
    phoneNumber,
  } = useAuthStore();

  const toast = useToastStore();
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const handleSendOtp = async () => {
    if (!phone || phone.trim().length < 10) {
      toast.show("Please enter a valid phone number");
      return;
    }
    
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = `+91${formattedPhone}`;
    }
    await sendOtp(formattedPhone);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length < 6) {
      toast.show("Please enter the 6-digit OTP code");
      return;
    }
    await verifyOtp(otpCode.trim());
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView className="flex-1 bg-bg px-6 justify-center">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-center"
        >
          {/* Logo & Header */}
          <View className="items-center mb-10">
            <View className="bg-accent/10 p-5 rounded-3xl border border-accent/20 mb-4">
              <Image
                source={require("../assets/logo.png")}
                style={{ width: 64, height: 64 }}
              />
            </View>
            <Text className="text-text text-3xl font-extrabold tracking-tight">Aruvi Play</Text>
            <Text className="text-muted text-sm mt-2 text-center px-6 leading-relaxed">
              Your premium personal and public music streaming companion.
            </Text>
          </View>

          {/* Form Card Container */}
          <View className="bg-surface rounded-3xl border border-white/5 p-6 shadow-2xl backdrop-blur-lg">
            {!otpSent ? (
              // Enter Phone Number
              <View>
                <Text className="text-text text-lg font-bold mb-1">Phone Login</Text>
                <Text className="text-muted text-xs mb-4">
                  Enter your mobile number to receive a 6-digit verification code.
                </Text>

                <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/5 px-4 py-1.5 mb-5">
                  <Icon name="phone" size={18} color="#A0A0A0" />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Phone number (e.g. 7806885868)"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    keyboardType="phone-pad"
                    className="flex-1 text-text text-base ml-3 py-2"
                    editable={!loading}
                  />
                </View>

                <Pressable
                  onPress={handleSendOtp}
                  disabled={loading}
                  className="bg-accent active:bg-accent/85 rounded-2xl py-3.5 items-center justify-center flex-row shadow-lg"
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <>
                      <Text className="text-black font-extrabold text-base">Send OTP</Text>
                      <View className="ml-2">
                        <Icon name="chevron-right" size={16} color="#000000" />
                      </View>
                    </>
                  )}
                </Pressable>

                <View className="flex-row items-center my-5">
                  <View className="flex-1 h-[1px] bg-white/10" />
                  <Text className="text-muted/40 text-[10px] mx-3 font-semibold uppercase">Or</Text>
                  <View className="flex-1 h-[1px] bg-white/10" />
                </View>

                <Pressable
                  onPress={signInAnonymously}
                  disabled={loading}
                  className="border border-white/10 active:bg-white/5 rounded-2xl py-3 items-center justify-center flex-row"
                >
                  <Icon name="play" size={14} color="#FFFFFF" />
                  <Text className="text-text font-bold text-sm ml-2">Continue as Guest</Text>
                </Pressable>
              </View>
            ) : (
              // Verification Code
              <View>
                <Text className="text-text text-lg font-bold mb-1">Verification Code</Text>
                <Text className="text-muted text-xs mb-4">
                  Sent to {phoneNumber}. Enter the 6-digit code.
                </Text>

                <View className="flex-row items-center bg-white/5 rounded-2xl border border-white/5 px-4 py-1.5 mb-5">
                  <Icon name="lock" size={18} color="#A0A0A0" />
                  <TextInput
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    keyboardType="number-pad"
                    maxLength={6}
                    className="flex-1 text-text text-base ml-3 py-2 font-bold tracking-widest"
                    editable={!loading}
                  />
                </View>

                <Pressable
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  className="bg-accent active:bg-accent/85 rounded-2xl py-3.5 items-center justify-center flex-row shadow-lg mb-3"
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <Text className="text-black font-extrabold text-base">Verify & Continue</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => useAuthStore.setState({ otpSent: false })}
                  disabled={loading}
                  className="py-2 items-center"
                >
                  <Text className="text-muted active:text-accent/60 text-xs font-semibold">
                    Change Phone Number
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
