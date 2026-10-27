import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ChartLineUp, ShieldCheck, Stethoscope, VideoCamera } from "@phosphor-icons/react";
import { AuthProvider } from "@/auth";
import { useAuth } from "@/auth-context";
import { AppShell } from "@/components/app-shell";
import { AnalyseScreen } from "@/screens/analyse";
import { AuthGate } from "@/screens/auth";
import { ClinicianScreen } from "@/screens/clinician";
import { CompareScreen } from "@/screens/compare";
import { HistoryScreen } from "@/screens/history";
import { SessionScreen } from "@/screens/session";
import { SetupScreen } from "@/screens/setup";
import { ResetPasswordPage, VerifyEmailPage } from "@/screens/links";
import { PrivacyScreen } from "@/screens/privacy";
import { DemoPage, WelcomeScreen } from "@/onboarding/welcome";

const PATIENT_SECTIONS = [
  { to: "/", label: "Analyse", icon: VideoCamera, end: true },
  { to: "/history", label: "History", icon: ChartLineUp },
  { to: "/privacy", label: "Privacy", icon: ShieldCheck },
];
const CLINICIAN_SECTIONS = [
  { to: "/patients", label: "Patients", icon: Stethoscope },
  { to: "/privacy", label: "Privacy", icon: ShieldCheck },
];

function MainApp() {
  const { user } = useAuth();
  if (user?.role === "clinician") {
    return (
      <AppShell sections={CLINICIAN_SECTIONS}>
        <Routes>
          <Route path="/patients" element={<ClinicianScreen />} />
          <Route path="/privacy" element={<PrivacyScreen />} />
          <Route path="*" element={<Navigate to="/patients" replace />} />
        </Routes>
      </AppShell>
    );
  }
  return (
    <AppShell sections={PATIENT_SECTIONS}>
      <Routes>
        <Route path="/" element={<AnalyseScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/sessions/:id" element={<SessionScreen />} />
        <Route path="/compare/:a/:b" element={<CompareScreen />} />
        <Route path="/setup" element={<SetupScreen />} />
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/privacy" element={<PrivacyScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route
            path="*"
            element={
              <AuthGate>
                <MainApp />
              </AuthGate>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
