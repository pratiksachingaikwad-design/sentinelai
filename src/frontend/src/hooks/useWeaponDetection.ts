// Weapon detection using TensorFlow.js COCO-SSD model
// COCO-SSD detects knives, scissors, and other weapon-adjacent objects in real time

const TF_CDN =
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js";
const COCO_SSD_CDN =
  "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js";

// COCO-SSD classes we treat as weapons
const WEAPON_CLASSES: Record<string, string> = {
  knife: "Knife",
  scissors: "Sharp Object (Scissors)",
  "baseball bat": "Blunt Weapon (Baseball Bat)",
  bottle: "Improvised Weapon (Bottle)",
  fork: "Sharp Object (Fork)",
  sword: "Sword",
};

export interface WeaponDetection {
  weaponType: string;
  cocoClass: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
}

function loadScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

let modelPromise: Promise<any> | null = null;

async function getModel(): Promise<any> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadScript("tf-js", TF_CDN);
      await loadScript("coco-ssd-js", COCO_SSD_CDN);
      const cocoSsd = (window as any).cocoSsd;
      if (!cocoSsd) throw new Error("COCO-SSD not available");
      // lite_mobilenet_v2 is ~3x faster than mobilenet_v2 with minimal accuracy loss
      return cocoSsd.load({ base: "lite_mobilenet_v2" });
    })();
  }
  return modelPromise;
}

// Pre-warm the model so first detection is instant
export function preloadWeaponModel(): void {
  getModel().catch(() => {});
}

// Reuse a single offscreen canvas to avoid GC pressure
let _canvas: HTMLCanvasElement | null = null;
function getCanvas(): HTMLCanvasElement {
  if (!_canvas) {
    _canvas = document.createElement("canvas");
    _canvas.width = 416;
    _canvas.height = 312;
  }
  return _canvas;
}

export async function detectWeapons(
  video: HTMLVideoElement,
): Promise<WeaponDetection[]> {
  try {
    const model = await getModel();

    // Draw directly to the reused canvas — no extra allocation
    const canvas = getCanvas();
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Detect up to 20 objects
    const predictions: Array<{
      class: string;
      score: number;
      bbox: [number, number, number, number];
    }> = await model.detect(canvas, 20);

    // Scale factors back to video dimensions
    const scaleX = (video.videoWidth || video.clientWidth) / canvas.width;
    const scaleY = (video.videoHeight || video.clientHeight) / canvas.height;

    const weapons: WeaponDetection[] = [];
    for (const p of predictions) {
      const label = WEAPON_CLASSES[p.class.toLowerCase()];
      // Threshold at 0.12 — COCO-SSD knife confidence is naturally low
      if (label && p.score > 0.12) {
        weapons.push({
          weaponType: label,
          cocoClass: p.class,
          confidence: Math.round(p.score * 100),
          box: {
            x: p.bbox[0] * scaleX,
            y: p.bbox[1] * scaleY,
            width: p.bbox[2] * scaleX,
            height: p.bbox[3] * scaleY,
          },
        });
      }
    }
    return weapons;
  } catch {
    return [];
  }
}

export { WEAPON_CLASSES };
