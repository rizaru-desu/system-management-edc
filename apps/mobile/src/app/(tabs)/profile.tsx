import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Appearance,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';
import { ScreenLayout } from '@/components/screen-layout';
import authService, { User } from '@/services/auth.service';

const FALLBACK_NAME = 'Andi Prasetyo';
const FALLBACK_EMAIL = 'andi.p@fieldra.co.id';

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'AP';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase() || 'AP';
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // Only fetch session if not already present in authService
    if (!authService.getCurrentUser()) {
      void authService.getSession().then((session) => {
        if (session?.user) {
          setUser(session.user);
        }
      });
    }
  }, []);

  const displayName = user?.name?.trim() || FALLBACK_NAME;
  const displayEmail = user?.email?.trim() || FALLBACK_EMAIL;
  const initials = getInitials(displayName);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2200);
  };

  const toggleDarkMode = () => {
    const nextScheme = isDark ? 'light' : 'dark';
    Appearance.setColorScheme(nextScheme);
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (e) {
      console.warn('[Profile] Logout error:', e);
    }
    showToast('Logged out');
    setTimeout(() => {
      router.replace('/login' as any);
    }, 800);
  };

  const profileRows = [
    { k: 'Employee ID', v: 'EMP-10482' },
    { k: 'Region', v: 'DKI Jakarta — South' },
    { k: 'Branch', v: 'Kebayoran Baru' },
    { k: 'Phone', v: '+62 812-7745-0921' },
    { k: 'Email', v: displayEmail },
    { k: 'Vehicle', v: 'B 6741 KZT · Honda Vario' },
  ];

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text className="text-[20px] font-extrabold tracking-[-0.4px]" style={{ color: colors.tx }}>
          Profile
        </Text>

        {/* User Technician Card */}
        <Card className="mt-[14px] p-[18px] flex-row gap-[14px] items-center">
          <View
            className="w-[60px] h-[60px] rounded-[19px] items-center justify-center"
            style={{ backgroundColor: colors.pri }}>
            <Text className="text-white text-[20px] font-extrabold">{initials}</Text>
          </View>

          <View className="flex-1 min-w-0">
            <Text className="text-[16.5px] font-extrabold tracking-[-0.2px]" style={{ color: colors.tx }}>
              {displayName}
            </Text>
            <Text className="text-[11.5px] font-semibold mt-[2px]" style={{ color: colors.tx2 }}>
              Senior Field Technician
            </Text>

            <View className="flex-row gap-[6px] mt-[7px]">
              <View className="px-[9px] py-[3px] rounded-full bg-[rgba(34,197,94,.13)]">
                <Text className="text-[9.5px] font-extrabold text-[#22C55E]">● ON DUTY</Text>
              </View>
              <View
                className="px-[9px] py-[3px] rounded-full"
                style={{ backgroundColor: 'rgba(63,111,168,.12)' }}>
                <Text className="text-[9.5px] font-extrabold" style={{ color: colors.pri }}>
                  EMP-10482
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Profile Info Details Card */}
        <Card className="mt-[14px] p-[4px_16px]">
          {profileRows.map((r, i) => (
            <View
              key={i}
              className={`flex-row items-center justify-between py-[12px] ${
                i < profileRows.length - 1 ? 'border-b' : ''
              }`}
              style={{ borderColor: colors.bd }}>
              <Text className="text-[12px] font-semibold" style={{ color: colors.tx2 }}>
                {r.k}
              </Text>
              <Text className="text-[12.5px] font-bold" style={{ color: colors.tx }}>
                {r.v}
              </Text>
            </View>
          ))}
        </Card>

        {/* Settings & Preferences Card */}
        <Card className="mt-[14px] p-[4px_16px]">
          {/* Dark Mode Toggle */}
          <View
            className="flex-row items-center justify-between py-[12px] border-b"
            style={{ borderColor: colors.bd }}>
            <View className="flex-row items-center gap-[11px]">
              <Icon name="moon" size={17} color={colors.tx2} />
              <Text className="text-[12.5px] font-bold" style={{ color: colors.tx }}>
                Dark mode
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleDarkMode}
              className="w-[44px] h-[26px] rounded-full justify-center p-[3px] relative"
              style={{
                backgroundColor: isDark ? colors.pri : 'rgba(14,39,72,.18)',
              }}>
              <View
                className={`w-[20px] h-[20px] rounded-full bg-white shadow-md ${
                  isDark ? 'translate-x-[18px]' : 'translate-x-0'
                }`}
              />
            </TouchableOpacity>
          </View>

          {/* Language */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => showToast('Language: English')}
            className="flex-row items-center justify-between py-[12px] border-b"
            style={{ borderColor: colors.bd }}>
            <View className="flex-row items-center gap-[11px]">
              <Icon name="globe" size={17} color={colors.tx2} />
              <Text className="text-[12.5px] font-bold" style={{ color: colors.tx }}>
                Language
              </Text>
            </View>
            <Text className="text-[12px] font-bold" style={{ color: colors.tx3 }}>
              English ›
            </Text>
          </TouchableOpacity>

          {/* Help center */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => showToast('Opening Help Center…')}
            className="flex-row items-center justify-between py-[12px] border-b"
            style={{ borderColor: colors.bd }}>
            <View className="flex-row items-center gap-[11px]">
              <Icon name="help" size={17} color={colors.tx2} />
              <Text className="text-[12.5px] font-bold" style={{ color: colors.tx }}>
                Help center
              </Text>
            </View>
            <Text className="text-[12px] font-bold" style={{ color: colors.tx3 }}>
              ›
            </Text>
          </TouchableOpacity>

          {/* App version */}
          <View className="flex-row items-center justify-between py-[12px]">
            <View className="flex-row items-center gap-[11px]">
              <Icon name="history" size={17} color={colors.tx2} />
              <Text className="text-[12.5px] font-bold" style={{ color: colors.tx }}>
                App version
              </Text>
            </View>
            <Text className="text-[12px] font-bold" style={{ color: colors.tx3 }}>
              2.4.1 (891)
            </Text>
          </View>
        </Card>

        {/* Log Out Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogout}
          className="mt-[16px] w-full h-[48px] rounded-[14px] border items-center justify-center flex-row gap-[8px]"
          style={{
            backgroundColor: 'rgba(239,68,68,.08)',
            borderColor: 'rgba(239,68,68,.3)',
          }}>
          <Icon name="logOut" size={16} color="#EF4444" strokeWidth={2.2} />
          <Text className="text-[#EF4444] text-[13.5px] font-extrabold">Log out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Toast */}
      <Toast message={toastMessage} visible={!!toastMessage} />
    </ScreenLayout>
  );
}
