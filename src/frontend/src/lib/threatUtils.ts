import { DetectionType, ThreatLevel } from "../backend";

export function threatColor(level: ThreatLevel) {
  switch (level) {
    case ThreatLevel.critical:
      return {
        text: "text-[oklch(0.6_0.28_15)]",
        bg: "bg-[oklch(0.5_0.28_15_/_0.15)]",
        border: "border-[oklch(0.6_0.28_15)]",
        hex: "#ff2020",
      };
    case ThreatLevel.high:
      return {
        text: "text-[oklch(0.65_0.25_35)]",
        bg: "bg-[oklch(0.55_0.25_35_/_0.15)]",
        border: "border-[oklch(0.65_0.25_35)]",
        hex: "#ff6b35",
      };
    case ThreatLevel.medium:
      return {
        text: "text-[oklch(0.75_0.22_75)]",
        bg: "bg-[oklch(0.65_0.2_75_/_0.15)]",
        border: "border-[oklch(0.75_0.22_75)]",
        hex: "#f5c518",
      };
    case ThreatLevel.low:
      return {
        text: "text-[oklch(0.65_0.18_145)]",
        bg: "bg-[oklch(0.55_0.18_145_/_0.15)]",
        border: "border-[oklch(0.65_0.18_145)]",
        hex: "#22c55e",
      };
    default:
      return {
        text: "text-gray-400",
        bg: "bg-gray-900",
        border: "border-gray-600",
        hex: "#666",
      };
  }
}

export function threatLabel(level: ThreatLevel) {
  switch (level) {
    case ThreatLevel.critical:
      return "CRITICAL";
    case ThreatLevel.high:
      return "HIGH";
    case ThreatLevel.medium:
      return "MEDIUM";
    case ThreatLevel.low:
      return "LOW";
    default:
      return "UNKNOWN";
  }
}

export function detectionTypeLabel(type: DetectionType) {
  switch (type) {
    case DetectionType.knownCriminal:
      return "KNOWN CRIMINAL";
    case DetectionType.unknownPerson:
      return "UNKNOWN SUBJECT";
    case DetectionType.missingPerson:
      return "MISSING PERSON";
    default:
      return "UNKNOWN";
  }
}

export function detectionTypeColor(type: DetectionType) {
  switch (type) {
    case DetectionType.knownCriminal:
      return "text-[oklch(0.6_0.28_15)] bg-[oklch(0.5_0.28_15_/_0.15)]";
    case DetectionType.unknownPerson:
      return "text-[oklch(0.75_0.22_75)] bg-[oklch(0.65_0.2_75_/_0.15)]";
    case DetectionType.missingPerson:
      return "text-[oklch(0.65_0.2_200)] bg-[oklch(0.55_0.2_200_/_0.15)]";
    default:
      return "text-gray-400 bg-gray-900";
  }
}

export function activityColor(label: string) {
  switch (label.toLowerCase()) {
    case "aggressive":
      return "text-[oklch(0.6_0.28_15)]";
    case "fighting":
      return "text-[oklch(0.6_0.28_15)]";
    case "suspicious":
      return "text-[oklch(0.75_0.22_75)]";
    case "chaotic":
      return "text-[oklch(0.6_0.28_15)]";
    default:
      return "text-[oklch(0.65_0.18_145)]";
  }
}
