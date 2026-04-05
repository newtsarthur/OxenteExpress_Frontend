import React, { useReducer } from "react";
import { AuthProvider, useAuth, PENDING_RIDER_VEHICLE_KEY } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import LoginPage from "@/pages/LoginPage";
import StoreDashboard from "@/pages/StoreDashboard";
import RiderDashboard from "@/pages/RiderDashboard";
import CustomerDashboard from "@/pages/CustomerDashboard";
import RegisterWizard from "@/components/auth/RegisterWizard";

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  if (!isAuthenticated || !user) return <LoginPage />;

  const pendingVehicle =
    user.role === "rider" && typeof sessionStorage !== "undefined" && sessionStorage.getItem(PENDING_RIDER_VEHICLE_KEY) === "1";

  if (pendingVehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md">
          <RegisterWizard
            mode="vehicle-only"
            onDone={() => {
              sessionStorage.removeItem(PENDING_RIDER_VEHICLE_KEY);
              rerender();
            }}
          />
        </div>
      </div>
    );
  }

  switch (user.role) {
    case "store":
      return <StoreDashboard />;
    case "rider":
      return <RiderDashboard />;
    case "customer":
      return <CustomerDashboard />;
    default:
      return <LoginPage />;
  }
}

const Index = () => (
  <AuthProvider>
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  </AuthProvider>
);

export default Index;
