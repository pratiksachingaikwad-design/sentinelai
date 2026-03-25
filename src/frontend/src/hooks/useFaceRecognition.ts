import { useCallback, useEffect, useRef, useState } from "react";

const MODEL_URL = "https://vladmandic.github.io/face-api/model/";
const CDN_URL =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.js";

export interface FaceMatch {
  box: { x: number; y: number; width: number; height: number };
  label: string;
  confidence: number;
  isKnownCriminal: boolean;
}

export interface CriminalForRecognition {
  id: string;
  name: string;
  photoUrl: string;
  threatLevel: string;
}

function loadFaceApiScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).faceapi) {
      resolve((window as any).faceapi);
      return;
    }
    const existing = document.getElementById("face-api-script");
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).faceapi));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.id = "face-api-script";
    script.src = CDN_URL;
    script.onload = () => resolve((window as any).faceapi);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function useFaceRecognition() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const faceapiRef = useRef<any>(null);
  const matcherRef = useRef<any>(null);
  const modelsLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      setLoadingModels(true);
      try {
        const faceapi = await loadFaceApiScript();
        faceapiRef.current = faceapi;
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) {
          modelsLoadedRef.current = true;
          setModelsLoaded(true);
        }
      } catch {
        if (!cancelled) setModelError("Face recognition models failed to load");
      } finally {
        if (!cancelled) setLoadingModels(false);
      }
    }
    loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  // Stable reference -- uses refs internally so no dependency issues
  const buildMatcher = useCallback(
    async (profiles: CriminalForRecognition[]): Promise<boolean> => {
      const faceapi = faceapiRef.current;
      if (!faceapi || !modelsLoadedRef.current) return false;
      const labeled: any[] = [];
      for (const p of profiles) {
        try {
          const img = await faceapi.fetchImage(p.photoUrl);
          // Try SsdMobilenetv1 first with a lenient threshold
          let det = await faceapi
            .detectSingleFace(
              img,
              new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25 }),
            )
            .withFaceLandmarks()
            .withFaceDescriptor();
          // Fall back to TinyFaceDetector
          if (!det) {
            det = await faceapi
              .detectSingleFace(
                img,
                new faceapi.TinyFaceDetectorOptions({
                  inputSize: 416,
                  scoreThreshold: 0.2,
                }),
              )
              .withFaceLandmarks()
              .withFaceDescriptor();
          }
          if (det) {
            labeled.push(
              new faceapi.LabeledFaceDescriptors(p.name, [det.descriptor]),
            );
          }
        } catch {
          // photo not compatible, skip
        }
      }
      if (labeled.length === 0) {
        matcherRef.current = null;
        return false;
      }
      // 0.65 threshold -- slightly more lenient than standard 0.6 for better recognition
      matcherRef.current = new faceapi.FaceMatcher(labeled, 0.65);
      return true;
    },
    [],
  );

  // Stable reference -- reads from refs only so never stale
  const detectFaces = useCallback(
    async (video: HTMLVideoElement): Promise<FaceMatch[]> => {
      const faceapi = faceapiRef.current;
      if (!faceapi || !modelsLoadedRef.current) return [];
      try {
        // Try TinyFaceDetector first (fast)
        let detections = await faceapi
          .detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 416,
              scoreThreshold: 0.2, // lowered from 0.3 for better live video coverage
            }),
          )
          .withFaceLandmarks()
          .withFaceDescriptors();

        // If TinyFaceDetector found nothing, fall back to SSD which is more accurate
        if (detections.length === 0) {
          detections = await faceapi
            .detectAllFaces(
              video,
              new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25 }),
            )
            .withFaceLandmarks()
            .withFaceDescriptors();
        }

        return detections.map((d: any) => {
          const matcher = matcherRef.current;
          const best = matcher?.findBestMatch(d.descriptor);
          const rawConfidence = best
            ? Math.max(0, Math.round((1 - best.distance) * 100))
            : 0;
          const isKnown = best && best.label !== "unknown";
          return {
            box: {
              x: d.detection.box.x,
              y: d.detection.box.y,
              width: d.detection.box.width,
              height: d.detection.box.height,
            },
            label: isKnown ? best.label : "Unknown Person",
            confidence: rawConfidence,
            isKnownCriminal: !!isKnown,
          };
        });
      } catch {
        return [];
      }
    },
    [],
  );

  return {
    modelsLoaded,
    loadingModels,
    modelError,
    buildMatcher,
    detectFaces,
  };
}
