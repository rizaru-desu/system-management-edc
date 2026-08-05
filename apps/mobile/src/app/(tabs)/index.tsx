import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { ScreenLayout } from '@/components/screen-layout';
import authService, { User } from '@/services/auth.service';

const FALLBACK_NAME = 'Andi Prasetyo';

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'AP';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase() || 'AP';
}

export default function DashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());

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
  const initials = getInitials(displayName);

  const stats = [
    { label: "Today's tasks", value: '8', delta: '+2', c: '#3B82F6', bg: 'rgba(59,130,246,.12)', glyph: '☰' },
    { label: 'Completed', value: '3', delta: '37%', c: '#22C55E', bg: 'rgba(34,197,94,.12)', glyph: '✓' },
    { label: 'Pending', value: '5', delta: 'due today', c: '#F59E0B', bg: 'rgba(245,158,11,.13)', glyph: '◔' },
    { label: 'Assets held', value: '12', delta: '4 to settle', c: '#8B5CF6', bg: 'rgba(139,92,246,.12)', glyph: '▣' },
  ];

  const chartData = [
    { d: 'Mon', h: 55 },
    { d: 'Tue', h: 72 },
    { d: 'Wed', h: 48 },
    { d: 'Thu', h: 85 },
    { d: 'Fri', h: 64 },
    { d: 'Sat', h: 30 },
    { d: 'Sun', h: 92 },
  ];

  const activity = [
    { t: 'Completed PM at RM Sederhana Rasa', time: 'Today · 08:42', c: '#22C55E' },
    { t: 'Started reinit — Kopi Arunika', time: 'Today · 08:10', c: '#F59E0B' },
    { t: 'Received asset SN-VER-X990-52240', time: 'Today · 07:55', c: '#3B82F6' },
    { t: 'Accepted task TSK-2381 (Installation)', time: 'Yesterday · 17:20', c: '#8B5CF6' },
  ];

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[12.5px] font-semibold" style={{ color: colors.tx2 }}>
              Good morning ☀
            </Text>
            <Text className="text-[20px] font-extrabold tracking-[-0.4px] mt-[1px]" style={{ color: colors.tx }}>
              {displayName}
            </Text>
            <Text className="text-[11.5px] font-semibold mt-[2px]" style={{ color: colors.tx3 }}>
              Monday, 3 August 2026
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center gap-[10px]">
            <TouchableOpacity
              activeOpacity={0.7}
              className="w-[40px] h-[40px] rounded-[13px] items-center justify-center border relative"
              style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
              <Icon name="bell" size={18} color={colors.tx2} />
              <View className="absolute top-[9px] right-[10px] w-[8px] h-[8px] rounded-full bg-[#EF4444] border-[1.5px]" style={{ borderColor: colors.bg }} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile' as any)}
              className="w-[40px] h-[40px] rounded-[13px] items-center justify-center"
              style={{ backgroundColor: colors.pri }}>
              <Text className="text-white text-[13px] font-extrabold">{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4-Stat Grid */}
        <View className="flex-row flex-wrap gap-[10px] mt-[18px]">
          {stats.map((s, idx) => (
            <Card key={idx} className="w-[48.5%] p-[13px_14px]">
              <View className="flex-row items-center justify-between">
                <Text className="text-[11.5px] font-bold" style={{ color: colors.tx2 }}>
                  {s.label}
                </Text>
                <View
                  className="w-[26px] h-[26px] rounded-[9px] items-center justify-center"
                  style={{ backgroundColor: s.bg }}>
                  <Text className="text-[12px] font-extrabold" style={{ color: s.c }}>
                    {s.glyph}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-baseline gap-[6px] mt-[8px]">
                <Text className="text-[24px] font-extrabold tracking-[-0.5px]" style={{ color: colors.tx }}>
                  {s.value}
                </Text>
                <Text className="text-[10.5px] font-bold" style={{ color: s.c }}>
                  {s.delta}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Quick Actions */}
        <Text className="text-[13.5px] font-extrabold mt-[20px]" style={{ color: colors.tx }}>
          Quick actions
        </Text>
        <View className="flex-row justify-between mt-[10px]">
          {/* Open Task */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/open-tasks' as any)}
            className="items-center gap-[7px]">
            <View
              className="w-[52px] h-[52px] rounded-[16px] items-center justify-center border"
              style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
              <Icon name="task" size={20} color={colors.pri} />
            </View>
            <Text className="text-[10px] font-bold" style={{ color: colors.tx2 }}>
              Open Task
            </Text>
          </TouchableOpacity>

          {/* Settlement */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/settlement' as any)}
            className="items-center gap-[7px]">
            <View
              className="w-[52px] h-[52px] rounded-[16px] items-center justify-center border"
              style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
              <Icon name="settlement" size={20} color={colors.pri} />
            </View>
            <Text className="text-[10px] font-bold" style={{ color: colors.tx2 }}>
              Settlement
            </Text>
          </TouchableOpacity>

          {/* Scan QR */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/receive-asset' as any)}
            className="items-center gap-[7px]">
            <View
              className="w-[52px] h-[52px] rounded-[16px] items-center justify-center shadow-md"
              style={{ backgroundColor: colors.pri }}>
              <Icon name="qr" size={20} color="#FFFFFF" />
            </View>
            <Text className="text-[10px] font-bold" style={{ color: colors.tx2 }}>
              Scan QR
            </Text>
          </TouchableOpacity>

          {/* Receive */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/receive-asset' as any)}
            className="items-center gap-[7px]">
            <View
              className="w-[52px] h-[52px] rounded-[16px] items-center justify-center border"
              style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
              <Icon name="box" size={20} color={colors.pri} />
            </View>
            <Text className="text-[10px] font-bold" style={{ color: colors.tx2 }}>
              Receive
            </Text>
          </TouchableOpacity>

          {/* History */}
          <TouchableOpacity activeOpacity={0.7} className="items-center gap-[7px]">
            <View
              className="w-[52px] h-[52px] rounded-[16px] items-center justify-center border"
              style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
              <Icon name="history" size={20} color={colors.pri} />
            </View>
            <Text className="text-[10px] font-bold" style={{ color: colors.tx2 }}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Performance Bar Chart */}
        <Card className="mt-[20px] p-[16px]">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[13.5px] font-extrabold" style={{ color: colors.tx }}>
                Weekly performance
              </Text>
              <Text className="text-[11px] font-semibold mt-[2px]" style={{ color: colors.tx3 }}>
                Tasks completed · this week
              </Text>
            </View>

            <View className="flex-row items-baseline gap-[4px]">
              <Text className="text-[22px] font-extrabold" style={{ color: colors.pri }}>
                92%
              </Text>
              <Text className="text-[10.5px] font-bold text-[#22C55E]">▲ 4%</Text>
            </View>
          </View>

          {/* Bars Row */}
          <View className="flex-row items-end justify-between h-[88px] mt-[16px]">
            {chartData.map((b, i) => {
              const isSun = i === 6;
              const barBg = isSun ? colors.pri : colorScheme === 'dark' ? 'rgba(148,178,220,.16)' : 'rgba(14,39,72,.08)';
              const labelColor = isSun ? colors.pri : colorScheme === 'dark' ? '#6E82A3' : '#8593A8';

              return (
                <View key={i} className="flex-1 items-center justify-end gap-[6px] h-full">
                  <View
                    className="w-full rounded-t-[6px] rounded-b-[3px]"
                    style={{
                      height: `${b.h}%`,
                      backgroundColor: barBg,
                    }}
                  />
                  <Text className="text-[9.5px] font-bold" style={{ color: labelColor }}>
                    {b.d}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Recent Activity */}
        <View className="flex-row items-center justify-between mt-[20px]">
          <Text className="text-[13.5px] font-extrabold" style={{ color: colors.tx }}>
            Recent activity
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/tasks' as any)}>
            <Text className="text-[11.5px] font-bold" style={{ color: colors.pri }}>
              View all
            </Text>
          </TouchableOpacity>
        </View>

        <Card className="mt-[10px] p-[4px_14px]">
          {activity.map((a, idx) => (
            <View
              key={idx}
              className={`flex-row gap-[12px] py-[11px] ${
                idx < activity.length - 1 ? 'border-b' : ''
              }`}
              style={{ borderColor: colors.bd }}>
              <View className="items-center pt-[3px]">
                <View
                  className="w-[9px] h-[9px] rounded-full"
                  style={{
                    backgroundColor: a.c,
                    shadowColor: a.c,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 4,
                  }}
                />
              </View>

              <View className="flex-1 min-w-0">
                <Text className="text-[12.5px] font-bold leading-[1.35]" style={{ color: colors.tx }}>
                  {a.t}
                </Text>
                <Text className="text-[10.5px] font-semibold mt-[2px]" style={{ color: colors.tx3 }}>
                  {a.time}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </ScreenLayout>
  );
}
