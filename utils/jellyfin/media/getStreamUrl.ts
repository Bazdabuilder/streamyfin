import generateDeviceProfile from "@/utils/profiles/native";
import type { Api } from "@jellyfin/sdk";
import type {
  BaseItemDto,
  MediaSourceInfo,
  PlaybackInfoResponse,
} from "@jellyfin/sdk/lib/generated-client/models";
import { getMediaInfoApi } from "@jellyfin/sdk/lib/utils/api";
import { Alert } from "react-native";

export const getStreamUrl = async ({
  api,
  item,
  userId,
  startTimeTicks = 0,
  maxStreamingBitrate,
  sessionData,
  deviceProfile = generateDeviceProfile(),
  audioStreamIndex = 0,
  subtitleStreamIndex = undefined,
  mediaSourceId,
  download = false,
}: {
  api: Api | null | undefined;
  item: BaseItemDto | null | undefined;
  userId: string | null | undefined;
  startTimeTicks: number;
  maxStreamingBitrate?: number;
  sessionData?: PlaybackInfoResponse | null;
  deviceProfile?: any;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
  height?: number;
  mediaSourceId?: string | null;
  //forceStream: bool;
  download: bool;
}): Promise<{
  url: string | null;
  sessionId: string | null;
  mediaSource: MediaSourceInfo | undefined;
} | null> => {
  if (!api || !userId || !item?.Id) {
    console.warn("Missing required parameters for getStreamUrl");
    return null;
  }

  let mediaSource: MediaSourceInfo | undefined;
  let sessionId: string | null | undefined;

  const res = await getMediaInfoApi(api).getPlaybackInfo(
    {
      itemId: item.Id!,
    },
    {
      method: "POST",
      data: {
        userId,
        deviceProfile,
        subtitleStreamIndex,
        startTimeTicks,
        isPlayback: true,
        autoOpenLiveStream: true,
        maxStreamingBitrate,
        audioStreamIndex,
        mediaSourceId,
      },
    },
  );

  if (res.status !== 200) {
    console.error("Error getting playback info:", res.status, res.statusText);
  }

  sessionId = res.data.PlaySessionId || null;
  mediaSource = res.data.MediaSources[0];
  let transcodeUrl = mediaSource.TranscodingUrl;

  if (transcodeUrl) {
    if (download) {
      transcodeUrl = transcodeUrl.replace("master.m3u8", "stream.mp4");
    }
    console.log("Video is being transcoded:", transcodeUrl);
    return {
      url: `${api.basePath}${transcodeUrl}`,
      sessionId,
      mediaSource,
    };
  }

  let params = {};

  if (download) {
    params = {
      subtitleMethod: "Embed",
      EnableSubtitlesInManifest: true,
      static: false,
      allowVideoStreamCopy: true,
      allowAudioStreamCopy: true,
    };
  }

  const streamParams = new URLSearchParams({
    playSessionId: sessionData?.PlaySessionId || "",
    mediaSourceId: mediaSource?.Id || "",
    static: "true",
    subtitleStreamIndex: subtitleStreamIndex?.toString() || "",
    audioStreamIndex: audioStreamIndex?.toString() || "",
    deviceId: api.deviceInfo.id,
    api_key: api.accessToken,
    startTimeTicks: startTimeTicks.toString(),
    maxStreamingBitrate: maxStreamingBitrate?.toString() || "",
    userId: userId || "",
    ...params,
  });

  const directPlayUrl = `${
    api.basePath
  }/Videos/${item.Id}/stream.mp4?${streamParams.toString()}`;

  console.log("Video is being direct played:", directPlayUrl);

  return {
    url: directPlayUrl,
    sessionId: sessionId,
    mediaSource,
  };
};
