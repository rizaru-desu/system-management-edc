import { BackHandler, Linking, PermissionsAndroid, Platform } from 'react-native';

export interface PermissionStatusResult {
  camera: boolean;
  location: boolean;
  allGranted: boolean;
  isPermanentlyDenied: boolean;
}

class PermissionService {
  /**
   * Check whether Camera and Location permissions are already granted on Android.
   * On non-Android platforms, returns allGranted: true.
   */
  public async checkPermissions(): Promise<PermissionStatusResult> {
    if (Platform.OS !== 'android') {
      return {
        camera: true,
        location: true,
        allGranted: true,
        isPermanentlyDenied: false,
      };
    }

    try {
      const camera = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      const fineLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      const coarseLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      );
      const location = fineLocation || coarseLocation;

      return {
        camera,
        location,
        allGranted: camera && location,
        isPermanentlyDenied: false,
      };
    } catch (error) {
      console.warn('[PermissionService] Failed to check permissions:', error);
      return {
        camera: false,
        location: false,
        allGranted: false,
        isPermanentlyDenied: false,
      };
    }
  }

  /**
   * Request Camera and Location runtime permissions on Android.
   * Accurately detects whether any permission was permanently denied (never ask again).
   */
  public async requestPermissions(): Promise<PermissionStatusResult> {
    if (Platform.OS !== 'android') {
      return {
        camera: true,
        location: true,
        allGranted: true,
        isPermanentlyDenied: false,
      };
    }

    try {
      const statuses = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      const cameraStatus = statuses[PermissionsAndroid.PERMISSIONS.CAMERA];
      const fineStatus = statuses[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const coarseStatus = statuses[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

      const camera = cameraStatus === PermissionsAndroid.RESULTS.GRANTED;
      const location =
        fineStatus === PermissionsAndroid.RESULTS.GRANTED ||
        coarseStatus === PermissionsAndroid.RESULTS.GRANTED;

      const isPermanentlyDenied =
        cameraStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
        (fineStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN &&
          coarseStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);

      return {
        camera,
        location,
        allGranted: camera && location,
        isPermanentlyDenied,
      };
    } catch (error) {
      console.warn('[PermissionService] Failed to request permissions:', error);
      return {
        camera: false,
        location: false,
        allGranted: false,
        isPermanentlyDenied: false,
      };
    }
  }

  /**
   * Open Android app system settings to allow manual permission grants.
   */
  public async openSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn('[PermissionService] Failed to open app settings:', error);
    }
  }

  /**
   * Exit the Android application when permissions are refused.
   */
  public exitApp(): void {
    BackHandler.exitApp();
  }
}

export const permissionService = new PermissionService();
export default permissionService;
