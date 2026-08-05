import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as Cellular from 'expo-cellular';
import { apiClient } from './api-client';
import { API_ENDPOINTS } from '../config/api';

export interface DeviceInfo {
  deviceId: string | null;
  platform: string;
  brand: string | null;
  manufacturer: string | null;
  model: string | null;
  androidVersion: string | null;
  sdkVersion: string | null;
  appVersion: string | null;
  buildNumber: string | null;
  carrier: string | null;
  networkType: string | null;
  isRooted: boolean;
  isDeveloperMode: boolean;
  isEmulator: boolean;
  fcmToken?: string | null;
}

class DeviceService {
  private cachedDeviceInfo: DeviceInfo | null = null;

  /**
   * Collects device information. Caches after the first collection.
   */
  public async getDeviceInfo(): Promise<DeviceInfo> {
    if (this.cachedDeviceInfo) {
      return this.cachedDeviceInfo;
    }

    let deviceId = null;
    let androidVersion = null;
    let sdkVersion = null;

    if (Platform.OS === 'android') {
      try {
        deviceId = Application.getAndroidId();
      } catch (e) {
        console.warn('Failed to get Android ID:', e);
      }
      androidVersion = Device.osVersion;
      sdkVersion = Device.platformApiLevel ? String(Device.platformApiLevel) : null;
    }

    let networkType = null;
    try {
      const netState = await Network.getNetworkStateAsync();
      networkType = netState.type?.toString() || null;
    } catch (e) {
      console.warn('Failed to get network state:', e);
    }

    let isRooted = false;
    try {
      isRooted = await Device.isRootedExperimentalAsync();
    } catch {
      // Ignore
    }

    let carrier = null;
    try {
      carrier = await Cellular.getCarrierNameAsync();
    } catch {
      // Ignore
    }

    const info: DeviceInfo = {
      deviceId,
      platform: Platform.OS,
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      model: Device.modelName,
      androidVersion,
      sdkVersion,
      appVersion: Application.nativeApplicationVersion,
      buildNumber: Application.nativeBuildVersion,
      carrier,
      networkType,
      isRooted,
      isDeveloperMode: false, // Not supported by Expo directly
      isEmulator: !Device.isDevice,
      fcmToken: null, // To be implemented when push notifications are added
    };

    this.cachedDeviceInfo = info;
    return info;
  }

  /**
   * Register the device with the backend
   * Should be called after successful login.
   * If it fails, it logs a warning but does not throw, to avoid blocking login.
   */
  public async registerDevice(): Promise<void> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      
      // Post to device register endpoint
      await apiClient.post(API_ENDPOINTS.DEVICE_REGISTER, deviceInfo);
      console.log('Device registered successfully');
    } catch (error) {
      console.warn('Failed to register device:', error);
    }
  }

  /**
   * Logout the device from the backend
   * Should be called before logging out.
   * If it fails, it logs a warning but does not throw, to avoid blocking logout.
   */
  public async logoutDevice(): Promise<void> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      
      await apiClient.post(API_ENDPOINTS.DEVICE_LOGOUT, {
        deviceId: deviceInfo.deviceId,
      });
      console.log('Device logged out successfully');
    } catch (error) {
      console.warn('Failed to logout device:', error);
    }
  }
}

export const deviceService = new DeviceService();
export default deviceService;
