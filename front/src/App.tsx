import { AppStateProvider } from "./state/AppStateContext";
import { AppRouter } from "./routing/AppRouter";
import "./App.css";

function App() {
  return (
    <AppStateProvider>
      <AppRouter />
    </AppStateProvider>
  );
}

export default App;
