import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/components/ui/badge';
import { Toast } from '@/components/ui/toast';
import { ScreenLayout } from '@/components/screen-layout';

export interface OpenTaskItem {
  id: string;
  type: string;
  merchant: string;
  addr: string;
  dist: string;
  due: string;
  prio: string;
}

export const INITIAL_OPEN_TASKS: OpenTaskItem[] = [
  {
    id: 'OP-118',
    type: 'Installation',
    merchant: 'Bakso Pak Kumis',
    addr: 'Jl. Bangka Raya No. 9, Mampang',
    dist: '1.8 km',
    due: 'Respond within 42 min',
    prio: 'High',
  },
  {
    id: 'OP-121',
    type: 'Technical Support',
    merchant: 'Laundry Bersih Kilat',
    addr: 'Jl. Pela Mampang No. 14',
    dist: '2.9 km',
    due: 'Respond within 2 h',
    prio: 'Medium',
  },
  {
    id: 'OP-124',
    type: 'Preventive Maintenance',
    merchant: 'Toko Buku Cerdas',
    addr: 'Jl. Antasari No. 51',
    dist: '5.1 km',
    due: 'Respond by tomorrow',
    prio: 'Low',
  },
];

export default function OpenTasksScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [openTasks, setOpenTasks] = useState<OpenTaskItem[]>(INITIAL_OPEN_TASKS);
  const [openFilter, setOpenFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2200);
  };

  const openCategories = [
    { label: 'All', key: 'All' },
    { label: 'Installation', key: 'Installation' },
    { label: 'Support', key: 'Technical Support' },
    { label: 'PM', key: 'Preventive Maintenance' },
  ];

  const filteredOpen = openTasks.filter(
    (t) => openFilter === 'All' || t.type === openFilter
  );

  const handleAccept = (t: OpenTaskItem) => {
    setOpenTasks((prev) => prev.filter((item) => item.id !== t.id));
    showToast('Task accepted — added to your list');
    setTimeout(() => {
      router.replace('/(tabs)/tasks' as any);
    }, 1000);
  };

  const handleReject = (t: OpenTaskItem) => {
    setOpenTasks((prev) => prev.filter((item) => item.id !== t.id));
    showToast('Task declined');
  };

  return (
    <ScreenLayout>
      {/* Header Bar */}
      <View className="flex-row items-center gap-[12px] px-[16px] py-[12px]">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[12px] items-center justify-center border"
          style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
          <Icon name="arrowLeft" size={17} color={colors.tx} strokeWidth={2.2} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[15.5px] font-extrabold" style={{ color: colors.tx }}>
            Open tasks
          </Text>
          <Text className="text-[10.5px] font-bold" style={{ color: colors.tx3 }}>
            Unassigned in your area
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="pb-[2px]"
          contentContainerStyle={{ gap: 7 }}>
          {openCategories.map((c) => (
            <Button
              key={c.key}
              variant="chip"
              title={c.label}
              active={openFilter === c.key}
              onPress={() => setOpenFilter(c.key)}
            />
          ))}
        </ScrollView>

        {/* Task Cards */}
        <View className="mt-[12px] gap-[11px]">
          {filteredOpen.map((t) => (
            <Card key={t.id} className="p-[14px]">
              {/* Type, Priority & Distance */}
              <View className="flex-row items-center gap-[7px]">
                <View
                  className="px-[9px] py-[4px] rounded-full"
                  style={{ backgroundColor: 'rgba(63,111,168,.12)' }}>
                  <Text className="text-[10px] font-extrabold text-[#3F6FA8]">
                    {t.type.toUpperCase()}
                  </Text>
                </View>
                <PriorityBadge priority={t.prio} />
                <View className="flex-1" />
                <Text className="text-[10.5px] font-bold" style={{ color: colors.tx3 }}>
                  {t.dist}
                </Text>
              </View>

              {/* Merchant Details */}
              <Text className="text-[14px] font-extrabold mt-[10px]" style={{ color: colors.tx }}>
                {t.merchant}
              </Text>
              <Text className="text-[11px] font-semibold mt-[3px]" style={{ color: colors.tx2 }}>
                {t.addr}
              </Text>

              {/* Due time */}
              <Text className="text-[10.5px] font-bold mt-[8px]" style={{ color: colors.tx3 }}>
                ⏱ {t.due}
              </Text>

              {/* Action Buttons Row */}
              <View className="flex-row gap-[8px] mt-[12px]">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleReject(t)}
                  className="w-[44px] h-[42px] rounded-[12px] items-center justify-center border"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.07)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}>
                  <Icon name="close" size={15} color="#EF4444" strokeWidth={2.4} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => showToast('Opening navigation…')}
                  className="w-[44px] h-[42px] rounded-[12px] items-center justify-center border"
                  style={{ backgroundColor: colors.bg, borderColor: colors.bd }}>
                  <Icon name="navigate" size={15} color={colors.pri} strokeWidth={2.2} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleAccept(t)}
                  className="flex-1 h-[42px] rounded-[12px] items-center justify-center"
                  style={{ backgroundColor: colors.pri }}>
                  <Text className="text-white text-[12.5px] font-extrabold">Accept task</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}

          {/* Empty State */}
          {filteredOpen.length === 0 && (
            <View className="items-center py-[56px] px-[30px] text-center">
              <View
                className="w-[64px] h-[64px] rounded-[20px] items-center justify-center border"
                style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
                <Text className="text-[24px] font-extrabold text-[#22C55E]">✓</Text>
              </View>
              <Text className="text-[14.5px] font-extrabold mt-[16px]" style={{ color: colors.tx }}>
                All caught up
              </Text>
              <Text className="text-[12px] font-semibold mt-[5px] text-center" style={{ color: colors.tx3 }}>
                No open tasks in this category right now.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Toast */}
      <Toast message={toastMessage} visible={!!toastMessage} />
    </ScreenLayout>
  );
}
