"use client";

import { useState } from "react";

import { CheckCircle, Plus, X } from "lucide-react";

export default function SettingsPage() {
  const [clinicName, setClinicName] = useState(
    process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic"
  );
  const [avgVisitValue, setAvgVisitValue] = useState(
    Number(process.env.NEXT_PUBLIC_AVG_VISIT_VALUE ?? 250)
  );
  const [emailSender, setEmailSender] = useState("no-reply@democliniic.com");
  const [insurance, setInsurance] = useState<string[]>([
    "Aetna", "BlueCross BlueShield", "Cigna", "Humana", "Kaiser", "Medicare", "Medicaid", "UnitedHealthcare",
  ]);
  const [newIns, setNewIns] = useState("");
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configure your clinic preferences</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm divide-y">
        {/* Clinic name */}
        <Section title="Clinic Name" desc="Appears in emails and dashboard header">
          <input
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Section>

        {/* Average visit value */}
        <Section title="Average Visit Value" desc="Used to calculate revenue at risk in briefings">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              value={avgVisitValue}
              onChange={(e) => setAvgVisitValue(Number(e.target.value))}
              className="w-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">per visit</span>
          </div>
        </Section>

        {/* Email sender */}
        <Section title="Email Sender Address" desc="Used as the From address for Resend emails">
          <input
            type="email"
            value={emailSender}
            onChange={(e) => setEmailSender(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Must be a verified sender in your Resend account
          </p>
        </Section>

        {/* Insurance list */}
        <Section title="Accepted Insurance Providers" desc="Used for pre-verification checks on upload">
          <div className="flex flex-wrap gap-2 mb-3">
            {insurance.map((ins) => (
              <span
                key={ins}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 text-green-800 text-sm rounded-full"
              >
                {ins}
                <button
                  onClick={() => setInsurance((prev) => prev.filter((i) => i !== ins))}
                  className="text-green-500 hover:text-green-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newIns}
              onChange={(e) => setNewIns(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newIns.trim()) {
                  setInsurance((prev) => [...prev, newIns.trim()]);
                  setNewIns("");
                }
              }}
              placeholder="Add insurance provider..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                if (newIns.trim()) {
                  setInsurance((prev) => [...prev, newIns.trim()]);
                  setNewIns("");
                }
              }}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 border rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </Section>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors"
        >
          Save Settings
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" /> Settings saved
          </span>
        )}
      </div>

      {/* Env notice */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-medium">Environment Variables</p>
        <p className="mt-1 text-amber-700">
          Runtime config (RESEND_API_KEY, BACKEND_ENGINE_URL, etc.) is set in{" "}
          <code className="bg-amber-100 px-1 rounded font-mono text-xs">.env.local</code>. Settings
          here are for demo purposes only — persistence requires a database.
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-5">
      <div className="mb-3">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  );
}
