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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityBadge, TypeGlyphBadge } from '@/components/ui/badge';
import { Toast } from '@/components/ui/toast';
import { ScreenLayout } from '@/components/screen-layout';

export interface TaskItem {
  id: string;
  type: string;
  merchant: string;
  addr: string;
  dist: string;
  due: string;
  prio: string;
  status: string;
  progress: number;
  pic: string;
  phone: string;
  terminal: string;
  tid: string;
  mid: string;
  sn: string;
}

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'TSK-2381',
    type: 'Installation',
    merchant: 'Toko Sinar Jaya',
    addr: 'Jl. Kemang Raya No. 12, Jakarta Selatan',
    dist: '2.4 km',
    due: 'Today · 10:30',
    prio: 'High',
    status: 'Pending',
    progress: 0,
    pic: 'Budi Santoso',
    phone: '+62 812-3456-7890',
    terminal: 'PAX A920 Pro',
    tid: '88231045',
    mid: '000712345881',
    sn: 'SN-PAX-A920-77812',
  },
  {
    id: 'TSK-2377',
    type: 'Reinit',
    merchant: 'Kopi Arunika',
    addr: 'Jl. Senopati No. 48, Jakarta Selatan',
    dist: '4.1 km',
    due: 'Today · 13:00',
    prio: 'Medium',
    status: 'On Progress',
    progress: 45,
    pic: 'Sari Wulandari',
    phone: '+62 813-9922-1044',
    terminal: 'Verifone X990',
    tid: '88214470',
    mid: '000712340227',
    sn: 'SN-VER-X990-55013',
  },
  {
    id: 'TSK-2379',
    type: 'Technical Support',
    merchant: 'Apotek Sehat Farma',
    addr: 'Jl. Fatmawati No. 88, Cilandak',
    dist: '5.8 km',
    due: 'Today · 15:30',
    prio: 'High',
    status: 'Pending',
    progress: 0,
    pic: 'Rina Melati',
    phone: '+62 811-2044-7788',
    terminal: 'Ingenico Move/2500',
    tid: '88209912',
    mid: '000712338105',
    sn: 'SN-ING-M25-31447',
  },
  {
    id: 'TSK-2371',
    type: 'Rollout',
    merchant: 'Minimart Berkah',
    addr: 'Jl. Radio Dalam No. 5, Gandaria',
    dist: '7.2 km',
    due: 'Tomorrow · 09:00',
    prio: 'Low',
    status: 'Pending',
    progress: 0,
    pic: 'Hendra Gunawan',
    phone: '+62 812-5501-3390',
    terminal: 'PAX A920',
    tid: '88198834',
    mid: '000712331990',
    sn: 'SN-PAX-A920-70233',
  },
  {
    id: 'TSK-2368',
    type: 'Preventive Maintenance',
    merchant: 'RM Sederhana Rasa',
    addr: 'Jl. Panglima Polim No. 21',
    dist: '3.0 km',
    due: 'Today · 08:00',
    prio: 'Medium',
    status: 'Completed',
    progress: 100,
    pic: 'Dewi Kartika',
    phone: '+62 815-6070-2211',
    terminal: 'PAX A920',
    tid: '88190021',
    mid: '000712329944',
    sn: 'SN-PAX-A920-68812',
  },
  {
    id: 'TSK-2365',
    type: 'Installation',
    merchant: 'Butik Melati Indah',
    addr: 'Jl. Cipete Raya No. 33',
    dist: '6.5 km',
    due: 'Yesterday · 16:00',
    prio: 'Low',
    status: 'Rejected',
    progress: 0,
    pic: 'Maya Puspita',
    phone: '+62 812-8873-0102',
    terminal: 'Verifone X990',
    tid: '88187745',
    mid: '000712327716',
    sn: 'SN-VER-X990-54120',
  },
];

