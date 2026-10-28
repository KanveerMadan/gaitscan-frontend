import { useState } from "react";
import { ChartLineUp, Stethoscope, VideoCamera } from "@phosphor-icons/react";
import { AuthProvider } from "@/auth";
import { useAuth } from "@/auth-context";
import { AppShell } from "@/components/app-shell";
import { AnalyseScreen } from "@/screens/analyse";
import { AuthGate } from "@/screens/auth";
import { ClinicianScreen } from "@/screens/clinician";
import { HistoryScreen } from "@/screens/history";

const PATIENT_SECTIONS = [
  { key: "analyse", label: "Analyse", icon: VideoCamera },
  { key: "history", label: "History", icon: ChartLineUp },
];
const CLINICIAN_SECTIONS = [{ key: "patients", label: "Patients", icon: Stethoscope }];

function MainApp() {
  const { user } = useAuth();
  const clinician = user?.role === "clinician";
  const [tab, setTab] = useState(clinician ? "patients" : "analyse");
  return (
    <AppShell sections={clinician ? CLINICIAN_SECTIONS : PATIENT_SECTIONS} current={tab} onSelect={setTab}>
      {clinician && <ClinicianScreen />}
      {!clinician && tab === "analyse" && <AnalyseScreen />}
      {!clinician && tab === "history" && <HistoryScreen />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <MainApp />
      </AuthGate>
    </AuthProvider>
  );
}
