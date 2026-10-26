import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeft, CaretRight, Copy, Plus } from "@phosphor-icons/react";
import { API, formatDate } from "@/api";
import { Button } from "@/components/ui/button";
import { CadenceTrend } from "@/measurements";
import { EmptyState, SessionList } from "@/screens/history";

function Skeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function PatientDetail({ patient, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/clinician/patients/${patient.patient_id}/sessions`);
        setData(res.data);
      } catch {
        /* the list stays empty; error states arrive with TanStack Query (ADR-008) */
      }
      setLoading(false);
    })();
  }, [patient.patient_id]);

  const sessions = data?.sessions ?? [];
  return (
    <div className="flex flex-col gap-6">
      <Button variant="outline" size="sm" className="self-start" onClick={onBack}>
        <ArrowLeft aria-hidden />
        Back to patients
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{patient.name}</h1>
        <p className="text-sm text-muted-foreground">
          {patient.email} · {patient.session_count} session{patient.session_count !== 1 ? "s" : ""}
        </p>
      </div>
      {loading && <Skeleton />}
      {!loading && <CadenceTrend sessions={sessions} />}
      {!loading && sessions.length > 0 && <SessionList sessions={sessions} />}
      {!loading && sessions.length === 0 && <EmptyState title="No sessions yet for this patient." />}
    </div>
  );
}

export function ClinicianScreen() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/clinician/patients`);
        setPatients(res.data);
      } catch {
        setPatients([]);
      }
      setLoading(false);
    })();
  }, []);

  const generateInvite = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/clinician/invite`, {});
      setInviteCode(res.data.code);
    } catch {
      /* no code is shown; error states arrive with TanStack Query (ADR-008) */
    }
    setGenerating(false);
  };

  if (selected) return <PatientDetail patient={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your patients</h1>
          <p className="text-sm text-muted-foreground">
            {patients.length} patient{patients.length !== 1 ? "s" : ""} linked to your account
          </p>
        </div>
        <Button onClick={generateInvite} disabled={generating}>
          <Plus aria-hidden />
          {generating ? "Generating..." : "Invite patient"}
        </Button>
      </div>

      {inviteCode && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-primary-soft px-5 py-4">
          <div>
            <p className="text-sm font-medium">Invite code: share it with your patient</p>
            <p className="tabular mt-1 text-3xl font-semibold tracking-[0.3em] text-primary">{inviteCode}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              They enter it under History, in Share with a clinician.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(inviteCode)}>
            <Copy aria-hidden />
            Copy
          </Button>
        </div>
      )}

      {loading && <Skeleton />}
      {!loading && patients.length === 0 && (
        <EmptyState title="No patients yet.">
          Use Invite patient to create a code and share it with your first patient.
        </EmptyState>
      )}
      {!loading && patients.length > 0 && (
        <ul className="divide-y rounded-lg border bg-surface">
          {patients.map((p) => (
            <li key={p.patient_id}>
              <button
                type="button"
                onClick={() => setSelected(p)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{p.email}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.session_count} session{p.session_count !== 1 ? "s" : ""}
                    {p.latest_session_at && `, latest ${formatDate(p.latest_session_at, false)}`}
                  </span>
                </span>
                <CaretRight className="shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
