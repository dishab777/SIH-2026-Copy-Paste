import { create } from 'zustand';
import type { ScenarioId } from '@/mocks/scenarios';

/**
 * True client state only. Everything the server owns lives in TanStack Query.
 * Nothing here is persisted — PRAYOG uses no browser storage API.
 */
interface UiState {
  locale: 'en' | 'hi';
  sidebarOpen: boolean;
  dockOpen: boolean;
  paletteOpen: boolean;
  activeCaseId: string | null;
  scenario: ScenarioId;
  toasts: { id: number; tone: 'verify' | 'hold' | 'seal'; message: string; detail?: string }[];
  setLocale: (locale: 'en' | 'hi') => void;
  toggleSidebar: () => void;
  setDockOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  setActiveCase: (caseId: string | null) => void;
  setScenario: (id: ScenarioId) => void;
  pushToast: (tone: 'verify' | 'hold' | 'seal', message: string, detail?: string) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUi = create<UiState>((set) => ({
  locale: 'en',
  sidebarOpen: true,
  dockOpen: true,
  paletteOpen: false,
  activeCaseId: null,
  scenario: 'normal',
  toasts: [],
  setLocale: (locale) => set({ locale }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setDockOpen: (dockOpen) => set({ dockOpen }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setActiveCase: (activeCaseId) => set({ activeCaseId }),
  setScenario: (scenario) => set({ scenario }),
  pushToast: (tone, message, detail) => {
    toastId += 1;
    const id = toastId;
    set((s) => ({
      toasts: [
        // A confirmation means the person got past whatever was blocking them.
        // Leaving the failure standing beside it says two contradictory things.
        ...(tone === 'verify' ? s.toasts.filter((t) => t.tone !== 'seal') : s.toasts),
        { id, tone, message, detail },
      ],
    }));
    // A confirmation can time out; a failure cannot. Something that did not
    // save has to stay on screen until the person has seen it.
    if (tone !== 'seal') {
      window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 7000);
    }
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
