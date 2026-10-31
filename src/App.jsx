import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ChartLineUp, GearSix, ShieldCheck, Stethoscope, VideoCamera } from "@phosphor-icons/react";
import { AuthProvider } from "@/auth";
import { useAuth } from "@/auth-context";
import { AppShell } from "@/components/app-shell";
import { AnalyseScreen } from "@/screens/analyse";
import { AuthGate } from "@/screens/auth";
import { PageSkeleton } from "@/components/ui/skeleton";

// Screens other than sign-in and upload load on demand (smaller first load).
const ClinicianScreen = lazy(() =>
  import("@/screens/clinician").then((m) => ({ default: m.ClinicianScreen })),
);
const CompareScreen = lazy(() => import("@/screens/compare").then((m) => ({ default: m.CompareScreen })));
const HistoryScreen = lazy(() => import("@/screens/history").then((m) => ({ default: m.HistoryScreen })));
const SessionScreen = lazy(() => import("@/screens/session").then((m) => ({ default: m.SessionScreen })));
const SetupScreen = lazy(() => import("@/screens/setup").then((m) => ({ default: m.SetupScreen })));
const SettingsScreen = lazy(() => import("@/screens/settings").then((m) => ({ default: m.SettingsScreen })));
const PrivacyScreen = lazy(() => import("@/screens/privacy").then((m) => ({ default: m.PrivacyScreen })));
const SharedPage = lazy(() => import("@/screens/shared").then((m) => ({ default: m.SharedPage })));
const ResetPasswordPage = lazy(() =>
  import("@/screens/links").then((m) => ({ default: m.ResetPasswordPage })),
);
const VerifyEmailPage = lazy(() => import("@/screens/links").then((m) => ({ default: m.VerifyEmailPage })));
const DemoPage = lazy(() => import("@/onboarding/welcome").then((m) => ({ default: m.DemoPage })));
const LearnIndex = lazy(() => import("@/screens/learn").then((m) => ({ default: m.LearnIndex })));
const LearnMetric = lazy(() => import("@/screens/learn").then((m) => ({ default: m.LearnMetric })));
const WelcomeScreen = lazy(() => import("@/onboarding/welcome").then((m) => ({ default: m.WelcomeScreen })));

function Loading() {
  return <PageSkeleton />;
}

const PATIENT_SECTIONS = [
  { to: "/", label: "Analyse", icon: VideoCamera, end: true },
  { to: "/history", label: "History", icon: ChartLineUp },
  { to: "/privacy", label: "Privacy", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: GearSix },
];
const CLINICIAN_SECTIONS = [
  { to: "/patients", label: "Patients", icon: Stethoscope },
  { to: "/privacy", label: "Privacy", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: GearSix },
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
            <Route path="/settings" element={<SettingsScreen />} />
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
          <Route path="/settings" element={<SettingsScreen />} />
          {/* Just signed up: the walkthrough; just signed in: the upload page. */}
          <Route path="/signup" element={<Navigate to="/welcome" replace />} />
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
            <Route path="/learn" element={<LearnIndex />} />
            <Route path="/learn/:metric" element={<LearnMetric />} />
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
