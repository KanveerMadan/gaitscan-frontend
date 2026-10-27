import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ChartLineUp, ShieldCheck, Stethoscope, VideoCamera } from "@phosphor-icons/react";
import { AuthProvider } from "@/auth";
import { useAuth } from "@/auth-context";
import { AppShell } from "@/components/app-shell";
import { AnalyseScreen } from "@/screens/analyse";
import { AuthGate } from "@/screens/auth";

// Screens other than sign-in and upload load on demand (smaller first load).
const ClinicianScreen = lazy(() =>
  import("@/screens/clinician").then((m) => ({ default: m.ClinicianScreen })),
);
const CompareScreen = lazy(() => import("@/screens/compare").then((m) => ({ default: m.CompareScreen })));
const HistoryScreen = lazy(() => import("@/screens/history").then((m) => ({ default: m.HistoryScreen })));
const SessionScreen = lazy(() => import("@/screens/session").then((m) => ({ default: m.SessionScreen })));
const SetupScreen = lazy(() => import("@/screens/setup").then((m) => ({ default: m.SetupScreen })));
const PrivacyScreen = lazy(() => import("@/screens/privacy").then((m) => ({ default: m.PrivacyScreen })));
const SharedPage = lazy(() => import("@/screens/shared").then((m) => ({ default: m.SharedPage })));
const ResetPasswordPage = lazy(() =>
  import("@/screens/links").then((m) => ({ default: m.ResetPasswordPage })),
);
const VerifyEmailPage = lazy(() => import("@/screens/links").then((m) => ({ default: m.VerifyEmailPage })));
const DemoPage = lazy(() => import("@/onboarding/welcome").then((m) => ({ default: m.DemoPage })));
const WelcomeScreen = lazy(() => import("@/onboarding/welcome").then((m) => ({ default: m.WelcomeScreen })));

function Loading() {
  return <div className="h-40 animate-pulse rounded-lg bg-muted" aria-label="Loading" />;
}

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
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/patients" element={<ClinicianScreen />} />
            <Route path="/privacy" element={<PrivacyScreen />} />
            <Route path="*" element={<Navigate to="/patients" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    );
  }
  return (
    <AppShell sections={PATIENT_SECTIONS}>
      <Suspense fallback={<Loading />}>
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
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/shared" element={<SharedPage />} />
            <Route
              path="*"
              element={
                <AuthGate>
                  <MainApp />
                </AuthGate>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
