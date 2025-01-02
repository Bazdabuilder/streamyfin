import { useEffect } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useWebSocketContext } from "@/providers/WebSocketProvider";

interface UseWebSocketProps {
  isPlaying: boolean;
  togglePlay: () => void;
  stopPlayback: () => void;
}

export const useWebSocket = ({
  isPlaying,
  togglePlay,
  stopPlayback,
}: UseWebSocketProps) => {
  const router = useRouter();
  const { ws } = useWebSocketContext();

  useEffect(() => {
    if (!ws) return;

    ws.onmessage = (e) => {
      const json = JSON.parse(e.data);
      const command = json?.Data?.Command;

      console.log("[WS] ~ ", json);

      if (command === "PlayPause") {
        console.log("Command ~ PlayPause");
        togglePlay();
      } else if (command === "Stop") {
        console.log("Command ~ Stop");
        stopPlayback();
        router.canGoBack() && router.back();
      } else if (json?.Data?.Name === "DisplayMessage") {
        console.log("Command ~ DisplayMessage");
        const title = json?.Data?.Arguments?.Header;
        const body = json?.Data?.Arguments?.Text;
        Alert.alert("Message from server: " + title, body);
      }
    };

    return () => {
      ws.onmessage = null;
    };
  }, [ws, stopPlayback, togglePlay, isPlaying, router]);
};
