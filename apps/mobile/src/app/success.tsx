import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { ScreenLayout } from '@/components/screen-layout';

export default function SuccessScreen() {
  const params = useLocalSearchParams<{
    kind?: string;
    id?: string;
    merchant?: string;
    checkDone?: string;
    model?: string;
    sn?: string;
    receiver?: string;
    cond?: string;
  }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const kind = params.kind || 'task';
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2200);
  };

  let title = 'Task completed';
  let subtitle =
    'Great work. The report was saved and will sync when you are back online.';
  let summaryRows: { k: string; v: string }[] = [
    { k: 'Task', v: params.id || 'TSK-2381' },
    { k: 'Merchant', v: params.merchant || 'Toko Sinar Jaya' },
    { k: 'Checklist', v: params.checkDone || '5/5 done' },
    { k: 'Duration', v: '48 min' },
  ];

  if (kind === 'settle') {
    title = 'Settlement submitted';
    subtitle =
      'The asset has been settled and the receipt is ready to share with the receiver.';
    summaryRows = [
      { k: 'Asset', v: params.model || 'PAX A920 Pro' },
      { k: 'Serial', v: params.sn || 'SN-PAX-A920-61550' },
      { k: 'Receiver', v: params.receiver || 'Budi Santoso' },
      { k: 'Time', v: 'Today · 09:41' },
    ];
  } else if (kind === 'receive') {
    title = 'Asset received';
    subtitle =
      'The asset is now registered under your custody and synced to inventory.';
    summaryRows = [
      { k: 'Asset', v: params.model || 'Verifone X990' },
      { k: 'Serial', v: params.sn || 'SN-VER-X990-55013' },
      { k: 'Condition', v: params.cond || 'Good' },
      { k: 'Time', v: 'Today · 09:41' },
    ];
  }

  return (
    <ScreenLayout className="items-center justify-center p-[32px]">
      {/* Pulsing Green Check Circle Icon */}
      <View
        className="w-[92px] h-[92px] rounded-full items-center justify-center"
        style={{ backgroundColor: 'rgba(34,197,94,.13)' }}>
        <View
          className="w-[64px] h-[64px] rounded-full bg-[#22C55E] items-center justify-center shadow-lg"
          style={{
            shadowColor: '#22C55E',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 28,
            elevation: 6,
          }}>
          <Icon name="check" size={30} color="#FFFFFF" strokeWidth={3} />
        </View>
      </View>

      {/* Title & Subtitle */}
      <Text className="mt-[24px] text-[21px] font-extrabold tracking-[-0.4px] text-center" style={{ color: colors.tx }}>
        {title}
      </Text>

      <Text
        className="mt-[8px] text-[12.5px] font-semibold text-center leading-[1.55] max-w-[280px]"
        style={{ color: colors.tx2 }}>
        {subtitle}
      </Text>

      {/* Summary Card */}
      <Card className="mt-[22px] w-full max-w-[300px] p-[14px_18px]">
        {summaryRows.map((r, i) => (
          <View key={i} className="flex-row justify-between py-[5px]">
            <Text className="text-[11px] font-semibold" style={{ color: colors.tx3 }}>
              {r.k}
            </Text>
            <Text className="text-[11.5px] font-extrabold" style={{ color: colors.tx }}>
              {r.v}
            </Text>
          </View>
        ))}
      </Card>

      {/* Generate Receipt Button (for Settlement flow) */}
      {kind === 'settle' && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => showToast('Receipt PDF generated')}
          className="mt-[14px] h-[44px] px-[20px] rounded-[13px] border flex-row items-center gap-[8px]"
          style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
          <Icon name="receipt" size={15} color={colors.pri} strokeWidth={2.2} />
          <Text className="text-[12.5px] font-extrabold" style={{ color: colors.pri }}>
            Generate receipt
          </Text>
        </TouchableOpacity>
      )}

      {/* Back to Dashboard Button */}
      <View className="mt-[12px] w-full max-w-[260px]">
        <Button
          title="Back to dashboard"
          onPress={() => router.replace('/(tabs)' as any)}
        />
      </View>

      {/* Toast */}
      <Toast message={toastMessage} visible={!!toastMessage} />
    </ScreenLayout>
  );
}
