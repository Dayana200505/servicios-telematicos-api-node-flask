import { useState } from "react";
import { SocketProvider } from "./src/context/SocketContext";
import ConnectionStatusScreen from "./src/screens/ConnectionStatusScreen";
import ZoneSelectionScreen from "./src/screens/ZoneSelectionScreen";

type Screen = "connection" | "zones";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("connection");

  return (
    <SocketProvider>
      {currentScreen === "zones" ? (
        <ZoneSelectionScreen onBack={() => setCurrentScreen("connection")} />
      ) : (
        <ConnectionStatusScreen
          onManageZones={() => setCurrentScreen("zones")}
        />
      )}
    </SocketProvider>
  );
}