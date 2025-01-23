import { TouchableJellyseerrRouter } from "@/components/common/JellyseerrItemRouter";
import { Text } from "@/components/common/Text";
import JellyseerrMediaIcon from "@/components/jellyseerr/JellyseerrMediaIcon";
import JellyseerrStatusIcon from "@/components/jellyseerr/JellyseerrStatusIcon";
import { useJellyseerr } from "@/hooks/useJellyseerr";
import { useJellyseerrCanRequest } from "@/utils/_jellyseerr/useJellyseerrCanRequest";
import { MediaType } from "@/utils/jellyseerr/server/constants/media";
import { MovieResult, TvResult } from "@/utils/jellyseerr/server/models/Search";
import { Image } from "expo-image";
import { useMemo } from "react";
import { View, ViewProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface Props extends ViewProps {
  item: MovieResult | TvResult;
}

const JellyseerrPoster: React.FC<Props> = ({ item, ...props }) => {
  const { jellyseerrApi } = useJellyseerr();
  const loadingOpacity = useSharedValue(1);
  const imageOpacity = useSharedValue(0);

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  const handleImageLoad = () => {
    loadingOpacity.value = withTiming(0, { duration: 200 });
    imageOpacity.value = withTiming(1, { duration: 300 });
  };

  const imageSrc = useMemo(
    () => jellyseerrApi?.imageProxy(item.posterPath, "w300_and_h450_face"),
    [item, jellyseerrApi]
  );

  const title = useMemo(
    () => (item.mediaType === MediaType.MOVIE ? item.title : item.name),
    [item]
  );

  const releaseYear = useMemo(
    () =>
      new Date(
        item.mediaType === MediaType.MOVIE
          ? item.releaseDate
          : item.firstAirDate
      ).getFullYear(),
    [item]
  );

  const [canRequest] = useJellyseerrCanRequest(item);

  return (
    <TouchableJellyseerrRouter
      result={item}
      mediaTitle={title}
      releaseYear={releaseYear}
      canRequest={canRequest}
      posterSrc={imageSrc!!}
    >
      <View className="flex flex-col w-28 mr-2">
        <View className="relative rounded-lg overflow-hidden border border-neutral-900 w-28 aspect-[10/15]">
          <Animated.View style={imageAnimatedStyle}>
            <Image
              key={item.id}
              id={item.id.toString()}
              source={{ uri: imageSrc }}
              cachePolicy={"memory-disk"}
              contentFit="cover"
              style={{
                aspectRatio: "10/15",
                width: "100%",
              }}
              onLoad={handleImageLoad}
            />
          </Animated.View>
          <JellyseerrStatusIcon
            className="absolute bottom-1 right-1"
            showRequestIcon={canRequest}
            mediaStatus={item?.mediaInfo?.status}
          />
          <JellyseerrMediaIcon
            className="absolute top-1 left-1"
            mediaType={item?.mediaType}
          />
        </View>
        <View className="mt-2 flex flex-col">
          <Text numberOfLines={2}>{title}</Text>
          <Text className="text-xs opacity-50 align-bottom">{releaseYear}</Text>
        </View>
      </View>
    </TouchableJellyseerrRouter>
  );
};

export default JellyseerrPoster;
