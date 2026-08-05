import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import updateService, {
  MobileVersionResponse,
  DownloadProgress,
} from '@/services/update.service';

export interface UpdateModalProps {
  visible: boolean;
  updateInfo: MobileVersionResponse | null;
  onDismiss: () => void;
}

export function UpdateModal({ visible, updateInfo, onDismiss }: UpdateModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!visible || !updateInfo || updateInfo.updateType === 'none') {
    return null;
  }

  const isOta = updateInfo.updateType === 'ota';
  const isApk = updateInfo.updateType === 'apk';
  const isForce = updateInfo.forceUpdate;
  const currentVersion = updateService.getCurrentVersion();
  const targetVersion = updateInfo.latestVersion || updateInfo.version || currentVersion;
  const fileSizeDisplay = updateInfo.fileSize
    ? updateService.formatFileSize(updateInfo.fileSize)
    : '';

  const handleStartUpdate = async () => {
    setIsUpdating(true);
    setErrorMessage(null);
    setProgress(null);

    if (isOta) {
      const res = await updateService.applyOtaUpdate((status) => {
        setStatusText(status);
      });

      if (!res.success) {
        setIsUpdating(false);
        setErrorMessage(res.error || 'Failed to install OTA update.');
      }
    } else if (isApk) {
      const res = await updateService.downloadAndInstallApk(
        updateInfo.downloadUrl || updateInfo.updateUrl,
        (prog) => {
          setProgress(prog);
        },
        (status) => {
          setStatusText(status);
        },
      );

      if (!res.success) {
        setIsUpdating(false);
        setErrorMessage(res.error || 'Failed to download or install the APK.');
      } else {
        setStatusText('Installer launched.');
      }
    }
  };

  const handleExit = () => {
    updateService.exitApp();
  };

  const handleLater = () => {
    if (isForce) return;
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent>
      <View
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: 'rgba(5, 12, 24, 0.78)' }}>
        <View
          className="w-full max-w-[360px] rounded-[24px] p-6 border shadow-2xl"
          style={{
            backgroundColor: colors.surf,
            borderColor: colors.bd,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.35,
            shadowRadius: 28,
            elevation: 10,
          }}>
          {/* Header Icon & Badges */}
          <View className="flex-row items-center justify-between">
            <View
              className="w-[48px] h-[48px] rounded-[16px] items-center justify-center"
              style={{
                backgroundColor: isForce ? 'rgba(239, 68, 68, 0.12)' : 'rgba(63, 111, 168, 0.14)',
                borderWidth: 1,
                borderColor: isForce ? 'rgba(239, 68, 68, 0.25)' : colors.bd,
              }}>
              <Icon
                name={isForce ? 'bell' : 'zap'}
                size={24}
                color={isForce ? '#EF4444' : colors.pri}
                strokeWidth={2.2}
              />
            </View>

            <View className="flex-row items-center gap-1.5">
              {isForce && (
                <View className="px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30">
                  <Text className="text-[10px] font-extrabold text-red-500 tracking-wider">
                    REQUIRED
                  </Text>
                </View>
              )}
              <View
                className="px-2.5 py-1 rounded-full border"
                style={{
                  backgroundColor: 'rgba(63, 111, 168, 0.12)',
                  borderColor: colors.bd,
                }}>
                <Text
                  className="text-[10px] font-extrabold tracking-wider"
                  style={{ color: colors.pri }}>
                  {isOta ? 'OTA PATCH' : 'APK UPDATE'}
                </Text>
              </View>
            </View>
          </View>

          {/* Title & Version Info */}
          <View className="mt-4">
            <Text
              className="text-[20px] font-extrabold tracking-[-0.3px]"
              style={{ color: colors.tx }}>
              {isForce ? 'Mandatory Update' : 'New Update Available'}
            </Text>
            <View className="flex-row items-center gap-2 mt-1">
              <Text className="text-[12.5px] font-medium" style={{ color: colors.tx2 }}>
                Version {targetVersion}
              </Text>
              {fileSizeDisplay ? (
                <>
                  <Text className="text-[12px]" style={{ color: colors.tx3 }}>
                    •
                  </Text>
                  <Text className="text-[12px] font-semibold" style={{ color: colors.tx3 }}>
                    {fileSizeDisplay}
                  </Text>
                </>
              ) : null}
            </View>
          </View>

          {/* Release Notes Section */}
          <View className="mt-4">
            <Text
              className="text-[11.5px] font-bold uppercase tracking-wider mb-2"
              style={{ color: colors.tx3 }}>
              What's New
            </Text>
            <View
              className="max-h-[140px] rounded-[14px] p-3.5 border"
              style={{
                backgroundColor: colorScheme === 'dark' ? 'rgba(8, 18, 38, 0.6)' : '#F0F3F7',
                borderColor: colors.bd,
              }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text
                  className="text-[12.5px] leading-[18px] font-normal"
                  style={{ color: colors.tx2 }}>
                  {updateInfo.releaseNotes || 'Bug fixes and performance improvements.'}
                </Text>
              </ScrollView>
            </View>
          </View>

          {/* Progress or Status Information */}
          {isUpdating && (
            <View className="mt-4 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-[11.5px] font-semibold" style={{ color: colors.tx2 }}>
                  {statusText || (isApk ? 'Downloading APK...' : 'Applying OTA update...')}
                </Text>
                {progress && (
                  <Text className="text-[11.5px] font-bold" style={{ color: colors.pri }}>
                    {progress.percent}%
                  </Text>
                )}
              </View>

              {/* Progress Bar */}
              <View
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: colors.track }}>
                <View
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: colors.pri,
                    width: progress ? `${progress.percent}%` : '40%',
                  }}
                />
              </View>

              {progress && progress.totalBytes > 0 && (
                <Text className="text-[10.5px] font-medium text-right" style={{ color: colors.tx3 }}>
                  {updateService.formatFileSize(progress.downloadedBytes)} /{' '}
                  {updateService.formatFileSize(progress.totalBytes)}
                </Text>
              )}
            </View>
          )}

          {/* Error Message */}
          {errorMessage && (
            <View className="mt-3.5 p-3 rounded-[12px] bg-red-500/10 border border-red-500/25 flex-row items-center gap-2">
              <Icon name="info" size={16} color="#EF4444" />
              <Text className="text-[11.5px] font-medium text-red-500 flex-1">
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View className="mt-5 gap-2.5">
            {!isUpdating ? (
              <>
                <Button
                  title={isOta ? 'Update Now' : 'Update'}
                  onPress={handleStartUpdate}
                />

                {isForce ? (
                  <Button
                    title="Exit App"
                    variant="danger"
                    onPress={handleExit}
                  />
                ) : (
                  <Button
                    title="Later"
                    variant="secondary"
                    onPress={handleLater}
                  />
                )}
              </>
            ) : (
              <View className="items-center py-2 flex-row justify-center gap-2">
                <ActivityIndicator size="small" color={colors.pri} />
                <Text className="text-[12px] font-medium" style={{ color: colors.tx2 }}>
                  Please wait...
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
export default UpdateModal;
