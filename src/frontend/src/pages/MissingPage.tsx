import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInDays, differenceInYears, format } from "date-fns";
import { Brain, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
  const qc = useQueryClient();
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const [editing, setEditing] = useState<MissingPerson | null>(null);
  const [editForm, setEditForm] = useState<
    Partial<MissingPerson> & { dateStr?: string }
  >({});
  const [confirmDelete, setConfirmDelete] = useState<MissingPerson | null>(
    null,
  );

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

  const updateMutation = useMutation({
    mutationFn: async (person: MissingPerson) => {
      await actor!.updateMissingPerson(person);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missing"] });
      toast.success("Report updated");
      setEditing(null);
      setSelected(null);
    },
    onError: (err: unknown) => {
      toast.error(
        `Failed to update: ${err instanceof Error ? err.message : String(err)}`,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await actor!.deleteMissingPerson(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missing"] });
      toast.success("Report deleted");
      setConfirmDelete(null);
      setSelected(null);
    },
    onError: (err: unknown) => {
      toast.error(
        `Failed to delete: ${err instanceof Error ? err.message : String(err)}`,
      );
    },
  });

  function openEdit(p: MissingPerson) {
    setEditing(p);
    setEditForm({
      ...p,
      dateStr: format(new Date(Number(p.dateOfDisappearance)), "yyyy-MM-dd"),
    });
    setSelected(null);
  }

  function saveEdit() {
    if (!editing || !editForm.name) return;
    const updated: MissingPerson = {
      ...editing,
      name: editForm.name ?? editing.name,
      ageAtDisappearance:
        editForm.ageAtDisappearance ?? editing.ageAtDisappearance,
      dateOfDisappearance: editForm.dateStr
        ? BigInt(new Date(editForm.dateStr).getTime())
        : editing.dateOfDisappearance,
      description: editForm.description ?? editing.description,
      reportedBy: editForm.reportedBy ?? editing.reportedBy,
      isFound: editForm.isFound ?? editing.isFound,
    };
    updateMutation.mutate(updated);
  }

  const ef =
    (k: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setEditForm((p) => ({ ...p, [k]: e.target.value }));

  const inputCls =
    "w-full px-3 py-2 bg-[oklch(0.1_0.02_240)] border border-[oklch(0.22_0.03_240)] rounded text-xs font-mono text-[oklch(0.8_0.01_220)] placeholder-[oklch(0.35_0.02_220)] focus:outline-none focus:border-[oklch(0.75_0.18_200_/_0.5)]";

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
          <div
            key={p.id}
            className="border border-[oklch(0.22_0.03_240)] bg-[oklch(0.13_0.025_240)] rounded-lg p-4 hover:border-[oklch(0.65_0.2_200_/_0.5)] transition-all"
          >
            <button
              type="button"
              data-ocid={`missing.item.${i + 1}`}
              onClick={() => setSelected(p)}
              className="w-full text-left"
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
            <div className="flex gap-2 mt-3 pt-3 border-t border-[oklch(0.18_0.025_240)]">
              <button
                type="button"
                onClick={() => openEdit(p)}
                className="flex items-center gap-1.5 flex-1 justify-center py-1.5 text-[10px] font-mono border border-[oklch(0.75_0.18_200_/_0.3)] text-[oklch(0.65_0.15_200)] hover:bg-[oklch(0.75_0.18_200_/_0.08)] rounded transition-all"
              >
                <Pencil className="w-3 h-3" /> EDIT
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(p)}
                className="flex items-center gap-1.5 flex-1 justify-center py-1.5 text-[10px] font-mono border border-[oklch(0.5_0.15_25_/_0.3)] text-[oklch(0.65_0.2_25)] hover:bg-[oklch(0.5_0.15_25_/_0.08)] rounded transition-all"
              >
                <Trash2 className="w-3 h-3" /> DELETE
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(selected)}
                    className="flex items-center gap-2 flex-1 justify-center py-2 border border-[oklch(0.75_0.18_200_/_0.4)] text-[oklch(0.75_0.18_200)] text-xs font-mono rounded hover:bg-[oklch(0.75_0.18_200_/_0.1)] transition-all"
                  >
                    <Pencil className="w-3 h-3" /> EDIT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(selected);
                      setSelected(null);
                    }}
                    className="flex items-center gap-2 flex-1 justify-center py-2 border border-[oklch(0.5_0.15_25_/_0.4)] text-[oklch(0.65_0.2_25)] text-xs font-mono rounded hover:bg-[oklch(0.5_0.15_25_/_0.1)] transition-all"
                  >
                    <Trash2 className="w-3 h-3" /> DELETE
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="bg-[oklch(0.13_0.025_240)] border-[oklch(0.22_0.03_240)] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-[oklch(0.75_0.18_200)] tracking-widest">
              EDIT MISSING PERSON REPORT
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-mp-name"
                    className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                  >
                    FULL NAME *
                  </label>
                  <input
                    id="edit-mp-name"
                    value={editForm.name ?? ""}
                    onChange={ef("name")}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-mp-age"
                    className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                  >
                    AGE AT DISAPPEARANCE
                  </label>
                  <input
                    id="edit-mp-age"
                    type="number"
                    value={
                      editForm.ageAtDisappearance !== undefined
                        ? Number(editForm.ageAtDisappearance)
                        : ""
                    }
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        ageAtDisappearance: BigInt(e.target.value || 0),
                      }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-mp-date"
                    className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                  >
                    DATE OF DISAPPEARANCE
                  </label>
                  <input
                    id="edit-mp-date"
                    type="date"
                    value={editForm.dateStr ?? ""}
                    onChange={ef("dateStr")}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-mp-reporter"
                    className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                  >
                    REPORTED BY
                  </label>
                  <input
                    id="edit-mp-reporter"
                    value={editForm.reportedBy ?? ""}
                    onChange={ef("reportedBy")}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="edit-mp-status"
                  className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                >
                  STATUS
                </label>
                <select
                  id="edit-mp-status"
                  value={editForm.isFound ? "found" : "missing"}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      isFound: e.target.value === "found",
                    }))
                  }
                  className={inputCls}
                >
                  <option value="missing">MISSING</option>
                  <option value="found">FOUND</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="edit-mp-desc"
                  className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                >
                  DESCRIPTION
                </label>
                <textarea
                  id="edit-mp-desc"
                  value={editForm.description ?? ""}
                  onChange={ef("description")}
                  className={`${inputCls} min-h-20 resize-none`}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={!editForm.name || updateMutation.isPending}
                  className="flex-1 py-2 bg-[oklch(0.75_0.18_200_/_0.15)] hover:bg-[oklch(0.75_0.18_200_/_0.25)] border border-[oklch(0.75_0.18_200_/_0.5)] text-[oklch(0.75_0.18_200)] font-mono text-xs tracking-widest rounded transition-all disabled:opacity-50"
                >
                  {updateMutation.isPending ? "SAVING..." : "SAVE CHANGES"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 border border-[oklch(0.22_0.03_240)] text-[oklch(0.5_0.02_220)] font-mono text-xs rounded hover:border-[oklch(0.35_0.03_240)] transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
      >
        <DialogContent className="bg-[oklch(0.13_0.025_240)] border-[oklch(0.22_0.03_240)] max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-[oklch(0.7_0.2_25)] tracking-widest">
              CONFIRM DELETE
            </DialogTitle>
          </DialogHeader>
          {confirmDelete && (
            <div className="space-y-4">
              <p className="text-xs font-mono text-[oklch(0.65_0.01_220)]">
                Delete report for{" "}
                <span className="text-[oklch(0.85_0.01_220)] font-bold">
                  {confirmDelete.name}
                </span>
                ? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(confirmDelete.id)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2 bg-[oklch(0.5_0.15_25_/_0.2)] hover:bg-[oklch(0.5_0.15_25_/_0.3)] border border-[oklch(0.5_0.15_25_/_0.5)] text-[oklch(0.7_0.2_25)] font-mono text-xs tracking-widest rounded transition-all disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "DELETING..." : "DELETE"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 border border-[oklch(0.22_0.03_240)] text-[oklch(0.5_0.02_220)] font-mono text-xs rounded hover:border-[oklch(0.35_0.03_240)] transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
