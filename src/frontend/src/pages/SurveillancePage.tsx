import { format } from "date-fns";
import { Camera, Loader2, RefreshCw, ShieldAlert, Wifi } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type CriminalProfile,
  DetectionType,
  type MissingPerson,
  ThreatLevel,
} from "../backend";
import { useCamera } from "../camera/useCamera";
import { useActor } from "../hooks/useActor";
import { useAlarm } from "../hooks/useAlarm";
import {
  type FaceMatch,
  useFaceRecognition,
} from "../hooks/useFaceRecognition";
import {
  type WeaponDetection,
  detectWeapons,
  preloadWeaponModel,
} from "../hooks/useWeaponDetection";
import { mockCriminals, mockMissingPersons } from "../lib/mockData";
import { threatColor, threatLabel } from "../lib/threatUtils";

const CAMERAS = ["CAM-01", "CAM-02", "CAM-03", "CAM-04"];
const LOCATIONS = [
  "Main Entrance",
  "Side Exit",
  "Parking Lot B",
  "Lobby",
  "Rooftop",
  "Server Room",
];

const ALERT_COOLDOWN_MS = 8000;

function captureScreenshot(video: HTMLVideoElement): string | undefined {
  try {
    const maxW = 320;
    const maxH = 180;
    const vw = video.videoWidth || video.clientWidth || maxW;
    const vh = video.videoHeight || video.clientHeight || maxH;
    const scale = Math.min(maxW / vw, maxH / vh, 1);
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.5);
  } catch {
    return undefined;
  }
}

function CameraStatusBadge({
  isActive,
  isLoading,
  hasError,
}: {
  isActive: boolean;
  isLoading: boolean;
  hasError: boolean;
}) {
  if (isActive) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[oklch(0.65_0.18_145)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[oklch(0.65_0.18_145)]" />
        </span>
        <span className="text-[10px] font-mono text-[oklch(0.65_0.18_145)] tracking-widest">
          LIVE CAM
        </span>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[oklch(0.78_0.19_85)]" />
        <span className="text-[10px] font-mono text-[oklch(0.78_0.19_85)] tracking-widest">
          LOADING
        </span>
      </div>
    );
  }
  if (hasError) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[oklch(0.6_0.28_15)]" />
        <span className="text-[10px] font-mono text-[oklch(0.6_0.28_15)] tracking-widest">
          CAM BLOCKED
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-[oklch(0.4_0.02_220)]" />
      <span className="text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest">
        AWAITING CAMERA
      </span>
    </div>
  );
}

