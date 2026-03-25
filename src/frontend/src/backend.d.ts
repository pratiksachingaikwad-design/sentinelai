import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Timestamp = bigint;
export interface EvidenceRecord {
    id: string;
    metadata: string;
    timestamp: Timestamp;
    blobId: string;
    detectionLogId: string;
}
export interface SystemStats {
    missingPersonsCount: bigint;
    totalCriminals: bigint;
    detectionsToday: bigint;
    activeAlerts: bigint;
}
export interface DetectionLog {
    id: string;
    activityLabel: string;
    threatLevel: ThreatLevel;
    detectedPersonName: string;
    matchPercentage: bigint;
    evidencePhotoUrl?: string;
    timestamp: Timestamp;
    location: string;
    weaponsDetected: Array<string>;
    cameraId: string;
    detectionType: DetectionType;
}
export interface CriminalProfile {
    id: string;
    age: bigint;
    criminalRecord: string;
    threatLevel: ThreatLevel;
    name: string;
    createdAt: Timestamp;
    photoUrl: string;
    nationality: string;
    isActive: boolean;
    gender: string;
    aliases: Array<string>;
}
export interface MissingPerson {
    id: string;
    dateOfDisappearance: Timestamp;
    name: string;
    createdAt: Timestamp;
    description: string;
    photoUrl: string;
    reportedBy: string;
    isFound: boolean;
    ageAtDisappearance: bigint;
}
export interface UserProfile {
    name: string;
}
export enum DetectionType {
    missingPerson = "missingPerson",
    knownCriminal = "knownCriminal",
    unknownPerson = "unknownPerson"
}
export enum ThreatLevel {
    low = "low",
    high = "high",
    critical = "critical",
    medium = "medium"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCriminalProfile(profile: CriminalProfile): Promise<void>;
    addDetectionLog(log: DetectionLog): Promise<void>;
    addEvidenceRecord(record: EvidenceRecord): Promise<void>;
    addMissingPerson(person: MissingPerson): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getAllCriminalProfiles(): Promise<Array<CriminalProfile>>;
    getAllDetectionLogs(): Promise<Array<DetectionLog>>;
    getAllEvidenceRecords(): Promise<Array<EvidenceRecord>>;
    getAllMissingPersons(): Promise<Array<MissingPerson>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCriminalProfile(id: string): Promise<CriminalProfile | null>;
    getEvidenceRecord(id: string): Promise<EvidenceRecord | null>;
    getMissingPerson(id: string): Promise<MissingPerson | null>;
    getSystemStats(): Promise<SystemStats>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateCriminalProfile(profile: CriminalProfile): Promise<void>;
    updateMissingPerson(person: MissingPerson): Promise<void>;
}
