import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScreenLayout } from '@/components/screen-layout';
import permissionService, { PermissionStatusResult } from '@/services/permission.service';

export default function StartupPermissionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [isChecking, setIsChecking] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatusResult>({
    camera: false,
    location: false,
    allGranted: false,
    isPermanentlyDenied: false,
  });
  const hasNavigated = useRef(false);

  const proceedToSplash = useCallback(() => {
    if (!hasNavigated.current) {
      hasNavigated.current = true;
      router.replace('/splash' as any);
    }
  }, [router]);


  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      const result = await permissionService.checkPermissions();
      if (!isMounted) return;
      if (result.allGranted) {
        proceedToSplash();
      } else {
        setPermissionStatus(result);
        setIsChecking(false);
      }
    };

    void check();

    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          void check();
        }
      },
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [proceedToSplash]);

  const handleGrantPermissions = async () => {
    setIsChecking(true);
    const result = await permissionService.requestPermissions();
    if (result.allGranted) {
      proceedToSplash();
    } else {
      setPermissionStatus(result);
      setIsChecking(false);
    }
  };

  const handleOpenSettings = async () => {
    await permissionService.openSettings();
  };

  const handleExitApp = () => {
    permissionService.exitApp();
  };

  if (isChecking) {
    return (
      <ScreenLayout className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.pri} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 28,
          justifyContent: 'space-between',
        }}
        showsVerticalScrollIndicator={false}>
        <View>
          {/* Header Icon */}
          <View
            className="w-[64px] h-[64px] rounded-[20px] items-center justify-center mt-[12px]"
            style={{
              backgroundColor: 'rgba(63, 111, 168, 0.12)',
              borderWidth: 1,
              borderColor: 'rgba(63, 111, 168, 0.25)',
            }}>
            <Icon name="lock" size={30} color={colors.pri} strokeWidth={2.2} />
          </View>

          {/* Title & Description */}
          <Text
            className="mt-[20px] text-[24px] font-extrabold tracking-[-0.5px]"
            style={{ color: colors.tx }}>
            Permissions Required
          </Text>
          <Text
            className="mt-[8px] text-[13.5px] font-medium leading-[20px]"
            style={{ color: colors.tx2 }}>
            Fieldra EDC needs the following permissions to support field operations, verify merchant visits, and process terminal transactions.
          </Text>

          {/* Permission Items */}
          <View className="mt-[24px] gap-[14px]">
            {/* Camera Permission Card */}
            <Card className="p-[16px]">
              <View className="flex-row items-start gap-[14px]">
                <View
                  className="w-[44px] h-[44px] rounded-[13px] items-center justify-center"
                  style={{
                    backgroundColor: permissionStatus.camera
                      ? 'rgba(34, 197, 94, 0.12)'
                      : 'rgba(63, 111, 168, 0.12)',
                  }}>
                  <Icon
                    name="camera"
                    size={22}
                    color={permissionStatus.camera ? '#22C55E' : colors.pri}
                    strokeWidth={2}
                  />
                </View>

                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-[15px] font-extrabold"
                      style={{ color: colors.tx }}>
                      Camera Access
                    </Text>
                    <View
                      className="px-[8px] py-[3px] rounded-full"
                      style={{
                        backgroundColor: permissionStatus.camera
                          ? 'rgba(34, 197, 94, 0.12)'
                          : 'rgba(239, 68, 68, 0.12)',
                      }}>
                      <Text
                        className="text-[10px] font-extrabold tracking-[0.3px]"
                        style={{
                          color: permissionStatus.camera ? '#22C55E' : '#EF4444',
                        }}>
                        {permissionStatus.camera ? 'GRANTED' : 'REQUIRED'}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="mt-[6px] text-[12.5px] font-medium leading-[18px]"
                    style={{ color: colors.tx2 }}>
                    Used to scan EDC machine serial numbers, barcodes, QR codes, and capture photo documentation of completed field tasks.
                  </Text>
                </View>
              </View>
            </Card>

            {/* Location Permission Card */}
            <Card className="p-[16px]">
              <View className="flex-row items-start gap-[14px]">
                <View
                  className="w-[44px] h-[44px] rounded-[13px] items-center justify-center"
                  style={{
                    backgroundColor: permissionStatus.location
                      ? 'rgba(34, 197, 94, 0.12)'
                      : 'rgba(63, 111, 168, 0.12)',
                  }}>
                  <Icon
                    name="mapPin"
                    size={22}
                    color={permissionStatus.location ? '#22C55E' : colors.pri}
                    strokeWidth={2}
                  />
                </View>

                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-[15px] font-extrabold"
                      style={{ color: colors.tx }}>
                      Location Access
                    </Text>
                    <View
                      className="px-[8px] py-[3px] rounded-full"
                      style={{
                        backgroundColor: permissionStatus.location
                          ? 'rgba(34, 197, 94, 0.12)'
                          : 'rgba(239, 68, 68, 0.12)',
                      }}>
                      <Text
                        className="text-[10px] font-extrabold tracking-[0.3px]"
                        style={{
                          color: permissionStatus.location ? '#22C55E' : '#EF4444',
                        }}>
                        {permissionStatus.location ? 'GRANTED' : 'REQUIRED'}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="mt-[6px] text-[12.5px] font-medium leading-[18px]"
                    style={{ color: colors.tx2 }}>
                    Required for field technician attendance verification, merchant visit check-ins, and automated task dispatch tracking.
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mt-[32px] gap-[12px]">
          {/* Grant Permission Button */}
          <Button
            title="Grant Permission"
            variant="primary"
            onPress={handleGrantPermissions}
          />

          {/* Open Settings Button */}
          <Button
            title="Open Settings"
            variant="outline"
            onPress={handleOpenSettings}
          />

          {/* Exit App Button */}
          <Button
            title="Exit App"
            variant="danger"
            onPress={handleExitApp}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
