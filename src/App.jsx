import InstallPrompt from "./components/InstallPrompt.jsx";
import TotemIdleGuard from "./components/TotemIdleGuard.jsx";
import AppRoutes from "./Routes.jsx";

function App() {
  return (
    <>
      <AppRoutes />
      <TotemIdleGuard />
      <InstallPrompt />
    </>
  );
}

export default App;
