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
import { StatusBadge } from '@/components/ui/badge';
import { ScreenLayout } from '@/components/screen-layout';

export interface AssetItem {
  model: string;
  sn: string;
  merchant: string;
  status: string;
}

export const INITIAL_ASSETS: AssetItem[] = [
  {
    model: 'PAX A920 Pro',
    sn: 'SN-PAX-A920-61550',
    merchant: 'Toko Cahaya Abadi · Kebayoran',
    status: 'Waiting',
  },
  {
    model: 'Verifone X990',
    sn: 'SN-VER-X990-52240',
    merchant: 'Warung Kopi Senja · Blok M',
    status: 'In Progress',
  },
  {
    model: 'Ingenico Move/2500',
    sn: 'SN-ING-M25-30918',
    merchant: 'Apotek Kimia Sehat · Fatmawati',
    status: 'Waiting',
  },
  {
    model: 'PAX A920',
    sn: 'SN-PAX-A920-59981',
    merchant: 'Toko Elektronik Jaya · Cipete',
    status: 'Completed',
  },
];

export default function SettlementScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [search, setSearch] = useState('');

  const settleStats = [
    { label: 'WAITING', value: '4', c: '#3B82F6' },
    { label: 'IN PROGRESS', value: '2', c: '#F59E0B' },
    { label: 'COMPLETED', value: '9', c: '#22C55E' },
    { label: 'REJECTED', value: '1', c: '#EF4444' },
  ];

  const query = search.toLowerCase();
  const filteredAssets = INITIAL_ASSETS.filter(
    (a) =>
      !query ||
      a.sn.toLowerCase().includes(query) ||
      a.merchant.toLowerCase().includes(query) ||
      a.model.toLowerCase().includes(query)
  );

  return (
    <ScreenLayout edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        {/* Header Row */}
        <View className="flex-row items-center justify-between">
          <Text className="text-[20px] font-extrabold tracking-[-0.4px]" style={{ color: colors.tx }}>
            Settlement
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/receive-asset' as any)}
            className="flex-row items-center gap-[6px] h-[36px] px-[13px] rounded-[12px] shadow-md"
            style={{ backgroundColor: colors.pri }}>
            <Icon name="qr" size={14} color="#FFFFFF" strokeWidth={2.2} />
            <Text className="text-white text-[11.5px] font-bold">Scan QR</Text>
          </TouchableOpacity>
        </View>

        {/* 4 Summary Stat Boxes */}
        <View className="flex-row gap-[8px] mt-[14px]">
          {settleStats.map((s, i) => (
            <View
              key={i}
              className="flex-1 rounded-[14px] border p-[10px_8px] items-center"
              style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
              <Text className="text-[19px] font-extrabold" style={{ color: s.c }}>
                {s.value}
              </Text>
              <Text className="text-[9px] font-bold mt-[2px] tracking-[0.2px]" style={{ color: colors.tx3 }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Search Bar */}
        <View className="mt-[12px]">
          <Input
            height={44}
            value={search}
            onChangeText={setSearch}
            placeholder="Search serial number, merchant…"
            leftIcon={<Icon name="search" size={16} color={colors.tx3} />}
          />
        </View>

        {/* Section Title */}
        <Text className="text-[13px] font-extrabold mt-[18px]" style={{ color: colors.tx }}>
          Assets to settle
        </Text>

        {/* Assets List */}
        <View className="mt-[10px] gap-[10px]">
          {filteredAssets.map((a, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/settlement-process' as any,
                  params: { sn: a.sn, model: a.model, merchant: a.merchant },
                })
              }>
              <Card className="p-[13px_14px] flex-row gap-[12px] items-center">
                <View
                  className="w-[44px] h-[44px] rounded-[13px] items-center justify-center"
                  style={{ backgroundColor: 'rgba(63,111,168,.1)' }}>
                  <Icon name="terminal" size={20} color={colors.pri} />
                </View>

                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-[7px]">
                    <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
                      {a.model}
                    </Text>
                    <StatusBadge status={a.status} />
                  </View>
                  <Text className="text-[10.5px] font-semibold mt-[3px] font-mono" style={{ color: colors.tx3 }}>
                    {a.sn}
                  </Text>
                  <Text
                    className="text-[11px] font-semibold mt-[2px]"
                    numberOfLines={1}
                    style={{ color: colors.tx2 }}>
                    {a.merchant}
                  </Text>
                </View>

                <Icon name="chevronRight" size={16} color={colors.tx3} strokeWidth={2.2} />
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
