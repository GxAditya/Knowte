import { useEffect, useState } from "react";
import { useSettingsStore } from "../../stores";
import ModelSelector from "./ModelSelector";
import PersonalizationConfig from "./PersonalizationConfig";
import type { Settings } from "../../lib/types";

export default function SettingsPanel() {
  const { settings, isLoading, isSaving, loadSettings, saveSettings, checkOllama } =
    useSettingsStore();
  const [formData, setFormData] = useState<Settings | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    const success = await saveSettings(formData);
    if (success) {
      setToast("Settings saved successfully");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const updateField = <K extends keyof Settings>(field: K, value: Settings[K]) => {
    if (!formData) return;
    setFormData({ ...formData, [field]: value });

    if (field === "ollama_url") {
      checkOllama(value as string);
    }
  };

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 bg-slate-800 rounded-lg border border-slate-700 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Ollama Connection</h2>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Ollama URL
            </label>
            <input
              type="text"
              value={formData.ollama_url}
              onChange={(e) => updateField("ollama_url", e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://localhost:11434"
            />
          </div>
          <ModelSelector
            ollamaUrl={formData.ollama_url}
            llmModel={formData.llm_model}
            whisperModel={formData.whisper_model}
            onLlmModelChange={(value) => updateField("llm_model", value)}
            onWhisperModelChange={(value) => updateField("whisper_model", value)}
          />
        </div>

        <div className="p-6 bg-slate-800 rounded-lg border border-slate-700 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Personalization</h2>
          <PersonalizationConfig
            value={formData.personalization_level}
            onChange={(value) => updateField("personalization_level", value)}
          />
        </div>

        <div className="p-6 bg-slate-800 rounded-lg border border-slate-700 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Export Settings</h2>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Export Path
            </label>
            <input
              type="text"
              value={formData.export_path}
              onChange={(e) => updateField("export_path", e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="~/Documents/Cognote"
            />
            <p className="text-xs text-slate-400">
              Default location for exported files
            </p>
          </div>
        </div>

        <div className="p-6 bg-slate-800 rounded-lg border border-slate-700 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Research</h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={formData.enable_research}
                onChange={(e) => updateField("enable_research", e.target.checked)}
                className="sr-only"
              />
              <div
                onClick={() => updateField("enable_research", !formData.enable_research)}
                className={`w-10 h-5 rounded-full transition-colors ${
                  formData.enable_research ? "bg-blue-600" : "bg-slate-600"
                } flex items-center px-0.5 cursor-pointer`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                    formData.enable_research ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                Enable research paper search (requires internet)
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                When enabled, Cognote queries the Semantic Scholar API to find papers
                related to your lecture content. This is the only external network call
                the app makes.
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      {toast && (
        <div className="fixed bottom-4 right-4 px-4 py-2 bg-green-600 text-white rounded-md shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
