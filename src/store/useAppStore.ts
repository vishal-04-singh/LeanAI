import { create } from "zustand";

import { api, toAppError } from "../ipc/client";
import type {
  AppError,
  BuildBundleResponse,
  BundleOptions,
  ContextResponse,
  GitState,
  Inventory,
  PolicyDescription,
  ProjectRecord,
  ScanProgress,
  SelectionSpec,
  Settings,
} from "../ipc/types";

export type Route = "workspace" | "select" | "preview" | "context" | "settings";

export interface SelectionState {
  files: Set<string>;
  directories: Set<string>;
  overrides: Set<string>;
  excluded: Set<string>;
}

const emptySelection = (): SelectionState => ({
  files: new Set(),
  directories: new Set(),
  overrides: new Set(),
  excluded: new Set(),
});

export function toSpec(selection: SelectionState): SelectionSpec {
  return {
    files: [...selection.files].sort(),
    directories: [...selection.directories].sort(),
    excluded: [...selection.excluded].sort(),
    overrides: [...selection.overrides].sort(),
  };
}

interface AppStore {
  route: Route;
  project: ProjectRecord | null;
  git: GitState | null;
  hasAiIgnore: boolean;
  inventory: Inventory | null;
  classCounts: Record<string, number>;
  scanning: boolean;
  scanProgress: ScanProgress | null;
  selection: SelectionState;
  options: BundleOptions;
  bundle: BuildBundleResponse | null;
  building: boolean;
  context: ContextResponse | null;
  settings: Settings | null;
  policy: PolicyDescription | null;
  error: AppError | null;
  notice: string | null;

  setRoute: (route: Route) => void;
  setError: (error: AppError | null) => void;
  setNotice: (notice: string | null) => void;
  setScanProgress: (progress: ScanProgress | null) => void;

  bootstrap: () => Promise<void>;
  openProject: (path: string) => Promise<void>;
  closeProject: () => Promise<void>;
  scan: () => Promise<void>;
  cancelScan: () => Promise<void>;

  toggleFile: (path: string, selected: boolean) => void;
  toggleDirectory: (directory: string, selected: boolean, paths: string[]) => void;
  addOverride: (path: string) => void;
  selectPaths: (paths: string[], replace: boolean) => void;
  clearSelection: () => void;

  setOptions: (options: Partial<BundleOptions>) => void;
  buildBundle: () => Promise<void>;

  loadContext: () => Promise<void>;
  generateContext: () => Promise<void>;

  saveSettings: (settings: Settings) => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  route: "workspace",
  project: null,
  git: null,
  hasAiIgnore: false,
  inventory: null,
  classCounts: {},
  scanning: false,
  scanProgress: null,
  selection: emptySelection(),
  options: {
    headers: true,
    lineNumbers: false,
    codeFences: false,
    fileSizeAnnotations: false,
    includeTree: true,
    includeFrontMatter: false,
    normalizeLineEndings: true,
    maxFileBytes: null,
  },
  bundle: null,
  building: false,
  context: null,
  settings: null,
  policy: null,
  error: null,
  notice: null,

  setRoute: (route) => set({ route }),
  setError: (error) => set({ error }),
  setNotice: (notice) => set({ notice }),
  setScanProgress: (scanProgress) => set({ scanProgress }),

  bootstrap: async () => {
    try {
      const [settings, policy] = await Promise.all([api.getSettings(), api.describePolicy()]);
      set({ settings, policy, options: settings.defaultBundleOptions });
    } catch (error) {
      set({ error: toAppError(error) });
    }
  },

  openProject: async (path) => {
    try {
      const response = await api.openProject(path);
      set({
        project: response.project,
        git: response.git,
        hasAiIgnore: response.hasAiIgnore,
        inventory: null,
        bundle: null,
        context: null,
        selection: emptySelection(),
        error: null,
      });
      await get().scan();
      await get().loadContext();
    } catch (error) {
      set({ error: toAppError(error) });
    }
  },

