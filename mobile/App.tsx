import { useState } from "react";
import { SocketProvider } from "./src/context/SocketContext";
import ConnectionStatusScreen from "./src/screens/ConnectionStatusScreen";
import ZoneSelectionScreen from "./src/screens/ZoneSelectionScreen";
import SuperuserScreen from "./src/screens/SuperuserScreen";

type Screen = "connection" | "zones" | "superuser";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("connection");

  return (
    <SocketProvider>
      {currentScreen === "zones" ? (
        <ZoneSelectionScreen onBack={() => setCurrentScreen("connection")} />
      ) : currentScreen === "superuser" ? (
        <SuperuserScreen onBack={() => setCurrentScreen("connection")} />
      ) : (
        <ConnectionStatusScreen
          onManageZones={() => setCurrentScreen("zones")}
          onOpenAdmin={() => setCurrentScreen("superuser")}
        />
      )}
    </SocketProvider>
  );
}