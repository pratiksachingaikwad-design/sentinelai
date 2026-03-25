import { useQuery } from "@tanstack/react-query";
import { differenceInDays, differenceInYears, format } from "date-fns";
import { Brain, Clock, Plus } from "lucide-react";
import { useState } from "react";
import type { Page } from "../App";
import type { MissingPerson } from "../backend";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useActor } from "../hooks/useActor";
import { mockMissingPersons } from "../lib/mockData";

interface Props {
  navigate: (p: Page) => void;
}

export default function MissingPage({ navigate }: Props) {
  const { actor } = useActor();
  const [selected, setSelected] = useState<MissingPerson | null>(null);

  const { data: persons = [] } = useQuery({
    queryKey: ["missing"],
    queryFn: async () => {
      const result = await actor!.getAllMissingPersons();
      return result.length > 0 ? result : mockMissingPersons;
    },
    enabled: !!actor,
  });

  function estimatedAge(p: MissingPerson) {
    const yearsGone = differenceInYears(
      new Date(),
      new Date(Number(p.dateOfDisappearance)),
    );
    return Number(p.ageAtDisappearance) + yearsGone;
  }

  function daysMissing(p: MissingPerson) {
    return differenceInDays(
      new Date(),
      new Date(Number(p.dateOfDisappearance)),
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold font-mono text-[oklch(0.75_0.18_200)] tracking-widest">
          MISSING PERSONS
        </h1>
        <button
          type="button"
          onClick={() => navigate("missing-new")}
          data-ocid="missing.add.primary_button"
          className="flex items-center gap-2 text-xs font-mono px-3 py-2 border border-[oklch(0.75_0.18_200_/_0.5)] text-[oklch(0.75_0.18_200)] hover:bg-[oklch(0.75_0.18_200_/_0.1)] rounded transition-all"
        >
          <Plus className="w-3 h-3" /> ADD REPORT
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {persons.map((p, i) => (
          <button
            type="button"
            key={p.id}
            data-ocid={`missing.item.${i + 1}`}
            onClick={() => setSelected(p)}
            className="border border-[oklch(0.22_0.03_240)] bg-[oklch(0.13_0.025_240)] rounded-lg p-4 cursor-pointer hover:border-[oklch(0.65_0.2_200_/_0.5)] transition-all text-left w-full"
          >
            <div className="flex gap-3 mb-3">
              <img
                src={p.photoUrl}
                alt={p.name}
                className="w-16 h-16 rounded border border-[oklch(0.22_0.03_240)]"
              />
              <div>
                <div className="font-bold font-mono text-sm text-[oklch(0.85_0.01_220)]">
                  {p.name}
                </div>
                <div
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded mt-1 inline-block ${p.isFound ? "text-[oklch(0.65_0.18_145)] bg-[oklch(0.55_0.18_145_/_0.15)]" : "text-[oklch(0.65_0.25_35)] bg-[oklch(0.55_0.25_35_/_0.15)]"}`}
                >
                  {p.isFound ? "FOUND" : "MISSING"}
                </div>
              </div>
            </div>
            <div className="space-y-1 text-[10px] font-mono">
              <div className="flex justify-between">
                <span className="text-[oklch(0.45_0.02_220)]">
                  AGE AT DISAPPEARANCE
                </span>
                <span className="text-[oklch(0.7_0.01_220)]">
                  {Number(p.ageAtDisappearance)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[oklch(0.45_0.02_220)]">
                  EST. CURRENT AGE
                </span>
                <span className="text-[oklch(0.75_0.18_200)] font-bold">
                  {estimatedAge(p)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-[oklch(0.65_0.25_35)]">
                <Clock className="w-3 h-3" />
                {daysMissing(p)} days missing
              </div>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent
          className="bg-[oklch(0.13_0.025_240)] border-[oklch(0.22_0.03_240)] max-w-md"
          data-ocid="missing.detail.modal"
        >
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-[oklch(0.75_0.18_200)] tracking-widest">
                  MISSING PERSON FILE
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="text-center">
                    <img
                      src={selected.photoUrl}
                      alt={selected.name}
                      className="w-20 h-20 rounded border-2 border-[oklch(0.22_0.03_240)]"
                    />
                    <div className="text-[9px] font-mono text-[oklch(0.45_0.02_220)] mt-1">
                      LAST KNOWN
                    </div>
                    <div className="text-[10px] font-mono text-[oklch(0.7_0.01_220)]">
                      Age {Number(selected.ageAtDisappearance)}
                    </div>
                  </div>
                  <div className="flex items-center text-2xl text-[oklch(0.75_0.18_200)] font-mono">
                    &rarr;
                  </div>
                  <div className="text-center border border-[oklch(0.65_0.2_200_/_0.3)] rounded p-3 bg-[oklch(0.65_0.2_200_/_0.05)] flex-1">
                    <Brain className="w-6 h-6 text-[oklch(0.75_0.18_200)] mx-auto mb-1" />
                    <div className="text-[9px] font-mono text-[oklch(0.55_0.02_220)]">
                      AI AGE PROGRESSION
                    </div>
                    <div className="text-3xl font-bold font-mono text-[oklch(0.75_0.18_200)] mt-1">
                      {estimatedAge(selected)}
                    </div>
                    <div className="text-[9px] font-mono text-[oklch(0.45_0.02_220)]">
                      ESTIMATED CURRENT AGE
                    </div>
                  </div>
                </div>
                <div className="border border-[oklch(0.22_0.03_240)] rounded p-3 bg-[oklch(0.1_0.02_240)] space-y-2 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-[oklch(0.45_0.02_220)]">NAME</span>
                    <span className="text-[oklch(0.8_0.01_220)]">
                      {selected.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[oklch(0.45_0.02_220)]">
                      MISSING SINCE
                    </span>
                    <span className="text-[oklch(0.8_0.01_220)]">
                      {format(
                        new Date(Number(selected.dateOfDisappearance)),
                        "yyyy-MM-dd",
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[oklch(0.45_0.02_220)]">
                      DAYS MISSING
                    </span>
                    <span className="text-[oklch(0.65_0.25_35)]">
                      {differenceInDays(
                        new Date(),
                        new Date(Number(selected.dateOfDisappearance)),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[oklch(0.45_0.02_220)]">
                      REPORTED BY
                    </span>
                    <span className="text-[oklch(0.8_0.01_220)]">
                      {selected.reportedBy}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[oklch(0.45_0.02_220)]">STATUS</span>
                    <span
                      className={
                        selected.isFound
                          ? "text-[oklch(0.65_0.18_145)]"
                          : "text-[oklch(0.65_0.25_35)]"
                      }
                    >
                      {selected.isFound ? "FOUND" : "MISSING"}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-[oklch(0.45_0.02_220)] mb-1">
                    DESCRIPTION
                  </div>
                  <div className="text-xs font-mono text-[oklch(0.65_0.01_220)] leading-relaxed">
                    {selected.description}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
