import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { DetectionType, ThreatLevel } from "../backend";
import { useActor } from "../hooks/useActor";
import {
  activityColor,
  detectionTypeColor,
  detectionTypeLabel,
  threatColor,
  threatLabel,
} from "../lib/threatUtils";

export default function LogsPage() {
  const { actor } = useActor();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterThreat, setFilterThreat] = useState<string>("all");

  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const result = await actor!.getAllDetectionLogs();
      return result;
    },
    enabled: !!actor,
    refetchInterval: 4000,
    staleTime: 0,
  });

  const sorted = [...logs].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );
  const filtered = sorted.filter((l) => {
    const mt = filterType === "all" || l.detectionType === filterType;
    const mh = filterThreat === "all" || l.threatLevel === filterThreat;
    return mt && mh;
  });

  const selectCls =
    "px-3 py-2 bg-[oklch(0.13_0.025_240)] border border-[oklch(0.22_0.03_240)] rounded text-[10px] font-mono text-[oklch(0.8_0.01_220)] focus:outline-none";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold font-mono text-[oklch(0.75_0.18_200)] tracking-widest">
          DETECTION LOGS
        </h1>
        <div className="text-xs font-mono text-[oklch(0.45_0.02_220)]">
          {filtered.length} RECORDS
        </div>
      </div>
      <div className="flex gap-3 mb-4">
        <select
          data-ocid="logs.type_filter.select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={selectCls}
        >
          <option value="all">ALL TYPES</option>
          {Object.values(DetectionType).map((t) => (
            <option key={t} value={t}>
              {detectionTypeLabel(t)}
            </option>
          ))}
        </select>
        <select
          data-ocid="logs.threat_filter.select"
          value={filterThreat}
          onChange={(e) => setFilterThreat(e.target.value)}
          className={selectCls}
        >
          <option value="all">ALL THREATS</option>
          {Object.values(ThreatLevel).map((t) => (
            <option key={t} value={t}>
              {t.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
      <div className="border border-[oklch(0.22_0.03_240)] rounded-lg overflow-hidden">
        <table className="w-full text-[10px] font-mono">
          <thead className="bg-[oklch(0.15_0.025_240)]">
            <tr>
              {[
                "TIMESTAMP",
                "SUBJECT",
                "TYPE",
                "MATCH %",
                "THREAT",
                "ACTIVITY",
                "WEAPONS",
                "CAM",
                "LOCATION",
                "EVIDENCE",
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
            {filtered.map((log, i) => {
              const tc = threatColor(log.threatLevel);
              const dtc = detectionTypeColor(log.detectionType);
              return (
                <tr
                  key={log.id}
                  data-ocid={`logs.item.${i + 1}`}
                  className="border-t border-[oklch(0.18_0.02_240)] hover:bg-[oklch(0.14_0.025_240)]"
                >
                  <td className="px-3 py-2 text-[oklch(0.45_0.02_220)] whitespace-nowrap">
                    {format(new Date(Number(log.timestamp)), "MM/dd HH:mm:ss")}
                  </td>
                  <td className="px-3 py-2 text-[oklch(0.8_0.01_220)] max-w-32 truncate">
                    {log.detectedPersonName}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${dtc}`}>
                      {detectionTypeLabel(log.detectionType)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[oklch(0.75_0.18_200)]">
                    {log.matchPercentage > 0n
                      ? `${log.matchPercentage}%`
                      : "--"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] ${tc.bg} ${tc.text}`}
                    >
                      {threatLabel(log.threatLevel)}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2 uppercase ${activityColor(log.activityLabel)}`}
                  >
                    {log.activityLabel}
                  </td>
                  <td className="px-3 py-2">
                    {log.weaponsDetected.length > 0 ? (
                      <span className="text-[oklch(0.65_0.25_35)]">
                        {log.weaponsDetected.join(", ")}
                      </span>
                    ) : (
                      <span className="text-[oklch(0.3_0.02_220)]">none</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[oklch(0.45_0.02_220)]">
                    {log.cameraId}
                  </td>
                  <td className="px-3 py-2 text-[oklch(0.45_0.02_220)] max-w-24 truncate">
                    {log.location}
                  </td>
                  <td className="px-3 py-2">
                    {log.evidencePhotoUrl ? (
                      <img
                        src={log.evidencePhotoUrl}
                        alt="Evidence"
                        className="w-10 h-7 object-cover rounded border border-[oklch(0.22_0.03_240)]"
                      />
                    ) : (
                      <span className="text-[oklch(0.3_0.02_220)]">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div
            data-ocid="logs.empty_state"
            className="text-center py-12 text-xs font-mono text-[oklch(0.35_0.02_220)]"
          >
            <div className="mb-2">NO DETECTION LOGS RECORDED</div>
            <div className="text-[10px] text-[oklch(0.25_0.02_220)]">
              Logs will appear here automatically when the surveillance system
              detects a person
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
