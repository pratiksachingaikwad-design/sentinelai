import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import type { Page } from "../App";
import { type CriminalProfile, ThreatLevel } from "../backend";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useActor } from "../hooks/useActor";
import { mockCriminals } from "../lib/mockData";
import { threatColor, threatLabel } from "../lib/threatUtils";

interface Props {
  navigate: (p: Page) => void;
}

export default function CriminalsPage({ navigate }: Props) {
  const { actor } = useActor();
  const [search, setSearch] = useState("");
  const [filterThreat, setFilterThreat] = useState<string>("all");
  const [selected, setSelected] = useState<CriminalProfile | null>(null);

  const { data: criminals = [] } = useQuery({
    queryKey: ["criminals"],
    queryFn: async () => {
      const result = await actor!.getAllCriminalProfiles();
      return result.length > 0 ? result : mockCriminals;
    },
    enabled: !!actor,
  });

  const filtered = criminals.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.nationality.toLowerCase().includes(search.toLowerCase());
    const matchThreat =
      filterThreat === "all" || c.threatLevel === filterThreat;
    return matchSearch && matchThreat;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold font-mono text-[oklch(0.75_0.18_200)] tracking-widest">
          CRIMINAL DATABASE
        </h1>
        <button
          type="button"
          onClick={() => navigate("criminals-new")}
          data-ocid="criminals.add.primary_button"
          className="flex items-center gap-2 text-xs font-mono px-3 py-2 border border-[oklch(0.75_0.18_200_/_0.5)] text-[oklch(0.75_0.18_200)] hover:bg-[oklch(0.75_0.18_200_/_0.1)] rounded transition-all"
        >
          <Plus className="w-3 h-3" /> ADD PROFILE
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[oklch(0.45_0.02_220)]" />
          <input
            data-ocid="criminals.search.input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or nationality..."
            className="w-full pl-8 pr-3 py-2 bg-[oklch(0.13_0.025_240)] border border-[oklch(0.22_0.03_240)] rounded text-xs font-mono text-[oklch(0.8_0.01_220)] placeholder-[oklch(0.35_0.02_220)] focus:outline-none focus:border-[oklch(0.75_0.18_200_/_0.5)]"
          />
        </div>
        <select
          data-ocid="criminals.threat_filter.select"
          value={filterThreat}
          onChange={(e) => setFilterThreat(e.target.value)}
          className="px-3 py-2 bg-[oklch(0.13_0.025_240)] border border-[oklch(0.22_0.03_240)] rounded text-xs font-mono text-[oklch(0.8_0.01_220)] focus:outline-none"
        >
          <option value="all">ALL THREAT LEVELS</option>
          {Object.values(ThreatLevel).map((t) => (
            <option key={t} value={t}>
              {t.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="text-xs font-mono text-[oklch(0.45_0.02_220)] mb-3">
        {filtered.length} PROFILES FOUND
      </div>

      <div className="space-y-2">
        {filtered.map((c, i) => {
          const tc = threatColor(c.threatLevel);
          return (
            <button
              type="button"
              key={c.id}
              data-ocid={`criminals.item.${i + 1}`}
              onClick={() => setSelected(c)}
              className={`border ${tc.border} rounded-lg p-4 cursor-pointer hover:bg-[oklch(0.15_0.025_240)] transition-all flex items-center gap-4 w-full text-left ${tc.bg}`}
            >
              <img
                src={c.photoUrl}
                alt={c.name}
                className="w-12 h-12 rounded border border-[oklch(0.22_0.03_240)]"
              />
              <div className="flex-1">
                <div className="font-mono text-sm font-bold text-[oklch(0.85_0.01_220)]">
                  {c.name}
                </div>
                <div className="text-xs font-mono text-[oklch(0.45_0.02_220)] mt-0.5">
                  {c.nationality} &bull; Age {Number(c.age)} &bull; {c.gender}
                </div>
                {c.aliases.length > 0 && (
                  <div className="text-[10px] font-mono text-[oklch(0.4_0.02_220)] mt-0.5">
                    AKA: {c.aliases.join(", ")}
                  </div>
                )}
              </div>
              <span
                className={`text-xs font-mono px-2 py-1 rounded border ${tc.border} ${tc.text} ${tc.bg}`}
              >
                {threatLabel(c.threatLevel)}
              </span>
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${c.isActive ? "bg-[oklch(0.6_0.28_15)] animate-pulse" : "bg-[oklch(0.35_0.02_220)]"}`}
              />
            </button>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent
          className="bg-[oklch(0.13_0.025_240)] border-[oklch(0.22_0.03_240)] max-w-lg"
          data-ocid="criminals.detail.modal"
        >
          {selected &&
            (() => {
              const tc = threatColor(selected.threatLevel);
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="font-mono text-[oklch(0.75_0.18_200)] tracking-widest">
                      CRIMINAL PROFILE
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex gap-4">
                    <img
                      src={selected.photoUrl}
                      alt={selected.name}
                      className="w-20 h-20 rounded border border-[oklch(0.22_0.03_240)]"
                    />
                    <div>
                      <div className="font-bold font-mono text-[oklch(0.85_0.01_220)] text-lg">
                        {selected.name}
                      </div>
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded border ${tc.border} ${tc.text} ${tc.bg}`}
                      >
                        {threatLabel(selected.threatLevel)}
                      </span>
                      <div className="text-xs font-mono text-[oklch(0.45_0.02_220)] mt-2">
                        {selected.nationality} &bull; {selected.gender} &bull;
                        Age {Number(selected.age)}
                      </div>
                      {selected.aliases.length > 0 && (
                        <div className="text-[10px] font-mono text-[oklch(0.4_0.02_220)] mt-1">
                          AKA: {selected.aliases.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1">
                      CRIMINAL RECORD
                    </div>
                    <div className="text-xs font-mono text-[oklch(0.65_0.01_220)] leading-relaxed border border-[oklch(0.22_0.03_240)] rounded p-3 bg-[oklch(0.1_0.02_240)]">
                      {selected.criminalRecord}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[oklch(0.35_0.02_220)] mt-2">
                    Added:{" "}
                    {format(new Date(Number(selected.createdAt)), "yyyy-MM-dd")}{" "}
                    &bull; Status: {selected.isActive ? "ACTIVE" : "INACTIVE"}
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
