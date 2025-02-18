import useImageStorage from "@/hooks/useImageStorage";
import {
  addCompleteListener,
  addErrorListener,
  addProgressListener,
  cancelDownload,
  downloadHLSAsset,
  getActiveDownloads,
} from "@/modules/hls-downloader";
import {
  DownloadInfo,
  DownloadMetadata,
} from "@/modules/hls-downloader/src/HlsDownloader.types";
import { getItemImage } from "@/utils/getItemImage";
import { getStreamUrl } from "@/utils/jellyfin/media/getStreamUrl";
import download from "@/utils/profiles/download";
import {
  BaseItemDto,
  MediaSourceInfo,
} from "@jellyfin/sdk/lib/generated-client/models";
import { useQuery } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import { useAtomValue } from "jotai";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner-native";
import { apiAtom, userAtom } from "./JellyfinProvider";
import { useFocusEffect } from "expo-router";
import { AppState, AppStateStatus, Platform } from "react-native";

type DownloadOptionsData = {
  selectedAudioStream: number;
  selectedSubtitleStream: number;
  selectedMediaSource: MediaSourceInfo;
  maxBitrate?: number;
};

type DownloadContextType = {
  downloads: Record<string, DownloadInfo>;
  startDownload: (
    item: BaseItemDto,
    url: string,
    {
      selectedAudioStream,
      selectedSubtitleStream,
      selectedMediaSource,
      maxBitrate,
    }: DownloadOptionsData
  ) => Promise<void>;
  getDownloadedItem: (id: string) => Promise<DownloadMetadata | null>;
  cancelDownload: (id: string) => Promise<void>;
  activeDownloads: DownloadInfo[];
  downloadedFiles: DownloadedFileInfo[];
  refetchDownloadedFiles: () => void;
};

const DownloadContext = createContext<DownloadContextType | undefined>(
  undefined
);

export type DownloadedFileInfo = {
  id: string;
  path: string;
  metadata: DownloadMetadata;
};

const getDownloadedFiles = async (): Promise<DownloadedFileInfo[]> => {
  const downloaded: DownloadedFileInfo[] = [];

  const downloadsDir = Platform.select({
    ios: FileSystem.documentDirectory + "downloads/",
    android: FileSystem.documentDirectory + "downloads/",
  });

  console.log("downloadsDir ~", downloadsDir);

  if (!downloadsDir) throw new Error("Downloads directory not found");

  const dirInfo = await FileSystem.getInfoAsync(downloadsDir);

  if (!dirInfo.exists) {
    console.warn("Downloads directory does not exist");
    return [];
  }

  const files = await FileSystem.readDirectoryAsync(downloadsDir);

  console.log("getDownloadedFiles ~", files.length);

  for (let file of files) {
    console.log(file);
    const fileInfo = await FileSystem.getInfoAsync(downloadsDir + file);
    if (fileInfo.isDirectory) continue;
    if (!file.endsWith(".json")) continue;

    const fileContent = await FileSystem.readAsStringAsync(downloadsDir + file);

    // Check that fileContent is actually DownloadMetadata
    if (!fileContent) continue;
    if (!fileContent.includes("mediaSource")) continue;
    if (!fileContent.includes("item")) continue;

    downloaded.push({
      id: file.replace(".json", ""),
      path: downloadsDir + file.replace(".json", ""),
      metadata: JSON.parse(fileContent) as DownloadMetadata,
    });
  }
  return downloaded;
};

const getDownloadedFile = async (id: string) => {
  const downloadsDir = FileSystem.documentDirectory + "downloads/";
  const fileInfo = await FileSystem.getInfoAsync(downloadsDir + id + ".json");
  if (!fileInfo.exists) return null;
  const fileContent = await FileSystem.readAsStringAsync(
    downloadsDir + id + ".json"
  );
  return JSON.parse(fileContent) as DownloadMetadata;
};

