import Text "mo:core/Text";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

actor {
  // Mixins
  include MixinStorage();
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Types
  type Timestamp = Time.Time;

  public type ThreatLevel = {
    #low;
    #medium;
    #high;
    #critical;
  };

  public type DetectionType = {
    #knownCriminal;
    #unknownPerson;
    #missingPerson;
  };

  public type CriminalProfile = {
    id : Text;
    name : Text;
    age : Nat;
    gender : Text;
    nationality : Text;
    criminalRecord : Text;
    threatLevel : ThreatLevel;
    photoUrl : Text;
    aliases : [Text];
    isActive : Bool;
    createdAt : Timestamp;
  };

  public type MissingPerson = {
    id : Text;
    name : Text;
    ageAtDisappearance : Nat;
    dateOfDisappearance : Timestamp;
    photoUrl : Text;
    description : Text;
    reportedBy : Text;
    isFound : Bool;
    createdAt : Timestamp;
  };

  public type DetectionLog = {
    id : Text;
    timestamp : Timestamp;
    detectedPersonName : Text;
    matchPercentage : Nat;
    threatLevel : ThreatLevel;
    detectionType : DetectionType;
    activityLabel : Text;
    weaponsDetected : [Text];
    evidencePhotoUrl : ?Text;
    cameraId : Text;
    location : Text;
  };

  public type EvidenceRecord = {
    id : Text;
    detectionLogId : Text;
    blobId : Text;
    timestamp : Timestamp;
    metadata : Text;
  };

  public type UserProfile = {
    name : Text;
  };

  public type SystemStats = {
    totalCriminals : Nat;
    activeAlerts : Nat;
    detectionsToday : Nat;
    missingPersonsCount : Nat;
  };

  // Storage
  let criminals = Map.empty<Text, CriminalProfile>();
  let missingPersons = Map.empty<Text, MissingPerson>();
  let detectionLogs = List.empty<DetectionLog>();
  let evidenceRecords = Map.empty<Text, EvidenceRecord>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Comparison modules
  module DetectionLog {
    public func compare(a : DetectionLog, b : DetectionLog) : Order.Order {
      Int.compare(b.timestamp, a.timestamp);
    };
  };

  // Helper: any logged-in (non-anonymous) principal is authorized.
  func isAuthorized(caller : Principal) : Bool {
    not caller.isAnonymous();
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not isAuthorized(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.add(caller, profile);
  };

  // Criminal Profile CRUD Operations
  public shared ({ caller }) func addCriminalProfile(profile : CriminalProfile) : async () {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to add criminal profiles");
    };
    criminals.add(profile.id, profile);
  };

  public shared ({ caller }) func updateCriminalProfile(profile : CriminalProfile) : async () {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to update criminal profiles");
    };
    criminals.add(profile.id, profile);
  };

  public shared ({ caller }) func deleteCriminalProfile(id : Text) : async () {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to delete criminal profiles");
    };
    criminals.remove(id);
  };

  public query ({ caller }) func getCriminalProfile(id : Text) : async ?CriminalProfile {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized");
    };
    criminals.get(id);
  };

  public query ({ caller }) func getAllCriminalProfiles() : async [CriminalProfile] {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized");
    };
    criminals.values().toArray();
  };

  // Missing Person CRUD Operations
  public shared ({ caller }) func addMissingPerson(person : MissingPerson) : async () {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to add missing persons");
    };
    missingPersons.add(person.id, person);
  };

  public shared ({ caller }) func updateMissingPerson(person : MissingPerson) : async () {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to update missing persons");
    };
    missingPersons.add(person.id, person);
  };

  public shared ({ caller }) func deleteMissingPerson(id : Text) : async () {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to delete missing persons");
    };
    missingPersons.remove(id);
  };

  public query ({ caller }) func getMissingPerson(id : Text) : async ?MissingPerson {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized");
    };
    missingPersons.get(id);
  };

  public query ({ caller }) func getAllMissingPersons() : async [MissingPerson] {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized");
    };
    missingPersons.values().toArray();
  };

  // Detection Log Operations
  public shared ({ caller }) func addDetectionLog(log : DetectionLog) : async () {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized");
    };
    detectionLogs.add(log);
  };

  public query ({ caller }) func getAllDetectionLogs() : async [DetectionLog] {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized");
    };
    detectionLogs.toArray().sort();
  };

  // Evidence Record Operations
  public shared ({ caller }) func addEvidenceRecord(record : EvidenceRecord) : async () {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized");
    };
    evidenceRecords.add(record.id, record);
  };

  public query ({ caller }) func getEvidenceRecord(id : Text) : async ?EvidenceRecord {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized");
    };
    evidenceRecords.get(id);
  };

  public query ({ caller }) func getAllEvidenceRecords() : async [EvidenceRecord] {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized");
    };
    evidenceRecords.values().toArray();
  };

  // System Statistics
  public query ({ caller }) func getSystemStats() : async SystemStats {
    if (not isAuthorized(caller)) {
      Runtime.trap("Unauthorized");
    };

    let totalCriminals = criminals.size();
    let missingPersonsCount = missingPersons.size();

    let now = Time.now();
    let oneDayNanos : Int = 24 * 60 * 60 * 1_000_000_000;
    let yesterday = now - oneDayNanos;

    var activeAlerts = 0;
    var detectionsToday = 0;

    for (log in detectionLogs.toArray().vals()) {
      if (log.timestamp >= yesterday) {
        detectionsToday += 1;
        switch (log.threatLevel) {
          case (#high or #critical) {
            activeAlerts += 1;
          };
          case _ {};
        };
      };
    };

    {
      totalCriminals = totalCriminals;
      activeAlerts = activeAlerts;
      detectionsToday = detectionsToday;
      missingPersonsCount = missingPersonsCount;
    };
  };
};