export default function TasksScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2200);
  };

  const categories = [
    { label: 'All', key: 'All' },
    { label: 'Installation', key: 'Installation' },
    { label: 'Reinit', key: 'Reinit' },
    { label: 'Rollout', key: 'Rollout' },
    { label: 'Support', key: 'Technical Support' },
    { label: 'PM', key: 'Preventive Maintenance' },
  ];

  const query = search.toLowerCase();
  const filteredTasks = INITIAL_TASKS.filter((t) => {
    const matchFilter = filter === 'All' || t.type === filter;
    const matchQuery =
      !query ||
      t.merchant.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query);
    return matchFilter && matchQuery;
  });

  const activeCount = INITIAL_TASKS.filter(
    (t) => t.status !== 'Completed' && t.status !== 'Rejected'
  ).length;

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        {/* Header Row */}
        <View className="flex-row items-center justify-between">
          <Text className="text-[20px] font-extrabold tracking-[-0.4px]" style={{ color: colors.tx }}>
            Tasks
          </Text>
          <View
            className="px-[11px] py-[5px] rounded-full border"
            style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
            <Text className="text-[11px] font-bold" style={{ color: colors.tx2 }}>
              {activeCount} active
            </Text>
          </View>
        </View>

        {/* Search & Filter Row */}
        <View className="flex-row gap-[9px] mt-[14px]">
          <View className="flex-1">
            <Input
              height={44}
              value={search}
              onChangeText={setSearch}
              placeholder="Search merchant, task ID…"
              leftIcon={<Icon name="search" size={16} color={colors.tx3} />}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            className="w-[44px] h-[44px] rounded-[14px] items-center justify-center border"
            style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
            <Icon name="filter" size={17} color={colors.tx2} />
          </TouchableOpacity>
        </View>

        {/* Filter Chips Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-[12px] pb-[2px]"
          contentContainerStyle={{ gap: 7 }}>
          {categories.map((c) => (
            <Button
              key={c.key}
              variant="chip"
              title={c.label}
              active={filter === c.key}
              onPress={() => setFilter(c.key)}
            />
          ))}
        </ScrollView>

        {/* Task Cards List */}
        <View className="mt-[14px] gap-[11px]">
          {filteredTasks.map((t) => (
            <TouchableOpacity
              key={t.id}
              activeOpacity={0.85}
              onPress={() => router.push(`/task/${t.id}` as any)}>
              <Card className="p-[14px]">
                {/* Badges & Task ID */}
                <View className="flex-row items-center gap-[7px]">
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.prio} />
                  <View className="flex-1" />
                  <Text className="text-[10.5px] font-bold" style={{ color: colors.tx3 }}>
                    {t.id}
                  </Text>
                </View>

                {/* Type Glyph & Merchant Details */}
                <View className="flex-row gap-[11px] mt-[11px]">
                  <TypeGlyphBadge type={t.type} size={40} />
                  <View className="flex-1 min-w-0">
                    <Text
                      className="text-[14px] font-extrabold tracking-[-0.2px]"
                      style={{ color: colors.tx }}>
                      {t.merchant}
                    </Text>
                    <Text
                      className="text-[11px] font-semibold mt-[2px]"
                      numberOfLines={1}
                      style={{ color: colors.tx2 }}>
                      {t.type} · {t.addr}
                    </Text>
                  </View>
                </View>

                {/* Distance, Due & Quick Actions */}
                <View className="flex-row items-center justify-between mt-[11px]">
                  <View className="flex-row items-center gap-[12px]">
                    <View className="flex-row items-center gap-[4px]">
                      <Icon name="mapPin" size={12} color={colors.tx3} strokeWidth={2.2} />
                      <Text className="text-[10.5px] font-bold" style={{ color: colors.tx3 }}>
                        {t.dist}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-[4px]">
                      <Icon name="history" size={12} color={colors.tx3} strokeWidth={2.2} />
                      <Text className="text-[10.5px] font-bold" style={{ color: colors.tx3 }}>
                        {t.due}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row gap-[6px]">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={(e) => {
                        e.stopPropagation();
                        showToast('Opening navigation…');
                      }}
                      className="w-[30px] h-[30px] rounded-[10px] items-center justify-center border"
                      style={{ backgroundColor: colors.bg, borderColor: colors.bd }}>
                      <Icon name="map" size={14} color={colors.pri} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={(e) => {
                        e.stopPropagation();
                        showToast(`Calling ${t.pic}…`);
                      }}
                      className="w-[30px] h-[30px] rounded-[10px] items-center justify-center border"
                      style={{ backgroundColor: colors.bg, borderColor: colors.bd }}>
                      <Icon name="phone" size={13} color={colors.pri} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Progress Bar (if active) */}
                {t.progress > 0 && (
                  <View className="mt-[11px]">
                    <View className="flex-row justify-between mb-[5px]">
                      <Text className="text-[10px] font-bold" style={{ color: colors.tx3 }}>
                        Progress
                      </Text>
                      <Text className="text-[10px] font-bold" style={{ color: colors.pri }}>
                        {t.progress}%
                      </Text>
                    </View>
                    <View
                      className="h-[5px] rounded-full overflow-hidden"
                      style={{ backgroundColor: colors.track }}>
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${t.progress}%`,
                          backgroundColor: colors.pri,
                        }}
                      />
                    </View>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          ))}

          {/* Empty Filter State */}
          {filteredTasks.length === 0 && (
            <View className="items-center py-[56px] px-[30px] text-center">
              <View
                className="w-[64px] h-[64px] rounded-[20px] items-center justify-center border"
                style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
                <Icon name="search" size={26} color={colors.tx3} />
              </View>
              <Text className="text-[14.5px] font-extrabold mt-[16px]" style={{ color: colors.tx }}>
                No tasks found
              </Text>
              <Text className="text-[12px] font-semibold mt-[5px] text-center leading-[1.5]" style={{ color: colors.tx3 }}>
                Try a different keyword or clear the active filter.
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setSearch('');
                  setFilter('All');
                }}
                className="mt-[16px] h-[38px] px-[18px] rounded-[12px] border items-center justify-center"
                style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
                <Text className="text-[12px] font-bold" style={{ color: colors.pri }}>
                  Clear filters
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Toast */}
      <Toast message={toastMessage} visible={!!toastMessage} />
    </ScreenLayout>
  );
}
