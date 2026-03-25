import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Image } from "lucide-react";
import { useActor } from "../hooks/useActor";
import { threatColor, threatLabel } from "../lib/threatUtils";

export default function EvidencePage() {
  const { actor } = useActor();

  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllDetectionLogs();
    },
    enabled: !!actor,
    refetchInterval: 4000,
    staleTime: 0,
  });

  const evidenceLogs = logs
    .filter((l) => !!l.evidencePhotoUrl)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  const highThreatLogs = logs
    .filter(
      (l) =>
        !l.evidencePhotoUrl &&
        (l.threatLevel === "high" || l.threatLevel === "critical"),
    )
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    .slice(0, 9);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold font-mono text-[oklch(0.75_0.18_200)] tracking-widest">
          EVIDENCE GALLERY
        </h1>
        <div className="text-xs font-mono text-[oklch(0.45_0.02_220)]">
          {evidenceLogs.length} EVIDENCE RECORDS
        </div>
      </div>

      {evidenceLogs.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {evidenceLogs.map((log, i) => {
            const tc = threatColor(log.threatLevel);
            return (
              <div
                key={log.id}
                data-ocid={`evidence.item.${i + 1}`}
                className={`border ${tc.border} rounded-lg overflow-hidden bg-[oklch(0.13_0.025_240)]`}
              >
                <div className="aspect-video bg-black overflow-hidden">
                  <img
                    src={log.evidencePhotoUrl}
                    alt={`Evidence - ${log.detectedPersonName}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${tc.bg} ${tc.text} border ${tc.border}`}
                    >
                      {threatLabel(log.threatLevel)}
                    </span>
                    <span className="text-[9px] font-mono text-[oklch(0.35_0.02_220)]">
                      {log.cameraId}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-[oklch(0.7_0.01_220)] truncate">
                    {log.detectedPersonName}
                  </div>
                  {log.matchPercentage > 0n && (
                    <div className="text-[9px] font-mono text-[oklch(0.75_0.18_200)]">
                      {String(log.matchPercentage)}% MATCH
                    </div>
                  )}
                  <div className="text-[9px] font-mono text-[oklch(0.45_0.02_220)]">
                    {format(
                      new Date(Number(log.timestamp)),
                      "yyyy-MM-dd HH:mm:ss",
                    )}
                  </div>
                  <div className="text-[9px] font-mono text-[oklch(0.4_0.02_220)]">
                    {log.location}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : highThreatLogs.length > 0 ? (
        <>
          <div className="text-xs font-mono text-[oklch(0.45_0.02_220)] mb-4">
            HIGH-THREAT DETECTIONS &mdash; {highThreatLogs.length} INCIDENTS
          </div>
          <div className="grid grid-cols-3 gap-4">
            {highThreatLogs.map((log, i) => {
              const tc = threatColor(log.threatLevel);
              return (
                <div
                  key={log.id}
                  data-ocid={`evidence.item.${i + 1}`}
                  className={`border ${tc.border} rounded-lg overflow-hidden bg-[oklch(0.13_0.025_240)] ${tc.bg}`}
                >
                  <div className="aspect-video bg-black/50 flex flex-col items-center justify-center gap-2 relative">
                    <div className="absolute inset-0 scan-line opacity-30" />
                    <Image className={`w-8 h-8 ${tc.text} opacity-60`} />
                    <div
                      className={`text-[9px] font-mono ${tc.text} tracking-widest`}
                    >
                      NO SCREENSHOT
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${tc.bg} ${tc.text} border ${tc.border}`}
                      >
                        {threatLabel(log.threatLevel)}
                      </span>
                      <span className="text-[9px] font-mono text-[oklch(0.35_0.02_220)]">
                        {log.cameraId}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[oklch(0.7_0.01_220)] truncate">
                      {log.detectedPersonName}
                    </div>
                    <div className="text-[9px] font-mono text-[oklch(0.45_0.02_220)]">
                      {format(
                        new Date(Number(log.timestamp)),
                        "yyyy-MM-dd HH:mm:ss",
                      )}
                    </div>
                    <div className="text-[9px] font-mono text-[oklch(0.4_0.02_220)]">
                      {log.location}
                    </div>
                    {log.weaponsDetected.length > 0 && (
                      <div className="text-[9px] font-mono text-[oklch(0.65_0.25_35)]">
                        WEAPONS: {log.weaponsDetected.join(", ").toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div
          data-ocid="evidence.empty_state"
          className="text-center py-16 border border-dashed border-[oklch(0.22_0.03_240)] rounded-lg"
        >
          <Image className="w-10 h-10 mx-auto text-[oklch(0.3_0.02_220)] mb-3" />
          <div className="text-xs font-mono text-[oklch(0.35_0.02_220)]">
            NO EVIDENCE RECORDS
          </div>
          <div className="text-[10px] font-mono text-[oklch(0.25_0.02_220)] mt-1">
            Screenshots are automatically captured when a criminal is detected
          </div>
        </div>
      )}
    </div>
  );
}
