/**
 * usePlugins hook — discovers and loads dashboard plugins.
 *
 * 1. Fetches plugin manifests from GET /api/dashboard/plugins
 * 2. Injects CSS <link> tags for plugins that declare css
 * 3. Loads plugin JS bundles via <script> tags
 * 4. Waits for plugins to call register() and resolves them
 */

import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api, HERMES_BASE_PATH } from "@/lib/api";
import type { PluginManifest, RegisteredPlugin } from "./types";
import {
  getPluginComponent,
  onPluginRegistered,
  notifyPluginRegistry,
  setPluginLoadError,
  beginPluginGeneration,
} from "./registry";

export function dashboardPluginProfile(search: string): string {
  return new URLSearchParams(search).get("profile") ?? "";
}

export function isCurrentPluginBatch(
  selectedProfile: string,
  activeGeneration: number,
  manifestProfile: string | null,
  manifestGeneration: number | null,
): manifestGeneration is number {
  return (
    manifestProfile === selectedProfile &&
    manifestGeneration !== null &&
    manifestGeneration === activeGeneration
  );
}

export function visiblePluginState(
  selectedProfile: string,
  activeGeneration: number,
  manifestProfile: string | null,
  manifestGeneration: number | null,
  plugins: RegisteredPlugin[],
  manifests: PluginManifest[],
  loading: boolean,
): {
  plugins: RegisteredPlugin[];
  manifests: PluginManifest[];
  loading: boolean;
} {
  if (
    !isCurrentPluginBatch(
      selectedProfile,
      activeGeneration,
      manifestProfile,
      manifestGeneration,
    )
  ) {
    return { plugins: [], manifests: [], loading: true };
  }
  return { plugins, manifests, loading };
}

