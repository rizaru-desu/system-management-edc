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
import { Toast } from '@/components/ui/toast';
import { ScreenLayout } from '@/components/screen-layout';

export default function ReceiveAssetScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [scanned, setScanned] = useState<boolean>(false);
  const [manualSn, setManualSn] = useState<string>('');
  const [rcond, setRcond] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2200);
  };

  const condLabels = ['Good', 'Minor damage', 'Damaged'];

  const handleSimulateScan = () => {
    setScanned(true);
    showToast('QR detected');
  };

  const handleManualChange = (text: string) => {
    setManualSn(text);
    if (text.trim().length > 3) {
      setScanned(true);
    } else {
      setScanned(false);
    }
  };

  const handleSubmitReceive = () => {
    router.push({
      pathname: '/success' as any,
      params: {
        kind: 'receive',
        model: 'Verifone X990',
        sn: manualSn || 'SN-VER-X990-55013',
        cond: condLabels[rcond],
      },
    });
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
        <Text className="text-[15.5px] font-extrabold" style={{ color: colors.tx }}>
          Receive asset
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        {/* Mode Switcher Tabs */}
        <View
          className="flex-row p-[4px] gap-[4px] rounded-[13px] border"
          style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setMode('scan')}
            className="flex-1 h-[36px] rounded-[10px] items-center justify-center"
            style={{
              backgroundColor: mode === 'scan' ? colors.pri : 'transparent',
            }}>
            <Text
              className="text-[12px] font-extrabold"
              style={{ color: mode === 'scan' ? '#FFFFFF' : colors.tx2 }}>
              Scan QR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setMode('manual');
              setScanned(true);
            }}
            className="flex-1 h-[36px] rounded-[10px] items-center justify-center"
            style={{
              backgroundColor: mode === 'manual' ? colors.pri : 'transparent',
            }}>
            <Text
              className="text-[12px] font-extrabold"
              style={{ color: mode === 'manual' ? '#FFFFFF' : colors.tx2 }}>
              Manual input
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scan QR Viewfinder Frame */}
        {mode === 'scan' && (
          <View className="mt-[14px]">
            <View
              className="h-[280px] rounded-[16px] bg-[#0B1830] relative items-center justify-center overflow-hidden">
              {/* Scanning Corner Frame */}
              <View className="w-[180px] h-[180px] relative items-center justify-center">
                {/* Top-left corner */}
                <View className="absolute top-0 left-0 w-[32px] h-[32px] border-t-[3px] border-l-[3px] border-[#5C8CC4] rounded-tl-[8px]" />
                {/* Top-right corner */}
                <View className="absolute top-0 right-0 w-[32px] h-[32px] border-t-[3px] border-r-[3px] border-[#5C8CC4] rounded-tr-[8px]" />
                {/* Bottom-left corner */}
                <View className="absolute bottom-0 left-0 w-[32px] h-[32px] border-b-[3px] border-l-[3px] border-[#5C8CC4] rounded-bl-[8px]" />
                {/* Bottom-right corner */}
                <View className="absolute bottom-0 right-0 w-[32px] h-[32px] border-b-[3px] border-r-[3px] border-[#5C8CC4] rounded-br-[8px]" />

                {/* Animated Horizontal Scan Line Indicator */}
                <View className="w-[160px] h-[2px] bg-[#5C8CC4] shadow-lg" />
              </View>

              <Text className="absolute bottom-[16px] text-[11px] font-bold text-white/55">
                Align the QR code inside the frame
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSimulateScan}
              className="mt-[12px] w-full h-[46px] rounded-[13px] border items-center justify-center"
              style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
              <Text className="text-[12.5px] font-extrabold" style={{ color: colors.pri }}>
                Simulate scan result
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual Input Mode */}
        {mode === 'manual' && (
          <View className="mt-[14px] gap-[7px]">
            <Text className="text-[12px] font-bold" style={{ color: colors.tx2 }}>
              Serial number
            </Text>
            <Input
              height={48}
              value={manualSn}
              onChangeText={handleManualChange}
              placeholder="e.g. SN-PAX-A920-00000"
              style={{ fontFamily: 'ui-monospace' }}
            />
          </View>
        )}

        {/* Asset Identified Card */}
        {scanned && (
          <Card className="mt-[14px] p-[16px]">
            <View className="flex-row items-center gap-[10px]">
              <View className="w-[22px] h-[22px] rounded-full bg-[#22C55E] items-center justify-center">
                <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3.2} />
              </View>
              <Text className="text-[12.5px] font-extrabold" style={{ color: colors.tx }}>
                Asset identified
              </Text>
            </View>

            <View className="mt-[12px] gap-[8px]">
              <View
                className="flex-row justify-between p-[9px_12px] rounded-[11px] border"
                style={{ backgroundColor: colors.bg, borderColor: colors.bd }}>
                <Text className="text-[11px] font-semibold" style={{ color: colors.tx3 }}>
                  Model
                </Text>
                <Text className="text-[11.5px] font-extrabold" style={{ color: colors.tx }}>
                  Verifone X990
                </Text>
              </View>

              <View
                className="flex-row justify-between p-[9px_12px] rounded-[11px] border"
                style={{ backgroundColor: colors.bg, borderColor: colors.bd }}>
                <Text className="text-[11px] font-semibold" style={{ color: colors.tx3 }}>
                  Serial
                </Text>
                <Text className="text-[11.5px] font-extrabold font-mono" style={{ color: colors.tx }}>
                  {manualSn || 'SN-VER-X990-55013'}
                </Text>
              </View>

              <View
                className="flex-row justify-between p-[9px_12px] rounded-[11px] border"
                style={{ backgroundColor: colors.bg, borderColor: colors.bd }}>
                <Text className="text-[11px] font-semibold" style={{ color: colors.tx3 }}>
                  Origin
                </Text>
                <Text className="text-[11.5px] font-extrabold" style={{ color: colors.tx }}>
                  Warehouse JKT-02
                </Text>
              </View>
            </View>

            <Text className="text-[12px] font-extrabold mt-[14px]" style={{ color: colors.tx }}>
              Condition on receipt
            </Text>
            <View className="flex-row gap-[8px] mt-[9px]">
              {condLabels.map((label, i) => {
                const isAct = rcond === i;
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    onPress={() => setRcond(i)}
                    className="flex-1 h-[36px] rounded-full border items-center justify-center"
                    style={{
                      backgroundColor: isAct ? colors.pri : 'transparent',
                      borderColor: isAct ? 'transparent' : colors.bd,
                    }}>
                    <Text
                      className="text-[11px] font-extrabold"
                      style={{ color: isAct ? '#FFFFFF' : colors.tx2 }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="mt-[16px]">
              <Button title="Confirm receive" onPress={handleSubmitReceive} />
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Floating Toast */}
      <Toast message={toastMessage} visible={!!toastMessage} />
    </ScreenLayout>
  );
}
