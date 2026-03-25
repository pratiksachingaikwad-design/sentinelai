import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Camera, FileText, Search, Shield } from "lucide-react";
import type { Page } from "../App";
import { ThreatLevel } from "../backend";
import { useActor } from "../hooks/useActor";
import { mockCriminals, mockDetectionLogs } from "../lib/mockData";
import {
  detectionTypeColor,
  detectionTypeLabel,
  threatColor,
  threatLabel,
} from "../lib/threatUtils";

interface Props {
  navigate: (p: Page) => void;
}

export default function DashboardPage({ navigate }: Props) {
  const { actor } = useActor();

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => actor!.getSystemStats(),
    enabled: !!actor,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const result = await actor!.getAllDetectionLogs();
      return result.length > 0 ? result : mockDetectionLogs;
    },
    enabled: !!actor,
  });

  const { data: criminals = [] } = useQuery({
    queryKey: ["criminals"],
    queryFn: async () => {
      const result = await actor!.getAllCriminalProfiles();
      return result.length > 0 ? result : mockCriminals;
    },
    enabled: !!actor,
  });

  const activeAlerts = logs.filter(
    (l) =>
      l.threatLevel === ThreatLevel.critical ||
      l.threatLevel === ThreatLevel.high,
  );
  const recentLogs = [...logs]
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    .slice(0, 8);

  const statCards = [
    {
      label: "TOTAL CRIMINALS",
      value: stats ? Number(stats.totalCriminals) : criminals.length,
      icon: AlertTriangle,
      color: "text-[oklch(0.6_0.28_15)]",
    },
    {
      label: "ACTIVE ALERTS",
      value: stats ? Number(stats.activeAlerts) : activeAlerts.length,
      icon: Shield,
      color: "text-[oklch(0.65_0.25_35)]",
    },
    {
      label: "DETECTIONS TODAY",
      value: stats ? Number(stats.detectionsToday) : logs.length,
      icon: Camera,
      color: "text-[oklch(0.75_0.18_200)]",
    },
    {
      label: "MISSING PERSONS",
      value: stats ? Number(stats.missingPersonsCount) : 3,
      icon: Search,
      color: "text-[oklch(0.65_0.2_200)]",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-[oklch(0.85_0.01_220)] tracking-widest">
            COMMAND CENTER
          </h1>
          <p className="text-xs font-mono text-[oklch(0.45_0.02_220)] mt-1">
            {new Date().toLocaleString()} &bull; ALL SYSTEMS NOMINAL
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[oklch(0.65_0.18_145)]">
          <div className="w-2 h-2 rounded-full bg-[oklch(0.65_0.18_145)] animate-pulse" />
          LIVE
        </div>
      </div>

      {activeAlerts.length > 0 && (
        <div
          data-ocid="dashboard.alert.panel"
          className="border border-[oklch(0.6_0.28_15)] bg-[oklch(0.5_0.28_15_/_0.1)] rounded p-3 flex items-center gap-3 animate-pulse-alert"
        >
          <AlertTriangle className="w-5 h-5 text-[oklch(0.6_0.28_15)] flex-shrink-0" />
          <span className="text-sm font-mono text-[oklch(0.7_0.25_25)]">
            {activeAlerts.length} ACTIVE HIGH-THREAT DETECTION
            {activeAlerts.length > 1 ? "S" : ""} &mdash; IMMEDIATE ATTENTION
            REQUIRED
          </span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4" data-ocid="dashboard.stats.panel">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="border border-[oklch(0.22_0.03_240)] bg-[oklch(0.13_0.025_240)] rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div className={`text-2xl font-bold font-mono ${s.color}`}>
                {s.value}
              </div>
            </div>
            <div className="text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          {
            page: "surveillance" as Page,
            icon: Camera,
            label: "Live Surveillance",
            desc: "Real-time camera monitoring",
          },
          {
            page: "criminals" as Page,
            icon: AlertTriangle,
            label: "Criminal Database",
            desc: `${criminals.length} profiles on record`,
          },
          {
            page: "logs" as Page,
            icon: FileText,
            label: "Detection Logs",
            desc: `${logs.length} total detections`,
          },
        ].map(({ page, icon: Icon, label, desc }) => (
          <button
            type="button"
            key={page}
            onClick={() => navigate(page)}
            data-ocid={`dashboard.${page}.link`}
            className="border border-[oklch(0.22_0.03_240)] bg-[oklch(0.13_0.025_240)] rounded-lg p-4 hover:border-[oklch(0.75_0.18_200_/_0.4)] hover:bg-[oklch(0.15_0.025_240)] transition-all text-left"
          >
            <Icon className="w-6 h-6 text-[oklch(0.75_0.18_200)] mb-2" />
            <div className="font-mono text-sm text-[oklch(0.75_0.18_200)] font-semibold">
              {label}
            </div>
            <div className="text-xs text-[oklch(0.45_0.02_220)] mt-1">
              {desc}
            </div>
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-mono text-[oklch(0.75_0.18_200)] tracking-widest mb-3">
          RECENT DETECTIONS
        </h2>
        <div className="border border-[oklch(0.22_0.03_240)] rounded-lg overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[oklch(0.15_0.025_240)]">
              <tr>
                {[
                  "TIMESTAMP",
                  "SUBJECT",
                  "TYPE",
                  "MATCH",
                  "THREAT",
                  "ACTIVITY",
                  "LOCATION",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-[oklch(0.45_0.02_220)] tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log, i) => {
                const tc = threatColor(log.threatLevel);
                const dtc = detectionTypeColor(log.detectionType);
                return (
                  <tr
                    key={log.id}
                    data-ocid={`logs.item.${i + 1}`}
                    className="border-t border-[oklch(0.18_0.02_240)] hover:bg-[oklch(0.14_0.025_240)]"
                  >
                    <td className="px-3 py-2 text-[oklch(0.45_0.02_220)]">
                      {format(new Date(Number(log.timestamp)), "HH:mm:ss")}
                    </td>
                    <td className="px-3 py-2 text-[oklch(0.82_0.01_220)]">
                      {log.detectedPersonName}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${dtc}`}
                      >
                        {detectionTypeLabel(log.detectionType)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[oklch(0.75_0.18_200)]">
                      {log.matchPercentage > 0n
                        ? `${log.matchPercentage}%`
                        : "N/A"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${tc.bg} ${tc.text}`}
                      >
                        {threatLabel(log.threatLevel)}
                      </span>
                    </td>
                    <td className="px-3 py-2 uppercase text-[oklch(0.5_0.02_220)]">
                      {log.activityLabel}
                    </td>
                    <td className="px-3 py-2 text-[oklch(0.45_0.02_220)]">
                      {log.location}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