export default function SurveillancePage() {
  const { actor } = useActor();
  const {
    videoRef,
    startCamera,
    startCameraWithDevice,
    isActive,
    isLoading: cameraLoading,
    error: cameraError,
    retry,
  } = useCamera({ facingMode: "user" });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const weaponLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertCooldownRef = useRef<Map<string, number>>(new Map());
  const weaponCooldownRef = useRef<number>(0);
  const criminalNamesRef = useRef<Set<string>>(new Set());
  const missingPersonNamesRef = useRef<Set<string>>(new Set());

  // Keep latest values in refs so weapon loop closure always has fresh data
  const activeDetectionsRef = useRef<FaceMatch[]>([]);
  const activeWeaponsRef = useRef<WeaponDetection[]>([]);
  const actorRef = useRef(actor);
  const currentCamRef = useRef("CAM-01");
  const watchListRef = useRef<CriminalProfile[]>(mockCriminals);

  const [currentCam, setCurrentCam] = useState("CAM-01");
  const [isScanning, setIsScanning] = useState(true);
  const [activeDetections, setActiveDetections] = useState<FaceMatch[]>([]);
  const [activeWeapons, setActiveWeapons] = useState<WeaponDetection[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<string[]>([]);
  const [watchList, setWatchList] = useState<CriminalProfile[]>(mockCriminals);
  const [missingList, setMissingList] =
    useState<MissingPerson[]>(mockMissingPersons);
  const [matcherReady, setMatcherReady] = useState(false);
  const [totalProfilesLoaded, setTotalProfilesLoaded] = useState(0);

  // Camera selector state
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const { modelsLoaded, loadingModels, modelError, buildMatcher, detectFaces } =
    useFaceRecognition();

  const { playAlarm } = useAlarm();
  const playAlarmRef = useRef(playAlarm);

  // Keep refs in sync
  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);
  useEffect(() => {
    currentCamRef.current = currentCam;
  }, [currentCam]);
  useEffect(() => {
    watchListRef.current = watchList;
  }, [watchList]);
  useEffect(() => {
    playAlarmRef.current = playAlarm;
  }, [playAlarm]);

  // Pre-warm the weapon model immediately so first detection is fast
  useEffect(() => {
    preloadWeaponModel();
  }, []);

  // Enumerate cameras after permission is granted (when isActive becomes true)
  useEffect(() => {
    if (!isActive) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const videoCams = devices.filter((d) => d.kind === "videoinput");
        setAvailableCameras(videoCams);
      })
      .catch(() => {});
  }, [isActive]);

  const handleCameraChange = useCallback(
    async (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      await startCameraWithDevice(deviceId);
    },
    [startCameraWithDevice],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: buildMatcher is stable
  useEffect(() => {
    async function loadAndBuild() {
      let criminals: CriminalProfile[] = mockCriminals;
      let missing: MissingPerson[] = mockMissingPersons;
      if (actor) {
        try {
          const [crimResult, missResult] = await Promise.all([
            actor.getAllCriminalProfiles(),
            actor.getAllMissingPersons(),
          ]);
          if (crimResult.length > 0) criminals = crimResult;
          if (missResult.length > 0) missing = missResult;
        } catch {}
      }
      setWatchList(criminals);
      setMissingList(missing);
      criminalNamesRef.current = new Set(
        criminals.map((c) => c.name.toLowerCase()),
      );
      missingPersonNamesRef.current = new Set(
        missing.map((p) => p.name.toLowerCase()),
      );

      if (modelsLoaded) {
        const allProfiles = [
          ...criminals.map((p) => ({
            id: p.id,
            name: p.name,
            photoUrl: p.photoUrl,
            threatLevel: String(p.threatLevel),
          })),
          ...missing.map((p) => ({
            id: p.id,
            name: p.name,
            photoUrl: p.photoUrl,
            threatLevel: "low",
          })),
        ];
        const ok = await buildMatcher(allProfiles);
        setTotalProfilesLoaded(allProfiles.length);
        setMatcherReady(ok);
      }
    }
    loadAndBuild();
  }, [modelsLoaded, actor]); // eslint-disable-line

  // biome-ignore lint/correctness/useExhaustiveDependencies: startCamera is stable
  useEffect(() => {
    startCamera();
  }, []);

  const drawOverlay = useCallback(
    (
      detections: FaceMatch[],
      weapons: WeaponDetection[],
      videoEl: HTMLVideoElement,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = videoEl.videoWidth || videoEl.clientWidth;
      canvas.height = videoEl.videoHeight || videoEl.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scaleX = canvas.width / (videoEl.videoWidth || canvas.width);
      const scaleY = canvas.height / (videoEl.videoHeight || canvas.height);

      for (const det of detections) {
        const x = det.box.x * scaleX;
        const y = det.box.y * scaleY;
        const w = det.box.width * scaleX;
        const h = det.box.height * scaleY;

        const labelLower = det.label.toLowerCase();
        const isCriminal = criminalNamesRef.current.has(labelLower);
        const isMissingPerson = missingPersonNamesRef.current.has(labelLower);
        const colorHex = isCriminal
          ? "#e05252"
          : isMissingPerson
            ? "#f0b429"
            : "#52a8e0";

        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        const cs = 14;
        ctx.lineWidth = 3;
        [
          [x, y],
          [x + w - cs, y],
          [x, y + h - cs],
          [x + w - cs, y + h - cs],
        ].forEach(([cx, cy], i) => {
          ctx.beginPath();
          ctx.moveTo(cx + (i % 2 === 0 ? 0 : cs), cy);
          ctx.lineTo(cx + (i % 2 === 0 ? cs : 0), cy);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, cy + (i < 2 ? 0 : cs));
          ctx.lineTo(cx, cy + (i < 2 ? cs : 0));
          ctx.stroke();
        });

        const label = isCriminal
          ? `${det.label} ${det.confidence}%`
          : isMissingPerson
            ? `MISSING: ${det.label} ${det.confidence}%`
            : "Unknown Person";
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(x, y - 20, ctx.measureText(label).width + 8, 18);
        ctx.fillStyle = colorHex;
        ctx.fillText(label, x + 4, y - 6);
      }

      for (const weapon of weapons) {
        const x = weapon.box.x * scaleX;
        const y = weapon.box.y * scaleY;
        const w = weapon.box.width * scaleX;
        const h = weapon.box.height * scaleY;
        const weaponColor = "#ff6b35";

        ctx.strokeStyle = weaponColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        const cs = 14;
        ctx.lineWidth = 3;
        ctx.strokeStyle = weaponColor;
        [
          [x, y],
          [x + w - cs, y],
          [x, y + h - cs],
          [x + w - cs, y + h - cs],
        ].forEach(([cx, cy], i) => {
          ctx.beginPath();
          ctx.moveTo(cx + (i % 2 === 0 ? 0 : cs), cy);
          ctx.lineTo(cx + (i % 2 === 0 ? cs : 0), cy);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, cy + (i < 2 ? 0 : cs));
          ctx.lineTo(cx, cy + (i < 2 ? cs : 0));
          ctx.stroke();
        });

        const wLabel = `\u26A0 ${weapon.weaponType} (${weapon.confidence}%)`;
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "rgba(255, 107, 53, 0.8)";
        ctx.fillRect(x, y - 20, ctx.measureText(wLabel).width + 8, 18);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(wLabel, x + 4, y - 6);
      }
    },
    [],
  );

  // ─── FACE DETECTION LOOP (800ms) ────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !isScanning || !modelsLoaded) {
      if (faceLoopRef.current) {
        clearInterval(faceLoopRef.current);
        faceLoopRef.current = null;
      }
      if (!isActive && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    let running = false;
    faceLoopRef.current = setInterval(async () => {
      if (running) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      running = true;
      try {
        const matches = await detectFaces(video);
        activeDetectionsRef.current = matches;
        setActiveDetections(matches);
        // Redraw overlay with latest weapons from ref
        drawOverlay(matches, activeWeaponsRef.current, video);

        const now = Date.now();
        for (const m of matches) {
          if (m.isKnownCriminal) {
            const labelLower = m.label.toLowerCase();
            const isCriminal = criminalNamesRef.current.has(labelLower);
            const isMissing = missingPersonNamesRef.current.has(labelLower);

            if (!isCriminal && !isMissing) continue;

            const lastAlerted = alertCooldownRef.current.get(m.label) ?? 0;
            if (now - lastAlerted < ALERT_COOLDOWN_MS) continue;
            alertCooldownRef.current.set(m.label, now);

            const screenshot = captureScreenshot(video);
            const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

            if (isCriminal) {
              const criminal = watchListRef.current.find(
                (c) => c.name.toLowerCase() === labelLower,
              );
              const threat = criminal?.threatLevel ?? ThreatLevel.high;
              const alertMsg = `ALERT: ${m.label} detected at ${loc} (${m.confidence}% match)`;

              toast.error(alertMsg, {
                duration: 6000,
                style: {
                  background: "oklch(0.12 0.025 240)",
                  border: "1px solid oklch(0.6 0.28 15)",
                  color: "oklch(0.7 0.25 25)",
                },
              });
              playAlarmRef.current(4000);
              setRecentAlerts((prev) => [alertMsg, ...prev].slice(0, 5));

              const logId = `${now}-${m.label}`;
              if (actorRef.current) {
                actorRef.current
                  .addDetectionLog({
                    id: logId,
                    timestamp: BigInt(now),
                    detectedPersonName: m.label,
                    matchPercentage: BigInt(m.confidence),
                    threatLevel: threat,
                    detectionType: DetectionType.knownCriminal,
                    activityLabel: "detected",
                    weaponsDetected: [],
                    evidencePhotoUrl: screenshot ?? "",
                    cameraId: currentCamRef.current,
                    location: loc,
                  })
                  .catch(() => {});

                if (screenshot) {
                  actorRef.current
                    .addEvidenceRecord({
                      id: `ev-${logId}`,
                      detectionLogId: logId,
                      timestamp: BigInt(now),
                      blobId: logId,
                      metadata: `${m.label} detected at ${loc}`,
                    })
                    .catch(() => {});
                }
              }
            } else if (isMissing) {
              const alertMsg = `MISSING PERSON LOCATED: ${m.label} spotted at ${loc} (${m.confidence}% match)`;

              toast.warning(alertMsg, {
                duration: 6000,
                style: {
                  background: "oklch(0.12 0.025 240)",
                  border: "1px solid oklch(0.78 0.19 85)",
                  color: "oklch(0.78 0.19 85)",
                },
              });
              playAlarmRef.current(4000);
              setRecentAlerts((prev) => [alertMsg, ...prev].slice(0, 5));

              const logId = `${now}-${m.label}`;
              if (actorRef.current) {
                actorRef.current
                  .addDetectionLog({
                    id: logId,
                    timestamp: BigInt(now),
                    detectedPersonName: m.label,
                    matchPercentage: BigInt(m.confidence),
                    threatLevel: ThreatLevel.low,
                    detectionType: DetectionType.missingPerson,
                    activityLabel: "detected",
                    weaponsDetected: [],
                    evidencePhotoUrl: screenshot ?? "",
                    cameraId: currentCamRef.current,
                    location: loc,
                  })
                  .catch(() => {});

                if (screenshot) {
                  actorRef.current
                    .addEvidenceRecord({
                      id: `ev-${logId}`,
                      detectionLogId: logId,
                      timestamp: BigInt(now),
                      blobId: logId,
                      metadata: `Missing person ${m.label} spotted at ${loc}`,
                    })
                    .catch(() => {});
                }
              }
            }
          }
        }
      } finally {
        running = false;
      }
    }, 800);

    return () => {
      if (faceLoopRef.current) clearInterval(faceLoopRef.current);
    };
  }, [isActive, isScanning, modelsLoaded, detectFaces, drawOverlay, videoRef]); // eslint-disable-line

  // ─── WEAPON DETECTION LOOP (150ms) ─────────────────────────────────────────
  // Runs independently at high frequency for instant knife/weapon detection
  useEffect(() => {
    if (!isActive || !isScanning) {
      if (weaponLoopRef.current) {
        clearInterval(weaponLoopRef.current);
        weaponLoopRef.current = null;
      }
      return;
    }

    let running = false;
    weaponLoopRef.current = setInterval(async () => {
      if (running) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      running = true;
      try {
        const weapons = await detectWeapons(video);
        activeWeaponsRef.current = weapons;
        setActiveWeapons(weapons);
        // Redraw overlay combining latest face detections with new weapon results
        drawOverlay(activeDetectionsRef.current, weapons, video);

        if (weapons.length > 0) {
          const now = Date.now();
          const lastWeaponAlert = weaponCooldownRef.current;
          if (now - lastWeaponAlert > 6000) {
            weaponCooldownRef.current = now;
            const weaponNames = weapons.map((w) => w.weaponType).join(", ");
            const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
            const alertMsg = `WEAPON DETECTED: ${weaponNames} at ${loc}`;
            toast.error(alertMsg, {
              duration: 7000,
              style: {
                background: "oklch(0.12 0.025 240)",
                border: "1px solid #ff6b35",
                color: "#ff6b35",
              },
            });
            playAlarmRef.current(4000);
            setRecentAlerts((prev) => [alertMsg, ...prev].slice(0, 5));
            const logId = `weapon-${now}`;
            if (actorRef.current) {
              actorRef.current
                .addDetectionLog({
                  id: logId,
                  timestamp: BigInt(now),
                  detectedPersonName: "Unknown",
                  matchPercentage: BigInt(weapons[0].confidence),
                  threatLevel: ThreatLevel.critical,
                  detectionType: DetectionType.unknownPerson,
                  activityLabel: `Weapon detected: ${weaponNames}`,
                  weaponsDetected: weapons.map((w) => w.weaponType),
                  evidencePhotoUrl: captureScreenshot(video) ?? "",
                  cameraId: currentCamRef.current,
                  location: loc,
                })
                .catch(() => {});
            }
          }
        }
      } finally {
        running = false;
      }
    }, 150);

    return () => {
      if (weaponLoopRef.current) clearInterval(weaponLoopRef.current);
    };
  }, [isActive, isScanning, drawOverlay, videoRef]); // eslint-disable-line

  const primaryDetection = activeDetections[0] ?? null;
  const primaryLabelLower = primaryDetection?.label.toLowerCase() ?? "";
  const isPrimaryMissing = primaryDetection?.isKnownCriminal
    ? missingPersonNamesRef.current.has(primaryLabelLower)
    : false;
  const criminalMatch =
    primaryDetection?.isKnownCriminal && !isPrimaryMissing
      ? watchList.find((c) => c.name.toLowerCase() === primaryLabelLower)
      : null;
  const missingMatch =
    primaryDetection?.isKnownCriminal && isPrimaryMissing
      ? missingList.find((p) => p.name.toLowerCase() === primaryLabelLower)
      : null;
  const detTc = criminalMatch
    ? threatColor(criminalMatch.threatLevel)
    : missingMatch
      ? threatColor(ThreatLevel.low)
      : primaryDetection
        ? threatColor(ThreatLevel.medium)
        : null;

  function renderCameraArea() {
    return (
      <>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${isActive ? "block" : "hidden"}`}
        />
        {isActive && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ objectFit: "cover" }}
          />
        )}

        {!isActive && cameraLoading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            data-ocid="surveillance.camera.loading_state"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.06 0.02 240), oklch(0.1 0.025 240))",
            }}
          >
            <Loader2 className="w-10 h-10 text-[oklch(0.75_0.18_200)] animate-spin" />
            <div className="text-center">
              <p className="text-sm font-mono text-[oklch(0.75_0.18_200)] tracking-widest">
                REQUESTING CAMERA ACCESS
              </p>
              <p className="text-[10px] font-mono text-[oklch(0.45_0.02_220)] mt-1">
                Please allow camera permission in your browser
              </p>
            </div>
          </div>
        )}

        {!isActive && cameraError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8"
            data-ocid="surveillance.camera.error_state"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.06 0.02 240), oklch(0.1 0.025 240))",
            }}
          >
            <div className="flex flex-col items-center gap-5 max-w-sm text-center">
              <div
                className="w-16 h-16 rounded-full border border-[oklch(0.6_0.28_15_/_0.4)] flex items-center justify-center"
                style={{ background: "oklch(0.5 0.28 15 / 0.1)" }}
              >
                <ShieldAlert className="w-8 h-8 text-[oklch(0.6_0.28_15)]" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-[oklch(0.75_0.01_220)] tracking-widest uppercase">
                  Camera Access Required
                </h3>
                <p className="text-[10px] font-mono text-[oklch(0.45_0.02_220)] mt-2 leading-relaxed">
                  {cameraError.type === "permission"
                    ? 'Camera permission was denied. Click the camera icon in your browser address bar and select "Allow", then try again.'
                    : cameraError.type === "not-found"
                      ? "No camera device was detected. Please connect a camera and try again."
                      : "An error occurred while accessing the camera. Please try again."}
                </p>
              </div>
              <button
                type="button"
                data-ocid="surveillance.camera.button"
                onClick={retry}
                className="flex items-center gap-2 px-4 py-2 rounded border border-[oklch(0.75_0.18_200_/_0.5)] text-[oklch(0.75_0.18_200)] text-xs font-mono tracking-widest hover:bg-[oklch(0.75_0.18_200_/_0.1)] transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> RETRY
              </button>
            </div>
          </div>
        )}

        {!isActive && !cameraLoading && !cameraError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            data-ocid="surveillance.camera.loading_state"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.06 0.02 240), oklch(0.1 0.025 240))",
            }}
          >
            <Camera className="w-10 h-10 text-[oklch(0.3_0.05_220)] opacity-40" />
            <p className="text-[10px] font-mono text-[oklch(0.35_0.02_220)] tracking-widest">
              INITIALIZING CAMERA...
            </p>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold font-mono text-[oklch(0.75_0.18_200)] tracking-widest">
          LIVE SURVEILLANCE
        </h1>
        <div className="flex items-center gap-3">
          {CAMERAS.map((c) => (
            <button
              type="button"
              key={c}
              data-ocid={`surveillance.${c.toLowerCase()}.button`}
              onClick={() => setCurrentCam(c)}
              className={`text-xs font-mono px-3 py-1 rounded border transition-all ${
                currentCam === c
                  ? "border-[oklch(0.75_0.18_200)] text-[oklch(0.75_0.18_200)] bg-[oklch(0.75_0.18_200_/_0.1)]"
                  : "border-[oklch(0.22_0.03_240)] text-[oklch(0.5_0.02_220)] hover:border-[oklch(0.4_0.03_240)]"
              }`}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            data-ocid="surveillance.scan.toggle"
            onClick={() => setIsScanning((v) => !v)}
            className={`text-xs font-mono px-3 py-1 rounded border transition-all ${
              isScanning
                ? "border-[oklch(0.65_0.18_145)] text-[oklch(0.65_0.18_145)] bg-[oklch(0.65_0.18_145_/_0.1)]"
                : "border-[oklch(0.5_0.02_220)] text-[oklch(0.5_0.02_220)]"
            }`}
          >
            {isScanning ? "SCANNING" : "PAUSED"}
          </button>
          {availableCameras.length > 1 && (
            <select
              data-ocid="surveillance.camera.select"
              value={selectedDeviceId}
              onChange={(e) => handleCameraChange(e.target.value)}
              className="text-xs font-mono px-2 py-1 rounded border border-[oklch(0.22_0.03_240)] bg-[oklch(0.13_0.025_240)] text-[oklch(0.75_0.18_200)] focus:outline-none focus:border-[oklch(0.5_0.08_220)] max-w-[160px] cursor-pointer"
            >
              {availableCameras.map((cam, i) => (
                <option
                  key={cam.deviceId}
                  value={cam.deviceId}
                  className="bg-[oklch(0.13_0.025_240)]"
                >
                  {cam.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {(loadingModels || modelError || (!matcherReady && modelsLoaded)) && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[oklch(0.22_0.03_240)] bg-[oklch(0.13_0.025_240)] text-[10px] font-mono">
          {loadingModels && (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-[oklch(0.75_0.18_200)]" />
              <span className="text-[oklch(0.5_0.02_220)]">
                Loading face recognition AI models...
              </span>
            </>
          )}
          {modelError && (
            <span className="text-[oklch(0.6_0.28_15)]">{modelError}</span>
          )}
          {!loadingModels && !modelError && modelsLoaded && !matcherReady && (
            <span className="text-[oklch(0.5_0.02_220)]">
              AI models ready. No face descriptors found in criminal photos yet
              &mdash; add criminals with clear face photos to enable
              recognition.
            </span>
          )}
          {!loadingModels && !modelError && matcherReady && (
            <>
              <span className="w-2 h-2 rounded-full bg-[oklch(0.65_0.18_145)] animate-pulse" />
              <span className="text-[oklch(0.65_0.18_145)]">
                Face recognition active &mdash; scanning against{" "}
                {watchList.length} criminal profiles + {missingList.length}{" "}
                missing persons ({totalProfilesLoaded} total)
              </span>
            </>
          )}
        </div>
      )}
      {!loadingModels && !modelError && matcherReady && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[oklch(0.22_0.03_240_/_0.5)] bg-[oklch(0.13_0.025_240)] text-[10px] font-mono">
          <span className="w-2 h-2 rounded-full bg-[oklch(0.65_0.18_145)] animate-pulse" />
          <span className="text-[oklch(0.65_0.18_145)]">
            Face recognition active &mdash; scanning against {watchList.length}{" "}
            criminal profiles + {missingList.length} missing persons (
            {totalProfilesLoaded} total)
          </span>
        </div>
      )}
      {isActive && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[oklch(0.22_0.03_240_/_0.5)] bg-[oklch(0.13_0.025_240)] text-[10px] font-mono">
          <span className="w-2 h-2 rounded-full bg-[#ff6b35] animate-pulse" />
          <span style={{ color: "#ff6b35" }}>
            Weapon detection active &mdash; instant scan every 150ms (knife,
            sharp objects, blunt weapons)
          </span>
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 relative bg-black rounded-lg overflow-hidden border border-[oklch(0.22_0.03_240)]">
          {renderCameraArea()}

          {isScanning && isActive && (
            <div className="absolute left-0 right-0 h-0.5 bg-[oklch(0.75_0.18_200_/_0.4)] animate-scan pointer-events-none" />
          )}

          <div className="absolute top-2 left-2 text-[10px] font-mono text-[oklch(0.75_0.18_200_/_0.8)]">
            <div>
              {currentCam} &bull; {format(new Date(), "HH:mm:ss")}
            </div>
            <div className="mt-0.5">
              <CameraStatusBadge
                isActive={isActive}
                isLoading={cameraLoading}
                hasError={!!cameraError}
              />
            </div>
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <Wifi className="w-3 h-3 text-[oklch(0.65_0.18_145)]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.65_0.18_145)] animate-pulse" />
          </div>
        </div>

        <div className="w-64 flex flex-col gap-3 overflow-y-auto">
          {primaryDetection && detTc ? (
            <div
              className={`border ${
                isPrimaryMissing
                  ? "border-[oklch(0.78_0.19_85_/_0.5)] bg-[oklch(0.78_0.19_85_/_0.08)]"
                  : `${detTc.border} ${detTc.bg}`
              } rounded-lg p-3`}
              data-ocid="surveillance.detection.panel"
            >
              <div
                className={`text-[10px] font-mono tracking-widest mb-2 ${
                  isPrimaryMissing ? "text-[oklch(0.78_0.19_85)]" : detTc.text
                }`}
              >
                {isPrimaryMissing
                  ? "MISSING PERSON LOCATED"
                  : primaryDetection.isKnownCriminal
                    ? "CRIMINAL IDENTIFIED"
                    : "UNKNOWN PERSON DETECTED"}
              </div>
              <div className="font-mono text-sm text-[oklch(0.85_0.01_220)] font-bold">
                {primaryDetection.label}
              </div>
              {primaryDetection.isKnownCriminal &&
                primaryDetection.confidence > 0 && (
                  <div className="mt-1">
                    <div className="text-[10px] text-[oklch(0.45_0.02_220)] font-mono">
                      MATCH CONFIDENCE
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-[oklch(0.18_0.02_240)] rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${primaryDetection.confidence}%`,
                            backgroundColor: isPrimaryMissing
                              ? "#f0b429"
                              : detTc.hex,
                          }}
                        />
                      </div>
                      <span
                        className={`text-xs font-mono font-bold ${
                          isPrimaryMissing
                            ? "text-[oklch(0.78_0.19_85)]"
                            : detTc.text
                        }`}
                      >
                        {primaryDetection.confidence}%
                      </span>
                    </div>
                  </div>
                )}
              {criminalMatch && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[oklch(0.45_0.02_220)]">
                      THREAT LEVEL
                    </span>
                    <span className={detTc.text}>
                      {threatLabel(criminalMatch.threatLevel)}
                    </span>
                  </div>
                  {criminalMatch.aliases.length > 0 && (
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-[oklch(0.45_0.02_220)]">
                        KNOWN AS
                      </span>
                      <span className="text-[oklch(0.5_0.02_220)] truncate ml-2">
                        {criminalMatch.aliases[0]}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {missingMatch && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[oklch(0.45_0.02_220)]">
                      MISSING SINCE
                    </span>
                    <span className="text-[oklch(0.78_0.19_85)] truncate ml-2">
                      {format(
                        new Date(Number(missingMatch.dateOfDisappearance)),
                        "MMM d, yyyy",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[oklch(0.45_0.02_220)]">
                      REPORTED BY
                    </span>
                    <span className="text-[oklch(0.5_0.02_220)] truncate ml-2">
                      {missingMatch.reportedBy}
                    </span>
                  </div>
                </div>
              )}
              <div className="mt-2 text-[9px] font-mono text-[oklch(0.35_0.02_220)]">
                {activeDetections.length} face
                {activeDetections.length !== 1 ? "s" : ""} detected in frame
              </div>
            </div>
          ) : (
            <div className="border border-[oklch(0.22_0.03_240)] rounded-lg p-3 bg-[oklch(0.13_0.025_240)]">
              <div className="text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest">
                MONITORING
              </div>
              <div className="text-xs font-mono text-[oklch(0.65_0.18_145)] mt-2">
                {isActive && modelsLoaded
                  ? "No faces detected"
                  : "Awaiting camera feed..."}
              </div>
            </div>
          )}

          {activeWeapons.length > 0 && (
            <div
              className="border border-[#ff6b35]/50 rounded-lg p-3 animate-pulse"
              style={{ background: "rgba(255, 107, 53, 0.1)" }}
              data-ocid="surveillance.weapon.panel"
            >
              <div
                className="text-[10px] font-mono tracking-widest mb-2"
                style={{ color: "#ff6b35" }}
              >
                ⚠ WEAPON ALERT
              </div>
              {activeWeapons.map((w, i) => (
                <div
                  key={`${w.weaponType}-${i}`}
                  className="text-xs font-mono font-bold"
                  style={{ color: "#ff6b35" }}
                >
                  {w.weaponType} ({w.confidence}%)
                </div>
              ))}
            </div>
          )}

          <div className="border border-[oklch(0.22_0.03_240)] rounded-lg p-3 bg-[oklch(0.13_0.025_240)]">
            <div className="text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-2">
              RECENT ALERTS
            </div>
            {recentAlerts.length === 0 ? (
              <div className="text-[10px] font-mono text-[oklch(0.35_0.02_220)]">
                No alerts yet
              </div>
            ) : (
              recentAlerts.map((a) => (
                <div
                  key={a.slice(0, 40)}
                  className={`text-[9px] font-mono border-b border-[oklch(0.18_0.02_240)] py-1 last:border-0 ${
                    a.startsWith("MISSING")
                      ? "text-[oklch(0.78_0.19_85)]"
                      : a.startsWith("WEAPON")
                        ? "text-[#ff6b35]"
                        : "text-[oklch(0.65_0.25_25)]"
                  }`}
                >
                  {a}
                </div>
              ))
            )}
          </div>

          <div className="border border-[oklch(0.22_0.03_240)] rounded-lg p-3 bg-[oklch(0.13_0.025_240)]">
            <div className="text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-2">
              WATCH LIST
            </div>
            <div className="space-y-2">
              {watchList
                .filter(
                  (c) =>
                    c.threatLevel === ThreatLevel.critical ||
                    c.threatLevel === ThreatLevel.high,
                )
                .slice(0, 4)
                .map((c) => {
                  const tc = threatColor(c.threatLevel);
                  return (
                    <div key={c.id} className="flex items-center gap-2">
                      <img
                        src={c.photoUrl}
                        alt={c.name}
                        className="w-7 h-7 rounded border border-[oklch(0.22_0.03_240)] object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-[oklch(0.75_0.01_220)] truncate">
                          {c.name}
                        </div>
                        <div className={`text-[9px] font-mono ${tc.text}`}>
                          {threatLabel(c.threatLevel)}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
