import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/icon';
import { UpdateModal } from '@/components/update-modal';
import updateService, { MobileVersionResponse } from '@/services/update.service';
import authService, { AuthSessionResponse } from '@/services/auth.service';

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [updateInfo, setUpdateInfo] = useState<MobileVersionResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const hasNavigated = useRef(false);
  const sessionResultRef = useRef<AuthSessionResponse | null | undefined>(undefined);

  const navigateNext = useCallback(async (session?: AuthSessionResponse | null) => {
    if (hasNavigated.current) return;

    let targetSession = session !== undefined ? session : sessionResultRef.current;

    // If session has not been evaluated yet, check active Better Auth session
    if (targetSession === undefined) {
      try {
        targetSession = await authService.getSession();
      } catch {
        targetSession = null;
      }
    }

    if (!hasNavigated.current) {
      hasNavigated.current = true;
      if (targetSession?.user && targetSession?.session) {
        router.replace('/(tabs)' as any);
      } else {
        router.replace('/login' as any);
      }
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const minSplashPromise = new Promise((resolve) => setTimeout(resolve, 1500));
      const updateCheckPromise = updateService.checkForUpdate();
      const sessionCheckPromise = authService.getSession();

      try {
        const [, updateResult, sessionResult] = await Promise.all([
          minSplashPromise,
          updateCheckPromise,
          sessionCheckPromise,
        ]);

        if (!isMounted) return;

        sessionResultRef.current = sessionResult;

        if (
          updateResult &&
          updateResult.updateAvailable &&
          (updateResult.updateType === 'ota' || updateResult.updateType === 'apk')
        ) {
          setUpdateInfo(updateResult);
          setShowModal(true);
        } else {
          await navigateNext(sessionResult);
        }
      } catch (err) {
        console.warn('[Splash] Startup initialization failed gracefully:', err);
        if (isMounted) {
          await navigateNext(null);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [navigateNext]);

  const handleDismissModal = () => {
    setShowModal(false);
    void navigateNext();
  };

  const bottomOffset = insets.bottom > 0 ? insets.bottom + 16 : 44;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => {
        if (!showModal) void navigateNext();
      }}
      className="flex-1 items-center justify-center relative bg-[#0E2748]">
      {/* Background Gradient Effect via nested translucent views */}
      <View
        className="absolute inset-0"
        style={{
          backgroundColor: '#0E2748',
        }}
      />

      {/* Pulsing Logo Glass Panel */}
      <View
        className="w-[88px] h-[88px] rounded-[24px] items-center justify-center shadow-2xl border border-white/20"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        }}>
        <Icon name="zap" size={42} color="#FFFFFF" strokeWidth={2} />
      </View>

      {/* Brand Title */}
      <Text className="mt-[22px] text-[26px] font-extrabold text-white tracking-[-0.5px]">
        Fieldra
      </Text>

      {/* Brand Subtitle */}
      <Text className="mt-[6px] text-[13px] font-medium text-white/65">
        EDC Field Operations
      </Text>

      {/* Bottom Version & Spinner */}
      <View
        className="absolute items-center gap-[14px]"
        style={{ bottom: bottomOffset }}>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text className="text-[11px] font-semibold text-white/45">
          Version {updateService.getCurrentVersion()}
        </Text>
      </View>

      {/* Hybrid Update Modal */}
      <UpdateModal
        visible={showModal}
        updateInfo={updateInfo}
        onDismiss={handleDismissModal}
      />
    </TouchableOpacity>
  );
}
