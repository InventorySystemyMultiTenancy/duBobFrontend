import InstallPrompt from "./components/InstallPrompt.jsx";
import TotemIdleGuard from "./components/TotemIdleGuard.jsx";
import UpdateAvailableBanner from "./components/UpdateAvailableBanner.jsx";
import AppRoutes from "./Routes.jsx";

function App() {
  return (
    <>
      <AppRoutes />
      <TotemIdleGuard />
      <InstallPrompt />
      <UpdateAvailableBanner />
    </>
  );
}

export default App;