export const NativeDownloadProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [downloads, setDownloads] = useState<Record<string, DownloadInfo>>({});
  const { saveImage } = useImageStorage();

  const user = useAtomValue(userAtom);
  const api = useAtomValue(apiAtom);

  const { data: downloadedFiles, refetch: refetchDownloadedFiles } = useQuery({
    queryKey: ["downloadedFiles"],
    queryFn: getDownloadedFiles,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === "background" || state === "inactive") {
        setDownloads({});
      } else if (state === "active") {
        const _getActiveDownloads = async () => {
          const activeDownloads = await getActiveDownloads();
          setDownloads((prev) => {
            const newDownloads = { ...prev };
            activeDownloads.forEach((download) => {
              newDownloads[download.id] = {
                id: download.id,
                progress: download.progress,
                state: download.state,
                secondsDownloaded: download.secondsDownloaded,
                secondsTotal: download.secondsTotal,
                metadata: download.metadata,
                startTime: download.startTime,
              };
            });
            return newDownloads;
          });
        };
        _getActiveDownloads();
        refetchDownloadedFiles();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, [getActiveDownloads]);

  useEffect(() => {
    const progressListener = addProgressListener((download) => {
      console.log("p ~", {
        id: download.id,
        progress: download.progress,
        state: download.state,
        taskId: download.taskId,
      });
      if (!download.metadata) throw new Error("No metadata found in download");

      setDownloads((prev) => ({
        ...prev,
        [download.id]: {
          id: download.id,
          progress: download.progress,
          state: download.state,
          secondsDownloaded: download.secondsDownloaded,
          secondsTotal: download.secondsTotal,
          metadata: download.metadata,
          startTime: download?.startTime,
        },
      }));

      if (download.state === "DONE") {
        refetchDownloadedFiles();

        setDownloads((prev) => {
          const newDownloads = { ...prev };
          delete newDownloads[download.id];
          return newDownloads;
        });
      }
    });

    const completeListener = addCompleteListener((download) => {
      console.log("c ~", {
        id: download.id,
        state: download.state,
      });

      // Remove the active download from the state
      setDownloads((prev) => {
        const newDownloads = { ...prev };
        delete newDownloads[download.id];
        return newDownloads;
      });
      refetchDownloadedFiles();
    });

    const errorListener = addErrorListener((error) => {
      setDownloads((prev) => {
        const newDownloads = { ...prev };
        delete newDownloads[error.id];
        return newDownloads;
      });

      if (error.state === "CANCELLED") toast.info("Download cancelled 🟡");
      else if (error.state === "FAILED") {
        toast.error("Download failed ❌");
        console.error("Download error:", error);
      } else {
        console.error("errorListener fired with unknown state:", error);
      }
    });

    return () => {
      progressListener.remove();
      errorListener.remove();
      completeListener.remove();
    };
  }, []);

  const startDownload = async (
    item: BaseItemDto,
    url: string,
    data: DownloadOptionsData
  ) => {
    if (!item.Id || !item.Name) throw new Error("Item ID or Name is missing");
    const jobId = item.Id;

    const itemImage = getItemImage({
      item,
      api: api!,
      variant: "Primary",
      quality: 90,
      width: 500,
    });

    const res = await getStreamUrl({
      api,
      item,
      startTimeTicks: 0,
      userId: user?.Id,
      audioStreamIndex: data.selectedAudioStream,
      maxStreamingBitrate: data.maxBitrate,
      mediaSourceId: data.selectedMediaSource.Id,
      subtitleStreamIndex: data.selectedSubtitleStream,
      deviceProfile: download,
    });

    if (!res) throw new Error("Failed to get stream URL");
    const { mediaSource } = res;
    if (!mediaSource) throw new Error("Failed to get media source");

    await saveImage(item.Id, itemImage?.uri);

    if (!url.includes("master.m3u8"))
      throw new Error("Only HLS downloads are supported");

    downloadHLSAsset(jobId, url, {
      item,
      mediaSource,
    });
  };

  return (
    <DownloadContext.Provider
      value={{
        downloads,
        startDownload,
        downloadedFiles: downloadedFiles ?? [],
        getDownloadedItem: getDownloadedFile,
        activeDownloads: Object.values(downloads),
        cancelDownload: cancelDownload,
        refetchDownloadedFiles,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
};

export const useNativeDownloads = () => {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error(
      "useDownloads must be used within a NativeDownloadProvider"
    );
  }
  return context;
};
