import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/theme";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScreenLayout } from "@/components/screen-layout";
import authService from "@/services/auth.service";

export type LoginType = "Corporate Account" | "Local Account";

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];

  const [loginType, setLoginType] = useState<LoginType>("Corporate Account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    const trimmedIdentifier = email.trim();
    if (!trimmedIdentifier) {
      errors.email =
        loginType === "Corporate Account"
          ? "Username is required"
          : "Email address is required";
    } else if (
      loginType === "Local Account" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedIdentifier)
    ) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async () => {
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      await authService.signIn({
        email: email.trim(),
        password,
        rememberMe: remember,
      });

      router.replace("/(tabs)" as any);
    } catch (error) {
      const message = authService.getErrorMessage(error);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingBottom: 24,
          paddingTop: 28,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Icon Badge */}
        <View
          className="w-[58px] h-[58px] rounded-[17px] items-center justify-center mt-[26px]"
          style={{
            backgroundColor: colors.pri,
            shadowColor: colors.pri,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 24,
            elevation: 4,
          }}
        >
          <Icon name="zap" size={28} color="#FFFFFF" strokeWidth={2} />
        </View>

        {/* Heading */}
        <Text
          className="mt-[22px] text-[25px] font-extrabold tracking-[-0.5px]"
          style={{ color: colors.tx }}
        >
          Welcome back
        </Text>
        <Text
          className="mt-[5px] text-[13.5px] font-medium"
          style={{ color: colors.tx2 }}
        >
          Sign in to your technician account
        </Text>

        {/* Error Banner */}
        {errorMessage && (
          <View
            className="mt-[18px] p-[13px] rounded-[13px] flex-row items-center gap-[10px]"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.28)",
            }}
          >
            <Icon name="info" size={18} color="#EF4444" />
            <Text
              className="flex-1 text-[12.5px] font-semibold leading-[18px]"
              style={{ color: "#EF4444" }}
            >
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Login Type Selector */}
        <View
          className="mt-[20px] flex-row p-[4px] rounded-[13px] border"
          style={{ backgroundColor: colors.surf, borderColor: colors.bd }}
        >
          {(["Corporate Account", "Local Account"] as const).map((type) => {
            const isSelected = loginType === type;
            return (
              <TouchableOpacity
                key={type}
                activeOpacity={0.8}
                onPress={() => {
                  setLoginType(type);
                  setErrorMessage(null);
                  setValidationErrors({});
                }}
                className="flex-1 py-[8px] rounded-[10px] items-center justify-center"
                style={{
                  backgroundColor: isSelected ? colors.pri : "transparent",
                }}
              >
                <Text
                  className="text-[12px] font-bold"
                  style={{
                    color: isSelected ? "#FFFFFF" : colors.tx2,
                  }}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Form Fields */}
        <View className="mt-[20px] gap-[14px]">
          {/* Email / Username Field */}
          <View className="gap-[7px]">
            <Text
              className="text-[12px] font-bold"
              style={{ color: colors.tx2 }}
            >
              {loginType === "Corporate Account" ? "Username" : "Email Address"}
            </Text>
            <Input
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (validationErrors.email) {
                  setValidationErrors((prev) => ({
                    ...prev,
                    email: undefined,
                  }));
                }
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={
                loginType === "Corporate Account" ? "default" : "email-address"
              }
              placeholder={
                loginType === "Corporate Account"
                  ? "e.g. john.doe@company.com"
                  : "e.g. john.doe@example.com"
              }
              editable={!isLoading}
              leftIcon={<Icon name="user" size={17} color={colors.tx3} />}
            />
            {validationErrors.email && (
              <Text className="text-[11px] font-semibold text-[#EF4444] ml-[2px]">
                {validationErrors.email}
              </Text>
            )}
          </View>

          {/* Password Field */}
          <View className="gap-[7px]">
            <Text
              className="text-[12px] font-bold"
              style={{ color: colors.tx2 }}
            >
              Password
            </Text>
            <Input
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (validationErrors.password) {
                  setValidationErrors((prev) => ({
                    ...prev,
                    password: undefined,
                  }));
                }
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={showPassword ? "none" : "password"}
              placeholder="Enter your password"
              editable={!isLoading}
              leftIcon={<Icon name="lock" size={17} color={colors.tx3} />}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  <Icon
                    name={showPassword ? "eyeOff" : "eye"}
                    size={17}
                    color={colors.tx3}
                  />
                </TouchableOpacity>
              }
            />
            {loginType === "Corporate Account" && (
              <Text
                className="text-[11.5px] font-medium leading-[16px] mt-[1px]"
                style={{ color: colors.tx3 }}
              >
                Your password is managed by your organization's IT
                administrator.
              </Text>
            )}
            {validationErrors.password && (
              <Text className="text-[11px] font-semibold text-[#EF4444] ml-[2px]">
                {validationErrors.password}
              </Text>
            )}
          </View>
        </View>

        {/* Remember Me & Forgot Password Row */}
        <View
          className={`mt-[14px] flex-row items-center ${loginType === "Local Account" ? "justify-between" : "justify-start"}`}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={isLoading}
            onPress={() => setRemember(!remember)}
            className="flex-row items-center gap-[8px]"
          >
            <View
              className="w-[19px] h-[19px] rounded-[6px] items-center justify-center border-[1.5px]"
              style={{
                borderColor: remember ? colors.pri : colors.bd,
                backgroundColor: remember ? colors.pri : "transparent",
              }}
            >
              {remember && (
                <Icon
                  name="check"
                  size={12}
                  color="#FFFFFF"
                  strokeWidth={3.2}
                />
              )}
            </View>
            <Text
              className="text-[12.5px] font-semibold"
              style={{ color: colors.tx2 }}
            >
              Remember me
            </Text>
          </TouchableOpacity>

          {loginType === "Local Account" && (
            <TouchableOpacity activeOpacity={0.7} disabled={isLoading}>
              <Text
                className="text-[12.5px] font-bold"
                style={{ color: colors.pri }}
              >
                Forgot your password?
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign In Button */}
        <View className="mt-[24px]">
          <Button variant="primary" disabled={isLoading} onPress={handleSignIn}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white text-[15px] font-extrabold tracking-[0.2px]">
                Sign In
              </Text>
            )}
          </Button>
        </View>

        {/* OR Divider */}
        <View className="mt-[20px] flex-row items-center gap-[12px]">
          <View
            className="flex-1 h-[1px]"
            style={{ backgroundColor: colors.bd }}
          />
          <Text
            className="text-[11px] font-semibold"
            style={{ color: colors.tx3 }}
          >
            OR
          </Text>
          <View
            className="flex-1 h-[1px]"
            style={{ backgroundColor: colors.bd }}
          />
        </View>

        {/* Biometric Login Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isLoading}
          onPress={handleSignIn}
          className="mt-[18px] self-center items-center gap-[8px]"
        >
          <View
            className="w-[56px] h-[56px] rounded-full items-center justify-center border"
            style={{
              backgroundColor: colors.surf,
              borderColor: colors.bd,
              shadowColor: "#0E2748",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08,
              shadowRadius: 18,
              elevation: 2,
            }}
          >
            <Icon name="fingerprint" size={26} color={colors.pri} />
          </View>
          <Text
            className="text-[12px] font-semibold"
            style={{ color: colors.tx2 }}
          >
            Biometric login
          </Text>
        </TouchableOpacity>

        <View className="flex-1 min-h-[24px]" />

        {/* Footer */}
        <Text
          className="text-center text-[11px] font-semibold mt-[24px]"
          style={{ color: colors.tx3 }}
        >
          Fieldra EDC · v2.4.1
        </Text>
      </ScrollView>
    </ScreenLayout>
  );
}
