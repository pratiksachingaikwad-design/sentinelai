import { Eye, Lock, Shield } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login } = useInternetIdentity();

  return (
    <div className="min-h-screen bg-[oklch(0.09_0.02_240)] flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.75 0.18 200) 1px, transparent 1px), linear-gradient(90deg, oklch(0.75 0.18 200) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
      <div className="absolute left-0 right-0 h-px bg-[oklch(0.75_0.18_200_/_0.3)] animate-scan pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div
          className="border border-[oklch(0.75_0.18_200_/_0.3)] bg-[oklch(0.12_0.025_240_/_0.95)] rounded-lg p-8"
          style={{ boxShadow: "0 0 40px oklch(0.75 0.18 200 / 0.15)" }}
        >
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 border-2 border-[oklch(0.75_0.18_200)] rounded-full flex items-center justify-center bg-[oklch(0.75_0.18_200_/_0.1)]">
                <Shield className="w-8 h-8 text-[oklch(0.75_0.18_200)]" />
              </div>
            </div>
            <h1 className="text-2xl font-bold font-mono text-[oklch(0.75_0.18_200)] tracking-widest">
              SENTINELAI
            </h1>
            <p className="text-[oklch(0.5_0.02_220)] text-xs font-mono tracking-widest mt-1">
              CRIMINAL RECOGNITION SYSTEM v3.2
            </p>
          </div>

          <div className="flex gap-4 mb-6 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[oklch(0.65_0.18_145)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.65_0.18_145)] animate-pulse" />
              SYSTEM ONLINE
            </div>
            <div className="flex items-center gap-1.5 text-[oklch(0.65_0.18_145)]">
              <Eye className="w-3 h-3" />
              MONITORING ACTIVE
            </div>
          </div>

          <div className="space-y-2 mb-6 text-xs font-mono text-[oklch(0.45_0.02_220)]">
            {[
              "Face Recognition: ENABLED",
              "Weapon Detection: ENABLED",
              "Behavioral Analysis: ENABLED",
            ].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[oklch(0.75_0.18_200)] rounded-full" />
                {s}
              </div>
            ))}
          </div>

          <button
            type="button"
            data-ocid="login.primary_button"
            onClick={login}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[oklch(0.75_0.18_200_/_0.15)] hover:bg-[oklch(0.75_0.18_200_/_0.25)] border border-[oklch(0.75_0.18_200_/_0.5)] hover:border-[oklch(0.75_0.18_200)] text-[oklch(0.75_0.18_200)] font-mono text-sm tracking-widest rounded transition-all"
          >
            <Lock className="w-4 h-4" />
            AUTHENTICATE VIA INTERNET IDENTITY
          </button>

          <p className="text-center text-[10px] text-[oklch(0.4_0.02_220)] font-mono mt-4">
            AUTHORIZED PERSONNEL ONLY &bull; ALL ACCESS LOGGED
          </p>
        </div>
      </div>
    </div>
  );
}
