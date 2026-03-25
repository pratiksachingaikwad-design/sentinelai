import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { ThreatLevel } from "../backend";
import { createActorWithConfig } from "../config";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { compressImage } from "../utils/imageUtils";

interface Props {
  navigate: (p: Page) => void;
}

export default function AddCriminalPage({ navigate }: Props) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    nationality: "",
    criminalRecord: "",
    threatLevel: ThreatLevel.medium,
    photoUrl: "",
    aliases: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      // Use cached actor or create a fresh one directly with the identity
      let activeActor = actor;
      if (!activeActor) {
        if (!identity)
          throw new Error("Not logged in. Please refresh and try again.");
        try {
          activeActor = await createActorWithConfig({
            agentOptions: { identity },
          });
        } catch (e) {
          throw new Error(`Could not connect to backend: ${String(e)}`);
        }
      }

      const profile = {
        id: Math.random().toString(36).slice(2),
        name: form.name,
        age: BigInt(form.age || 0),
        gender: form.gender,
        nationality: form.nationality,
        criminalRecord: form.criminalRecord,
        threatLevel: form.threatLevel as ThreatLevel,
        photoUrl:
          form.photoUrl ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${form.name}`,
        aliases: form.aliases
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        isActive: true,
        createdAt: BigInt(Date.now()),
      };

      await activeActor.addCriminalProfile(profile);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["criminals"] });
      toast.success("Criminal profile added");
      navigate("criminals");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[AddCriminal] Error:", msg);
      toast.error(`Failed to add criminal: ${msg}`);
    },
  });

  const f =
    (k: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhotoPreview(compressed);
      setForm((p) => ({ ...p, photoUrl: compressed }));
    } catch {
      toast.error("Failed to process image");
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setForm((p) => ({ ...p, photoUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const inputCls =
    "w-full px-3 py-2 bg-[oklch(0.1_0.02_240)] border border-[oklch(0.22_0.03_240)] rounded text-xs font-mono text-[oklch(0.8_0.01_220)] placeholder-[oklch(0.35_0.02_220)] focus:outline-none focus:border-[oklch(0.75_0.18_200_/_0.5)]";

  return (
    <div className="p-6 max-w-xl">
      <button
        type="button"
        onClick={() => navigate("criminals")}
        data-ocid="add_criminal.back.button"
        className="flex items-center gap-2 text-xs font-mono text-[oklch(0.55_0.02_220)] hover:text-[oklch(0.75_0.18_200)] mb-4 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" /> BACK
      </button>
      <h1 className="text-lg font-bold font-mono text-[oklch(0.75_0.18_200)] tracking-widest mb-6">
        ADD CRIMINAL PROFILE
      </h1>

      {isFetching && (
        <p className="text-[10px] font-mono text-[oklch(0.55_0.1_200)] mb-3">
          Connecting to backend...
        </p>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="criminal-name"
              className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
            >
              FULL NAME *
            </label>
            <input
              id="criminal-name"
              data-ocid="add_criminal.name.input"
              value={form.name}
              onChange={f("name")}
              className={inputCls}
              placeholder="Full name"
            />
          </div>
          <div>
            <label
              htmlFor="criminal-age"
              className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
            >
              AGE
            </label>
            <input
              id="criminal-age"
              data-ocid="add_criminal.age.input"
              type="number"
              value={form.age}
              onChange={f("age")}
              className={inputCls}
              placeholder="Age"
            />
          </div>
          <div>
            <label
              htmlFor="criminal-gender"
              className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
            >
              GENDER
            </label>
            <select
              id="criminal-gender"
              data-ocid="add_criminal.gender.select"
              value={form.gender}
              onChange={f("gender")}
              className={inputCls}
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="criminal-nationality"
              className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
            >
              NATIONALITY
            </label>
            <input
              id="criminal-nationality"
              data-ocid="add_criminal.nationality.input"
              value={form.nationality}
              onChange={f("nationality")}
              className={inputCls}
              placeholder="Nationality"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="criminal-threat"
            className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
          >
            THREAT LEVEL
          </label>
          <select
            id="criminal-threat"
            data-ocid="add_criminal.threat.select"
            value={form.threatLevel}
            onChange={f("threatLevel")}
            className={inputCls}
          >
            {Object.values(ThreatLevel).map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="criminal-record"
            className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
          >
            CRIMINAL RECORD
          </label>
          <textarea
            id="criminal-record"
            data-ocid="add_criminal.record.textarea"
            value={form.criminalRecord}
            onChange={f("criminalRecord")}
            className={`${inputCls} min-h-24 resize-none`}
            placeholder="List of offenses, dates, sentences..."
          />
        </div>
        <div>
          <label
            htmlFor="criminal-aliases"
            className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
          >
            ALIASES (comma separated)
          </label>
          <input
            id="criminal-aliases"
            data-ocid="add_criminal.aliases.input"
            value={form.aliases}
            onChange={f("aliases")}
            className={inputCls}
            placeholder="Nickname, alias1, alias2"
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label
            htmlFor="criminal-photo-upload"
            className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
          >
            PHOTO / FACE IMAGE
          </label>
          <input
            id="criminal-photo-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handlePhotoChange}
          />
          {photoPreview ? (
            <div className="flex items-center gap-3 p-3 bg-[oklch(0.1_0.02_240)] border border-[oklch(0.22_0.03_240)] rounded">
              <img
                src={photoPreview}
                alt="Preview"
                className="h-20 w-20 object-cover rounded border border-[oklch(0.3_0.05_200)]"
              />
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono text-[oklch(0.6_0.15_200)]">
                  IMAGE LOADED
                </span>
                <button
                  type="button"
                  data-ocid="add_criminal.photo.upload_button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 text-[10px] font-mono bg-[oklch(0.75_0.18_200_/_0.1)] hover:bg-[oklch(0.75_0.18_200_/_0.2)] border border-[oklch(0.75_0.18_200_/_0.4)] text-[oklch(0.75_0.18_200)] rounded transition-all"
                >
                  CHANGE
                </button>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono bg-[oklch(0.3_0.15_25_/_0.1)] hover:bg-[oklch(0.3_0.15_25_/_0.2)] border border-[oklch(0.5_0.15_25_/_0.4)] text-[oklch(0.65_0.15_25)] rounded transition-all"
                >
                  <X className="w-2.5 h-2.5" /> REMOVE
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              data-ocid="add_criminal.photo.dropzone"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 px-3 py-6 bg-[oklch(0.1_0.02_240)] border border-dashed border-[oklch(0.35_0.05_200)] rounded hover:border-[oklch(0.55_0.12_200)] hover:bg-[oklch(0.12_0.03_240)] transition-all cursor-pointer group"
            >
              <Camera className="w-6 h-6 text-[oklch(0.4_0.05_200)] group-hover:text-[oklch(0.6_0.12_200)] transition-colors" />
              <span className="text-[10px] font-mono text-[oklch(0.4_0.05_220)] group-hover:text-[oklch(0.6_0.1_220)] tracking-widest transition-colors">
                CLICK TO UPLOAD PHOTO
              </span>
              <span className="text-[9px] font-mono text-[oklch(0.3_0.02_220)]">
                JPG, PNG, WEBP, GIF
              </span>
            </button>
          )}
          <p className="mt-1 text-[9px] font-mono text-[oklch(0.35_0.03_220)]">
            Upload a clear frontal face photo for recognition accuracy
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            data-ocid="add_criminal.submit.primary_button"
            onClick={() => mutation.mutate()}
            disabled={!form.name || mutation.isPending}
            className="flex-1 py-2 bg-[oklch(0.75_0.18_200_/_0.15)] hover:bg-[oklch(0.75_0.18_200_/_0.25)] border border-[oklch(0.75_0.18_200_/_0.5)] text-[oklch(0.75_0.18_200)] font-mono text-xs tracking-widest rounded transition-all disabled:opacity-50"
          >
            {mutation.isPending ? "SAVING..." : "ADD PROFILE"}
          </button>
          <button
            type="button"
            data-ocid="add_criminal.cancel.cancel_button"
            onClick={() => navigate("criminals")}
            className="px-4 py-2 border border-[oklch(0.22_0.03_240)] text-[oklch(0.5_0.02_220)] font-mono text-xs rounded hover:border-[oklch(0.35_0.03_240)] transition-all"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
