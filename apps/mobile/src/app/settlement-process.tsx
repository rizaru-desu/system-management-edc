import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { SignatureCanvas } from '@/components/ui/signature-canvas';
import { Toast } from '@/components/ui/toast';
import { ScreenLayout } from '@/components/screen-layout';

export default function SettlementProcessScreen() {
  const params = useLocalSearchParams<{ sn?: string; model?: string; merchant?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const asset = {
    model: params.model || 'PAX A920 Pro',
    sn: params.sn || 'SN-PAX-A920-61550',
    merchant: params.merchant || 'Toko Cahaya Abadi · Kebayoran',
  };

  const [step, setStep] = useState<number>(0);
  const [cond, setCond] = useState<number>(0);
  const [acc, setAcc] = useState<boolean[]>([true, true, false, true]);
  const [photos, setPhotos] = useState<boolean[]>([false, false]);
  const [receiver, setReceiver] = useState<string>('');
  const [signed, setSigned] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [sigKey, setSigKey] = useState<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2200);
  };

  const stepLabels = ['RECEIVE', 'VERIFY', 'PHOTOS', 'SIGN'];
  const condLabels = ['Good', 'Minor damage', 'Damaged'];
  const accItems = [
    'Power adaptor & cable',
    'Charging dock',
    'SIM card (returned)',
    'Paper roll cover',
  ];
  const photoLabels = ['Unit front & screen', 'Serial number label'];

  const toggleAcc = (i: number) => {
    setAcc((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const togglePhoto = (i: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      if (next[i]) showToast('Photo captured');
      return next;
    });
  };

  const clearSignature = () => {
    setSigKey((prev) => prev + 1);
    setSigned(false);
  };

  const photoDoneCount = photos.filter(Boolean).length;

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else if (!receiver.trim()) {
      showToast('Enter receiver name');
    } else if (!signed) {
      showToast('Receiver signature required');
    } else {
      router.push({
        pathname: '/success' as any,
        params: {
          kind: 'settle',
          model: asset.model,
          sn: asset.sn,
          receiver: receiver,
        },
      });
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  return (
    <ScreenLayout>
      {/* Header Bar */}
      <View className="flex-row items-center gap-[12px] px-[16px] py-[6px] pb-[10px]">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBack}
          className="w-[38px] h-[38px] rounded-[12px] items-center justify-center border"
          style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
          <Icon name="arrowLeft" size={17} color={colors.tx} strokeWidth={2.2} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[15.5px] font-extrabold" style={{ color: colors.tx }}>
            Settlement
          </Text>
          <Text className="text-[10.5px] font-bold font-mono" style={{ color: colors.tx3 }}>
            {asset.sn}
          </Text>
        </View>
      </View>

      {/* 4-Step Stepper */}
      <View className="flex-row items-center px-[24px] py-[10px] pb-[14px]">
        {stepLabels.map((label, idx) => {
          const isDone = idx < step;
          const isActive = idx === step;

          const circleBg = isDone
            ? '#22C55E'
            : isActive
            ? colors.pri
            : 'transparent';

          const circleBorder = isDone
            ? '#22C55E'
            : isActive
            ? 'transparent'
            : colors.bd;

          const circleTextColor = isDone || isActive ? '#FFFFFF' : colors.tx3;
          const labelColor = isActive ? colors.pri : colors.tx3;

          return (
            <View key={idx} className={`flex-row items-center ${idx < 3 ? 'flex-1' : ''}`}>
              <View className="items-center gap-[5px]">
                <View
                  className="w-[30px] h-[30px] rounded-full border-[1.5px] items-center justify-center"
                  style={{
                    backgroundColor: circleBg,
                    borderColor: circleBorder,
                  }}>
                  {isDone ? (
                    <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3.2} />
                  ) : (
                    <Text className="text-[11.5px] font-extrabold" style={{ color: circleTextColor }}>
                      {idx + 1}
                    </Text>
                  )}
                </View>
                <Text
                  className="text-[8.5px] font-extrabold tracking-[0.2px]"
                  style={{ color: labelColor }}>
                  {label}
                </Text>
              </View>

              {idx < 3 && (
                <View
                  className="flex-1 h-[2px] mx-[6px] mb-[16px]"
                  style={{
                    backgroundColor: isDone ? '#22C55E' : colors.bd,
                  }}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Step Content */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}>
        {/* Step 0: Receive */}
        {step === 0 && (
          <Card className="p-[16px]">
            <View className="flex-row gap-[12px] items-center">
              <View
                className="w-[48px] h-[48px] rounded-[14px] items-center justify-center"
                style={{ backgroundColor: 'rgba(63,111,168,.1)' }}>
                <Icon name="terminal" size={22} color={colors.pri} />
              </View>
              <View>
                <Text className="text-[14.5px] font-extrabold" style={{ color: colors.tx }}>
                  {asset.model}
                </Text>
                <Text className="text-[11px] font-semibold mt-[2px] font-mono" style={{ color: colors.tx3 }}>
                  {asset.sn}
                </Text>
              </View>
            </View>

            <View className="mt-[14px] gap-[8px]">
              <View
                className="flex-row justify-between p-[9px_12px] rounded-[11px] border"
                style={{ backgroundColor: colors.bg, borderColor: colors.bd }}>
                <Text className="text-[11px] font-semibold" style={{ color: colors.tx3 }}>
                  From merchant
                </Text>
                <Text className="text-[11.5px] font-extrabold" style={{ color: colors.tx }}>
                  {asset.merchant}
                </Text>
              </View>

              <View
                className="flex-row justify-between p-[9px_12px] rounded-[11px] border"
                style={{ backgroundColor: colors.bg, borderColor: colors.bd }}>
                <Text className="text-[11px] font-semibold" style={{ color: colors.tx3 }}>
                  Pull reason
                </Text>
                <Text className="text-[11.5px] font-extrabold" style={{ color: colors.tx }}>
                  Program ended
                </Text>
              </View>

              <View
                className="flex-row justify-between p-[9px_12px] rounded-[11px] border"
                style={{ backgroundColor: colors.bg, borderColor: colors.bd }}>
                <Text className="text-[11px] font-semibold" style={{ color: colors.tx3 }}>
                  Received at
                </Text>
                <Text className="text-[11.5px] font-extrabold" style={{ color: colors.tx }}>
                  Today · 09:41
                </Text>
              </View>
            </View>

            <View
              className="mt-[12px] flex-row gap-[9px] p-[11px_13px] rounded-[12px] border"
              style={{
                backgroundColor: 'rgba(59,130,246,.08)',
                borderColor: 'rgba(59,130,246,.2)',
              }}>
              <Icon name="info" size={14} color="#3B82F6" strokeWidth={2.2} />
              <Text className="text-[11px] font-semibold flex-1 leading-[1.5]" style={{ color: colors.tx2 }}>
                Confirm the physical unit matches this record before proceeding to verification.
              </Text>
            </View>
          </Card>
        )}

        {/* Step 1: Verify */}
        {step === 1 && (
          <Card className="p-[16px]">
            <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
              Serial number check
            </Text>
            <View
              className="mt-[10px] flex-row items-center gap-[10px] p-[11px_13px] rounded-[12px] border"
              style={{
                backgroundColor: 'rgba(34,197,94,.09)',
                borderColor: 'rgba(34,197,94,.25)',
              }}>
              <View className="w-[22px] h-[22px] rounded-full bg-[#22C55E] items-center justify-center">
                <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3.2} />
              </View>
              <View>
                <Text className="text-[11.5px] font-extrabold font-mono" style={{ color: colors.tx }}>
                  {asset.sn}
                </Text>
                <Text className="text-[10px] font-bold text-[#22C55E] mt-[1px]">
                  Matches system record
                </Text>
              </View>
            </View>

            <Text className="text-[13px] font-extrabold mt-[16px]" style={{ color: colors.tx }}>
              Unit condition
            </Text>
            <View className="flex-row gap-[8px] mt-[10px]">
              {condLabels.map((label, i) => {
                const isAct = cond === i;
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    onPress={() => setCond(i)}
                    className="flex-1 h-[38px] rounded-full border items-center justify-center"
                    style={{
                      backgroundColor: isAct ? colors.pri : 'transparent',
                      borderColor: isAct ? 'transparent' : colors.bd,
                    }}>
                    <Text
                      className="text-[11.5px] font-extrabold"
                      style={{ color: isAct ? '#FFFFFF' : colors.tx2 }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-[13px] font-extrabold mt-[16px]" style={{ color: colors.tx }}>
              Accessories included
            </Text>
            <View className="gap-[8px] mt-[10px]">
              {accItems.map((item, i) => {
                const isChecked = acc[i];
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    onPress={() => toggleAcc(i)}
                    className="flex-row items-center gap-[10px] rounded-[12px] border p-[10px_12px]"
                    style={{
                      backgroundColor: isChecked ? 'rgba(34,197,94,.06)' : 'transparent',
                      borderColor: isChecked ? 'rgba(34,197,94,.3)' : colors.bd,
                    }}>
                    <View
                      className="w-[19px] h-[19px] rounded-[6px] border-[1.5px] items-center justify-center"
                      style={{
                        borderColor: isChecked ? '#22C55E' : colors.bd,
                        backgroundColor: isChecked ? '#22C55E' : 'transparent',
                      }}>
                      {isChecked && <Icon name="check" size={11} color="#FFFFFF" strokeWidth={3.4} />}
                    </View>
                    <Text className="text-[12px] font-bold" style={{ color: colors.tx }}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* Step 2: Photos */}
        {step === 2 && (
          <Card className="p-[16px]">
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
                Photo documentation
              </Text>
              <Text className="text-[11px] font-extrabold" style={{ color: colors.pri }}>
                {photoDoneCount}/2
              </Text>
            </View>

            <View className="flex-row gap-[9px] mt-[11px]">
              {photoLabels.map((label, i) => {
                const isDone = photos[i];
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    onPress={() => togglePhoto(i)}
                    className="flex-1 h-[110px] rounded-[13px] border-[1.5px] border-dashed items-center justify-center gap-[6px] relative overflow-hidden"
                    style={{
                      backgroundColor: isDone ? 'rgba(34,197,94,.05)' : colors.bg,
                      borderColor: isDone ? 'rgba(34,197,94,.45)' : colors.bd,
                    }}>
                    {isDone ? (
                      <View className="absolute top-[7px] right-[7px] w-[20px] h-[20px] rounded-full bg-[#22C55E] items-center justify-center">
                        <Icon name="check" size={11} color="#FFFFFF" strokeWidth={3.4} />
                      </View>
                    ) : (
                      <Icon name="camera" size={20} color={colors.tx3} />
                    )}
                    <Text className="text-[10.5px] font-bold text-center px-2" style={{ color: colors.tx2 }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-[10.5px] font-semibold mt-[12px] leading-[1.5]" style={{ color: colors.tx3 }}>
              Photos are stored offline and synced automatically when connection is available.
            </Text>
          </Card>
        )}

        {/* Step 3: Sign */}
        {step === 3 && (
          <Card className="p-[16px]">
            <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
              Receiver information
            </Text>
            <TextInput
              value={receiver}
              onChangeText={setReceiver}
              placeholder="Receiver full name"
              placeholderTextColor={colors.tx3}
              className="mt-[10px] w-full h-[46px] border rounded-[12px] px-[13px] text-[13px] font-semibold"
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.bd,
                color: colors.tx,
              }}
            />

            <View className="flex-row items-center justify-between mt-[16px] mb-[10px]">
              <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
                Receiver signature
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={clearSignature}>
                <Text className="text-[11px] font-bold" style={{ color: colors.pri }}>
                  Clear
                </Text>
              </TouchableOpacity>
            </View>

            <SignatureCanvas
              key={sigKey}
              onSignatureChange={(hasSig) => setSigned(hasSig)}
              placeholder="✍ Sign here"
            />
          </Card>
        )}
      </ScrollView>

      {/* Bottom Step Actions */}
      <View className="flex-row gap-[9px] px-[16px] py-[12px] pb-[24px]">
        {step > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setStep(step - 1)}
            className="w-[110px] h-[50px] rounded-[14px] items-center justify-center border"
            style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
            <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
              Back
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleNext}
          className="flex-1 h-[50px] rounded-[14px] items-center justify-center shadow-md"
          style={{ backgroundColor: colors.pri }}>
          <Text className="text-white text-[13px] font-extrabold">
            {step === 3 ? 'Submit settlement' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Floating Toast */}
      <Toast message={toastMessage} visible={!!toastMessage} />
    </ScreenLayout>
  );
}