  closeProject: async () => {
    await api.closeProject().catch(() => undefined);
    set({
      project: null,
      git: null,
      inventory: null,
      bundle: null,
      context: null,
      selection: emptySelection(),
      route: "workspace",
    });
  },

  scan: async () => {
    set({ scanning: true, error: null, scanProgress: null });
    try {
      const response = await api.scanProject();
      set({
        inventory: response.inventory,
        classCounts: response.classCounts,
        scanning: false,
        route: "select",
      });
      // A rescan can invalidate a stored selection; drop paths that vanished.
      const known = new Set(response.inventory.files.map((file) => file.path));
      const selection = get().selection;
      set({
        selection: {
          files: new Set([...selection.files].filter((path) => known.has(path))),
          directories: selection.directories,
          overrides: new Set([...selection.overrides].filter((path) => known.has(path))),
          excluded: new Set([...selection.excluded].filter((path) => known.has(path))),
        },
      });
    } catch (error) {
      const appError = toAppError(error);
      set({
        scanning: false,
        error: appError.code === "cancelled" ? null : appError,
        notice: appError.code === "cancelled" ? "Scan cancelled." : null,
      });
    }
  },

  cancelScan: async () => {
    await api.cancelScan().catch(() => undefined);
  },

  toggleFile: (path, selected) =>
    set((state) => {
      const files = new Set(state.selection.files);
      const excluded = new Set(state.selection.excluded);
      if (selected) {
        files.add(path);
        excluded.delete(path);
      } else {
        files.delete(path);
        // Remember the removal so a selected parent directory does not put it
        // straight back.
        if (state.selection.directories.size > 0) excluded.add(path);
      }
      return { selection: { ...state.selection, files, excluded }, bundle: null };
    }),

  toggleDirectory: (directory, selected, paths) =>
    set((state) => {
      const directories = new Set(state.selection.directories);
      const files = new Set(state.selection.files);
      const excluded = new Set(state.selection.excluded);
      if (selected) {
        directories.add(directory);
        for (const path of paths) {
          files.add(path);
          excluded.delete(path);
        }
      } else {
        directories.delete(directory);
        for (const path of paths) files.delete(path);
      }
      return { selection: { ...state.selection, directories, files, excluded }, bundle: null };
    }),

  addOverride: (path) =>
    set((state) => {
      const overrides = new Set(state.selection.overrides);
      const files = new Set(state.selection.files);
      overrides.add(path);
      files.add(path);
      return { selection: { ...state.selection, overrides, files }, bundle: null };
    }),

  selectPaths: (paths, replace) =>
    set((state) => {
      const files = replace ? new Set<string>() : new Set(state.selection.files);
      for (const path of paths) files.add(path);
      return { selection: { ...state.selection, files }, bundle: null };
    }),

  clearSelection: () => set({ selection: emptySelection(), bundle: null }),

  setOptions: (partial) =>
    set((state) => ({ options: { ...state.options, ...partial }, bundle: null })),

  buildBundle: async () => {
    const { selection, options } = get();
    if (selection.files.size === 0 && selection.directories.size === 0) {
      set({ bundle: null });
      return;
    }
    set({ building: true });
    try {
      const bundle = await api.buildBundle(toSpec(selection), options);
      set({ bundle, building: false, error: null });
    } catch (error) {
      set({ building: false, bundle: null, error: toAppError(error) });
    }
  },

  loadContext: async () => {
    try {
      const context = await api.loadContext();
      set({ context });
    } catch (error) {
      set({ error: toAppError(error) });
    }
  },

  generateContext: async () => {
    try {
      const context = await api.generateContext();
      set({ context, notice: "Context index generated.", error: null });
    } catch (error) {
      set({ error: toAppError(error) });
    }
  },

  saveSettings: async (settings) => {
    try {
      const saved = await api.updateSettings(settings);
      set({ settings: saved, notice: "Settings saved." });
    } catch (error) {
      set({ error: toAppError(error) });
    }
  },
}));