export function usePlugins() {
  const { search } = useLocation();
  const selectedProfile = dashboardPluginProfile(search);
  const [manifests, setManifests] = useState<PluginManifest[]>([]);
  const [manifestProfile, setManifestProfile] = useState<string | null>(null);
  const [manifestGeneration, setManifestGeneration] = useState<number | null>(null);
  const [plugins, setPlugins] = useState<RegisteredPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedScripts = useRef<Set<string>>(new Set());
  const generationRef = useRef(0);

  // Fail closed on every profile change before fetching the next manifest set.
  useEffect(() => {
    let cancelled = false;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    beginPluginGeneration(generation);
    setLoading(true);
    setPlugins([]);
    setManifests([]);
    setManifestProfile(null);
    setManifestGeneration(null);
    loadedScripts.current.clear();
    if (typeof document !== "undefined") {
      document
        .querySelectorAll('[data-hermes-profile-plugin="true"]')
        .forEach((element) => element.remove());
    }

    api
      .getPlugins(selectedProfile)
      .then((list) => {
        if (cancelled || generation !== generationRef.current) return;
        setManifests(list);
        setManifestGeneration(generation);
        setManifestProfile(selectedProfile);
        if (list.length === 0) setLoading(false);
      })
      .catch(() => {
        if (cancelled || generation !== generationRef.current) return;
        setManifestProfile(null);
        setManifestGeneration(null);
        setManifests([]);
        setPlugins([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProfile]);

  // Load plugin assets when manifests arrive.
  useEffect(() => {
    if (
      manifests.length === 0 ||
      !isCurrentPluginBatch(
        selectedProfile,
        generationRef.current,
        manifestProfile,
        manifestGeneration,
      )
    ) {
      return;
    }
    const generation = manifestGeneration;

    const injectedScripts: HTMLScriptElement[] = [];
    const injectedStyles: HTMLLinkElement[] = [];
    const profileQuery = selectedProfile
      ? `?profile=${encodeURIComponent(selectedProfile)}`
      : "";

    for (const manifest of manifests) {
      // Inject CSS if specified.
      if (manifest.css) {
        const cssUrl = `${HERMES_BASE_PATH}/dashboard-plugins/${manifest.name}/${manifest.css}${profileQuery}`;
        if (!document.querySelector(`link[href="${cssUrl}"]`)) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = cssUrl;
          link.setAttribute("data-hermes-profile-plugin", "true");
          document.head.appendChild(link);
          injectedStyles.push(link);
        }
      }

      // Load JS bundle. In dev, cache-bust so Vite HMR can clear the
      // in-memory registry while the browser would otherwise never
      // re-execute a previously cached <script> URL.
      const baseUrl = `${HERMES_BASE_PATH}/dashboard-plugins/${manifest.name}/${manifest.entry}${profileQuery}`;
      const scriptSrc = import.meta.env.DEV
        ? `${baseUrl}${profileQuery ? "&" : "?"}hermes_dv=${Date.now()}`
        : baseUrl;
      if (!import.meta.env.DEV) {
        if (loadedScripts.current.has(baseUrl)) continue;
        loadedScripts.current.add(baseUrl);
      }

      const script = document.createElement("script");
      script.setAttribute("data-hermes-plugin", manifest.name);
      script.setAttribute("data-hermes-profile-plugin", "true");
      script.setAttribute("data-hermes-plugin-generation", String(generation));
      script.src = scriptSrc;
      script.async = true;
      // SRI integrity verification — defense against compromised plugin
      // delivery. Plugin manifests can declare an integrity hash
      // (e.g. "sha384-...") which the browser verifies before executing.
      // Without this, a man-in-the-middle or compromised plugin server
      // can substitute the JS bundle silently. Opt-in: when no integrity
      // is declared in the manifest, behavior is unchanged.
      if (manifest.integrity && typeof manifest.integrity === "string") {
        script.integrity = manifest.integrity;
        script.crossOrigin = "anonymous";
      }
      script.onerror = () => {
        if (generation !== generationRef.current) return;
        setPluginLoadError(manifest.name, "LOAD_FAILED");
        console.warn(
          `[plugins] Failed to load ${manifest.name} from ${scriptSrc} (open Network tab)`,
        );
      };
      script.onload = () => {
        if (generation !== generationRef.current) return;
        notifyPluginRegistry();
        queueMicrotask(() => {
          if (generation !== generationRef.current) return;
          if (getPluginComponent(manifest.name)) return;
          setPluginLoadError(manifest.name, "NO_REGISTER");
        });
      };
      document.body.appendChild(script);
      injectedScripts.push(script);
    }

    // Give plugins a moment to load and register, then stop loading state.
    const timeout = setTimeout(() => {
      if (generation === generationRef.current) setLoading(false);
    }, 2000);
    return () => {
      clearTimeout(timeout);
      for (const el of injectedScripts) el.remove();
      for (const el of injectedStyles) el.remove();
    };
  }, [manifests, manifestProfile, manifestGeneration, selectedProfile]);

  // Listen for plugin registrations and resolve them against manifests.
  useEffect(() => {
    if (
      !isCurrentPluginBatch(
        selectedProfile,
        generationRef.current,
        manifestProfile,
        manifestGeneration,
      )
    ) {
      setPlugins([]);
      return;
    }
    const generation = manifestGeneration;

    function resolvePlugins() {
      if (generation !== generationRef.current) return;
      const resolved: RegisteredPlugin[] = [];
      for (const manifest of manifests) {
        const component = getPluginComponent(manifest.name);
        if (component) {
          resolved.push({ manifest, component });
        }
      }
      setPlugins(resolved);
      // If all plugins registered, stop loading early.
      if (resolved.length === manifests.length && manifests.length > 0) {
        setLoading(false);
      }
    }

    resolvePlugins();
    const unsub = onPluginRegistered(resolvePlugins);
    return unsub;
  }, [manifests, manifestProfile, manifestGeneration, selectedProfile]);

  return visiblePluginState(
    selectedProfile,
    generationRef.current,
    manifestProfile,
    manifestGeneration,
    plugins,
    manifests,
    loading,
  );
}
