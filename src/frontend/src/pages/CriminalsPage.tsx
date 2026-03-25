import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterThreat, setFilterThreat] = useState<string>("all");
  const [selected, setSelected] = useState<CriminalProfile | null>(null);
  const [editing, setEditing] = useState<CriminalProfile | null>(null);
  const [editForm, setEditForm] = useState<
    Partial<CriminalProfile> & { aliasesStr?: string }
  >({});
  const [confirmDelete, setConfirmDelete] = useState<CriminalProfile | null>(
    null,
  );

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

  const updateMutation = useMutation({
    mutationFn: async (profile: CriminalProfile) => {
      await actor!.updateCriminalProfile(profile);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["criminals"] });
      toast.success("Profile updated");
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
      await actor!.deleteCriminalProfile(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["criminals"] });
      toast.success("Profile deleted");
      setConfirmDelete(null);
      setSelected(null);
    },
    onError: (err: unknown) => {
      toast.error(
        `Failed to delete: ${err instanceof Error ? err.message : String(err)}`,
      );
    },
  });

  function openEdit(c: CriminalProfile) {
    setEditing(c);
    setEditForm({
      ...c,
      aliasesStr: c.aliases.join(", "),
    });
    setSelected(null);
  }

  function saveEdit() {
    if (!editing || !editForm.name) return;
    const updated: CriminalProfile = {
      ...editing,
      name: editForm.name ?? editing.name,
      age: editForm.age ?? editing.age,
      gender: editForm.gender ?? editing.gender,
      nationality: editForm.nationality ?? editing.nationality,
      criminalRecord: editForm.criminalRecord ?? editing.criminalRecord,
      threatLevel: editForm.threatLevel ?? editing.threatLevel,
      photoUrl: editForm.photoUrl ?? editing.photoUrl,
      isActive: editForm.isActive ?? editing.isActive,
      aliases: (editForm.aliasesStr ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
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
            <div
              key={c.id}
              className={`border ${tc.border} rounded-lg p-4 flex items-center gap-4 ${tc.bg}`}
            >
              <button
                type="button"
                data-ocid={`criminals.item.${i + 1}`}
                onClick={() => setSelected(c)}
                className="flex items-center gap-4 flex-1 text-left"
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
              <div className="flex gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  title="Edit profile"
                  className="p-1.5 text-[oklch(0.55_0.12_200)] hover:text-[oklch(0.75_0.18_200)] hover:bg-[oklch(0.75_0.18_200_/_0.1)] rounded transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(c)}
                  title="Delete profile"
                  className="p-1.5 text-[oklch(0.55_0.15_25)] hover:text-[oklch(0.7_0.2_25)] hover:bg-[oklch(0.6_0.2_25_/_0.1)] rounded transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
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
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => openEdit(selected)}
                      className="flex items-center gap-2 flex-1 justify-center py-2 border border-[oklch(0.75_0.18_200_/_0.4)] text-[oklch(0.75_0.18_200)] text-xs font-mono rounded hover:bg-[oklch(0.75_0.18_200_/_0.1)] transition-all"
                    >
                      <Pencil className="w-3 h-3" /> EDIT PROFILE
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
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="bg-[oklch(0.13_0.025_240)] border-[oklch(0.22_0.03_240)] max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-[oklch(0.75_0.18_200)] tracking-widest">
              EDIT CRIMINAL PROFILE
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-crim-name"
                    className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                  >
                    FULL NAME *
                  </label>
                  <input
                    id="edit-crim-name"
                    value={editForm.name ?? ""}
                    onChange={ef("name")}
                    className={inputCls}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-crim-age"
                    className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                  >
                    AGE
                  </label>
                  <input
                    id="edit-crim-age"
                    type="number"
                    value={
                      editForm.age !== undefined ? Number(editForm.age) : ""
                    }
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        age: BigInt(e.target.value || 0),
                      }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-crim-gender"
                    className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                  >
                    GENDER
                  </label>
                  <select
                    id="edit-crim-gender"
                    value={editForm.gender ?? ""}
                    onChange={ef("gender")}
                    className={inputCls}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-crim-nationality"
                    className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                  >
                    NATIONALITY
                  </label>
                  <input
                    id="edit-crim-nationality"
                    value={editForm.nationality ?? ""}
                    onChange={ef("nationality")}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="edit-crim-threat"
                  className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                >
                  THREAT LEVEL
                </label>
                <select
                  id="edit-crim-threat"
                  value={editForm.threatLevel ?? ""}
                  onChange={ef("threatLevel")}
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
                  htmlFor="edit-crim-record"
                  className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                >
                  CRIMINAL RECORD
                </label>
                <textarea
                  id="edit-crim-record"
                  value={editForm.criminalRecord ?? ""}
                  onChange={ef("criminalRecord")}
                  className={`${inputCls} min-h-20 resize-none`}
                />
              </div>
              <div>
                <label
                  htmlFor="edit-crim-aliases"
                  className="block text-[10px] font-mono text-[oklch(0.45_0.02_220)] tracking-widest mb-1"
                >
                  ALIASES (comma separated)
                </label>
                <input
                  id="edit-crim-aliases"
                  value={editForm.aliasesStr ?? ""}
                  onChange={ef("aliasesStr")}
                  className={inputCls}
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
                Delete profile for{" "}
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
