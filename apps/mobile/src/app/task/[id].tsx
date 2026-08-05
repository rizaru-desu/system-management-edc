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
import { StatusBadge } from '@/components/ui/badge';
import { SignatureCanvas } from '@/components/ui/signature-canvas';
import { Toast } from '@/components/ui/toast';
import { ScreenLayout } from '@/components/screen-layout';
import { INITIAL_TASKS, TaskItem } from '../(tabs)/tasks';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const task: TaskItem =
    INITIAL_TASKS.find((t) => t.id === id) || INITIAL_TASKS[0];

  const checkItems = [
    'Verify merchant identity & PIC',
    'Install terminal & insert SIM',
    'Test transaction (sale + void)',
    'Run settlement test',
    'Merchant training completed',
  ];

  const photoItems = [
    'Storefront',
    'Terminal serial no.',
    'Test receipt',
    'Installed unit',
  ];

  const [checks, setChecks] = useState<boolean[]>(
    checkItems.map(() => task.progress === 100)
  );
  const [photos, setPhotos] = useState<boolean[]>(
    photoItems.map(() => task.progress === 100)
  );
  const [signed, setSigned] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [sigKey, setSigKey] = useState<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2200);
  };

  const toggleCheck = (idx: number) => {
    setChecks((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const togglePhoto = (idx: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      if (!next[idx]) {
        showToast('Photo removed');
      } else {
        showToast('Photo captured');
      }
      return next;
    });
  };

  const clearSignature = () => {
    setSigKey((prev) => prev + 1);
    setSigned(false);
  };

  const checkDone = checks.filter(Boolean).length;
  const photoDone = photos.filter(Boolean).length;
  const canComplete = checkDone === checkItems.length && photoDone === 4 && signed;

  const handleComplete = () => {
    if (canComplete) {
      router.push({
        pathname: '/success' as any,
        params: {
          kind: 'task',
          id: task.id,
          merchant: task.merchant,
          checkDone: `${checkDone}/${checkItems.length}`,
        },
      });
    } else {
      showToast('Finish checklist, photos & signature first');
    }
  };

  const handleSaveDraft = () => {
    showToast('Draft saved offline');
    setTimeout(() => router.back(), 1000);
  };

  const handleReject = () => {
    showToast('Task rejected');
    setTimeout(() => router.back(), 1000);
  };

  return (
    <ScreenLayout>
      {/* Header Bar */}
      <View className="flex-row items-center gap-[12px] px-[16px] py-[10px]">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="w-[38px] h-[38px] rounded-[12px] items-center justify-center border"
          style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
          <Icon name="arrowLeft" size={17} color={colors.tx} strokeWidth={2.2} />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-[15.5px] font-extrabold tracking-[-0.2px]" style={{ color: colors.tx }}>
            {task.type}
          </Text>
          <Text className="text-[10.5px] font-bold" style={{ color: colors.tx3 }}>
            {task.id}
          </Text>
        </View>

        <StatusBadge status={task.status} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        {/* Map Preview Card */}
        <Card noPadding className="overflow-hidden">
          <View
            className="h-[110px] items-center justify-center relative"
            style={{
              backgroundColor: 'rgba(63,111,168,.08)',
            }}>
            <View
              className="px-[10px] py-[4px] rounded-[8px] border"
              style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
              <Text className="text-[10px] font-semibold font-mono" style={{ color: colors.tx3 }}>
                google map preview
              </Text>
            </View>

            <View
              className="absolute bottom-[10px] right-[10px] flex-row items-center gap-[5px] px-[11px] py-[6px] rounded-full"
              style={{ backgroundColor: colors.navy }}>
              <Icon name="mapPin" size={11} color="#FFFFFF" strokeWidth={2.4} />
              <Text className="text-white text-[10px] font-extrabold">{task.dist} away</Text>
            </View>
          </View>

          <View className="p-[14px_16px]">
            <Text className="text-[15px] font-extrabold tracking-[-0.2px]" style={{ color: colors.tx }}>
              {task.merchant}
            </Text>
            <Text className="text-[11.5px] font-semibold mt-[3px] leading-[1.45]" style={{ color: colors.tx2 }}>
              {task.addr}
            </Text>

            <View className="flex-row gap-[8px] mt-[12px]">
              <View
                className="flex-1 rounded-[12px] border p-[9px_11px]"
                style={{ backgroundColor: colors.bg, borderColor: colors.bd }}>
                <Text className="text-[9.5px] font-bold" style={{ color: colors.tx3 }}>
                  PIC
                </Text>
                <Text className="text-[12px] font-bold mt-[2px]" style={{ color: colors.tx }}>
                  {task.pic}
                </Text>
              </View>

              <View
                className="flex-1 rounded-[12px] border p-[9px_11px]"
                style={{ backgroundColor: colors.bg, borderColor: colors.bd }}>
                <Text className="text-[9.5px] font-bold" style={{ color: colors.tx3 }}>
                  Phone
                </Text>
                <Text className="text-[12px] font-bold mt-[2px]" style={{ color: colors.pri }}>
                  {task.phone}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Device Information */}
        <Card className="mt-[12px] p-[14px_16px]">
          <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
            Device information
          </Text>
          <View className="flex-row flex-wrap gap-[8px] mt-[11px]">
            {[
              { k: 'TERMINAL', v: task.terminal },
              { k: 'TID', v: task.tid },
              { k: 'MID', v: task.mid },
              { k: 'SERIAL NUMBER', v: task.sn },
            ].map((d, i) => (
              <View
                key={i}
                className="w-[48.5%] rounded-[12px] border p-[9px_11px]"
                style={{ backgroundColor: colors.bg, borderColor: colors.bd }}>
                <Text className="text-[9.5px] font-bold" style={{ color: colors.tx3 }}>
                  {d.k}
                </Text>
                <Text
                  className="text-[11.5px] font-bold mt-[2px] font-mono"
                  style={{ color: colors.tx }}>
                  {d.v}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Timeline */}
        <Card className="mt-[12px] p-[14px_16px]">
          <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
            Timeline
          </Text>
          <View className="mt-[12px]">
            {[
              {
                t: 'Task created',
                time: 'Yesterday · 16:02',
                c: '#22C55E',
                line: '#22C55E',
                tc: colors.tx,
              },
              {
                t: 'Assigned to Andi Prasetyo',
                time: 'Yesterday · 17:20',
                c: '#22C55E',
                line: colors.bd,
                tc: colors.tx,
              },
              {
                t: 'Work in progress',
                time: 'Pending arrival',
                c: colorScheme === 'dark' ? '#6E82A3' : '#B9C4D4',
                line: 'transparent',
                tc: colors.tx3,
              },
            ].map((tl, idx, arr) => (
              <View key={idx} className="flex-row gap-[12px]">
                <View className="items-center">
                  <View
                    className="w-[11px] h-[11px] rounded-full mt-[3px]"
                    style={{ backgroundColor: tl.c }}
                  />
                  {idx < arr.length - 1 && (
                    <View
                      className="w-[2px] flex-1 my-[5px]"
                      style={{ backgroundColor: tl.line }}
                    />
                  )}
                </View>
                <View className="pb-[16px] flex-1">
                  <Text className="text-[12px] font-extrabold" style={{ color: tl.tc }}>
                    {tl.t}
                  </Text>
                  <Text className="text-[10.5px] font-semibold mt-[2px]" style={{ color: colors.tx3 }}>
                    {tl.time}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Checklist */}
        <Card className="mt-[12px] p-[14px_16px]">
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
              Checklist
            </Text>
            <Text className="text-[11px] font-extrabold" style={{ color: colors.pri }}>
              {checkDone}/{checkItems.length}
            </Text>
          </View>

          <View className="gap-[9px] mt-[11px]">
            {checkItems.map((item, i) => {
              const isDone = checks[i];
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.7}
                  onPress={() => toggleCheck(i)}
                  className="flex-row items-center gap-[11px] rounded-[12px] border p-[11px_12px]"
                  style={{
                    backgroundColor: isDone ? 'rgba(34,197,94,.07)' : 'transparent',
                    borderColor: isDone ? 'rgba(34,197,94,.3)' : colors.bd,
                  }}>
                  <View
                    className="w-[21px] h-[21px] rounded-[7px] border-[1.5px] items-center justify-center"
                    style={{
                      borderColor: isDone ? '#22C55E' : colors.bd,
                      backgroundColor: isDone ? '#22C55E' : 'transparent',
                    }}>
                    {isDone && <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3.2} />}
                  </View>
                  <Text
                    className="text-[12px] font-bold flex-1"
                    style={{
                      color: isDone ? colors.tx3 : colors.tx,
                      textDecorationLine: isDone ? 'line-through' : 'none',
                    }}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Required Photos */}
        <Card className="mt-[12px] p-[14px_16px]">
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
              Required photos
            </Text>
            <Text className="text-[11px] font-extrabold" style={{ color: colors.pri }}>
              {photoDone}/4
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-[9px] mt-[11px]">
            {photoItems.map((label, i) => {
              const isDone = photos[i];
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.7}
                  onPress={() => togglePhoto(i)}
                  className="w-[48.5%] h-[92px] rounded-[13px] border-[1.5px] border-dashed items-center justify-center gap-[6px] relative overflow-hidden"
                  style={{
                    backgroundColor: isDone ? 'rgba(34,197,94,.05)' : colors.bg,
                    borderColor: isDone ? 'rgba(34,197,94,.45)' : colors.bd,
                  }}>
                  {isDone ? (
                    <View className="absolute top-[7px] right-[7px] w-[20px] h-[20px] rounded-full bg-[#22C55E] items-center justify-center">
                      <Icon name="check" size={11} color="#FFFFFF" strokeWidth={3.4} />
                    </View>
                  ) : (
                    <Icon name="camera" size={19} color={colors.tx3} />
                  )}
                  <Text className="text-[10.5px] font-bold" style={{ color: colors.tx2 }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Merchant Signature */}
        <Card className="mt-[12px] p-[14px_16px]">
          <View className="flex-row items-center justify-between mb-[10px]">
            <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
              Merchant signature
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

        {/* Notes */}
        <Card className="mt-[12px] p-[14px_16px]">
          <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
            Notes
          </Text>
          <TextInput
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="Add work notes (optional)…"
            placeholderTextColor={colors.tx3}
            className="mt-[10px] w-full h-[70px] border rounded-[12px] p-[10px_12px] text-[12px] font-semibold"
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.bd,
              color: colors.tx,
              textAlignVertical: 'top',
            }}
          />
        </Card>

        {/* Bottom Actions Row */}
        <View className="flex-row gap-[9px] mt-[16px]">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleReject}
            className="w-[48px] h-[50px] rounded-[14px] items-center justify-center border"
            style={{
              backgroundColor: 'rgba(239,68,68,.08)',
              borderColor: 'rgba(239,68,68,.3)',
            }}>
            <Icon name="close" size={17} color="#EF4444" strokeWidth={2.4} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSaveDraft}
            className="flex-1 h-[50px] rounded-[14px] items-center justify-center border"
            style={{ backgroundColor: colors.surf, borderColor: colors.bd }}>
            <Text className="text-[13px] font-extrabold" style={{ color: colors.tx }}>
              Save draft
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleComplete}
            className="flex-[1.4] h-[50px] rounded-[14px] items-center justify-center shadow-md"
            style={{
              backgroundColor: canComplete ? '#22C55E' : colors.pri,
            }}>
            <Text className="text-white text-[13px] font-extrabold">Complete ✓</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Toast */}
      <Toast message={toastMessage} visible={!!toastMessage} />
    </ScreenLayout>
  );
}
