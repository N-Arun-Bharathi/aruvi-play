import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  checkForUpdate,
  installUpdate,
  getCurrentAppVersion,
  AppUpdateInfo,
} from "../services/updateService";
import { useToastStore } from "./toastStore";

const DISMISSED_KEY = "aruvi:dismissed_update_data";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface DismissedData {
  version: string;
  dismissedAt: number;
}

interface UpdateState {
  updateInfo: AppUpdateInfo | null;
  isChecking: boolean;
  showModal: boolean;
  dismissedData: DismissedData | null;
  hasCheckedOnStartup: boolean;

  checkUpdate: (isManual?: boolean) => Promise<void>;
  dismissModal: () => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
  install: () => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateInfo: null,
  isChecking: false,
  showModal: false,
  dismissedData: null,
  hasCheckedOnStartup: false,

  checkUpdate: async (isManual = false) => {
    if (get().isChecking) return;
    set({ isChecking: true });

    try {
      // 1. Read saved dismissal data from storage
      let savedDismissal: DismissedData | null = null;
      const rawDismissed = await AsyncStorage.getItem(DISMISSED_KEY);
      if (rawDismissed) {
        try {
          savedDismissal = JSON.parse(rawDismissed);
        } catch (e) {
          // Backward compatibility for raw version string
          savedDismissal = { version: rawDismissed, dismissedAt: Date.now() };
        }
      }
      set({ dismissedData: savedDismissal });

      // 2. Query DB for latest version
      const info = await checkForUpdate();
      set({ updateInfo: info });

      if (info.hasUpdate) {
        if (isManual) {
          set({ showModal: true });
        } else {
          // 3. 7-Day reminder logic:
          // Check if the user clicked "Later" for this exact version within the last 7 days
          let shouldSuppress = false;
          if (savedDismissal && savedDismissal.version === info.versionName) {
            const timeSinceDismissal = Date.now() - (savedDismissal.dismissedAt || 0);
            if (timeSinceDismissal < SEVEN_DAYS_MS) {
              shouldSuppress = true; // Still within 7 days, keep modal quiet
            }
          }

          if (!shouldSuppress || info.isMandatory) {
            set({ showModal: true });
          }
        }
      } else if (isManual) {
        const { versionName } = getCurrentAppVersion();
        useToastStore.getState().show(`Aruvi Play is up to date (v${versionName})`);
      }
    } catch (e) {
      console.warn("[UpdateStore] checkUpdate error:", e);
      if (isManual) {
        useToastStore.getState().show("Unable to check for updates. Please try again.");
      }
    } finally {
      set({ isChecking: false, hasCheckedOnStartup: true });
    }
  },

  dismissModal: async () => {
    const { updateInfo } = get();
    if (updateInfo?.versionName) {
      const data: DismissedData = {
        version: updateInfo.versionName,
        dismissedAt: Date.now(),
      };
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(data));
      set({ dismissedData: data, showModal: false });
    } else {
      set({ showModal: false });
    }
  },

  openModal: () => {
    set({ showModal: true });
  },

  closeModal: () => {
    set({ showModal: false });
  },

  install: async () => {
    const { updateInfo } = get();
    await installUpdate(updateInfo?.apkUrl);
  },
}));
