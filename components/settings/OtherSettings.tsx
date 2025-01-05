import { ScreenOrientationEnum, useSettings } from "@/utils/atoms/settings";
import {
  BACKGROUND_FETCH_TASK,
  registerBackgroundFetchAsync,
  unregisterBackgroundFetchAsync,
} from "@/utils/background-tasks";
import { Ionicons } from "@expo/vector-icons";
import * as BackgroundFetch from "expo-background-fetch";
import * as ScreenOrientation from "expo-screen-orientation";
import * as TaskManager from "expo-task-manager";
import React, { useEffect } from "react";
import { Linking, Switch, TouchableOpacity, ViewProps } from "react-native";
import { toast } from "sonner-native";
import * as DropdownMenu from "zeego/dropdown-menu";
import { Text } from "../common/Text";
import { ListGroup } from "../list/ListGroup";
import { ListItem } from "../list/ListItem";

interface Props extends ViewProps {}

export const OtherSettings: React.FC = () => {
  const [settings, updateSettings] = useSettings();

  /********************
   * Background task
   *******************/
  const checkStatusAsync = async () => {
    await BackgroundFetch.getStatusAsync();
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  };

  useEffect(() => {
    (async () => {
      const registered = await checkStatusAsync();

      if (settings?.autoDownload === true && !registered) {
        registerBackgroundFetchAsync();
        toast.success("Background downloads enabled");
      } else if (settings?.autoDownload === false && registered) {
        unregisterBackgroundFetchAsync();
        toast.info("Background downloads disabled");
      } else if (settings?.autoDownload === true && registered) {
        // Don't to anything
      } else if (settings?.autoDownload === false && !registered) {
        // Don't to anything
      } else {
        updateSettings({ autoDownload: false });
      }
    })();
  }, [settings?.autoDownload]);
  /**********************
   *********************/

  if (!settings) return null;

  return (
    <ListGroup title="Other" className="mb-4">
      <ListItem title="Auto rotate">
        <Switch
          value={settings.autoRotate}
          onValueChange={(value) => updateSettings({ autoRotate: value })}
        />
      </ListItem>

      <ListItem title="Video orientation" disabled={settings.autoRotate}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <TouchableOpacity className="flex flex-row items-center justify-between py-3 pl-3">
              <Text className="mr-1 text-[#8E8D91]">
                {ScreenOrientationEnum[settings.defaultVideoOrientation]}
              </Text>
              <Ionicons name="chevron-expand-sharp" size={18} color="#5A5960" />
            </TouchableOpacity>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            loop={true}
            side="bottom"
            align="start"
            alignOffset={0}
            avoidCollisions={true}
            collisionPadding={8}
            sideOffset={8}
          >
            <DropdownMenu.Label>Orientation</DropdownMenu.Label>
            <DropdownMenu.Item
              key="1"
              onSelect={() => {
                updateSettings({
                  defaultVideoOrientation:
                    ScreenOrientation.OrientationLock.DEFAULT,
                });
              }}
            >
              <DropdownMenu.ItemTitle>
                {
                  ScreenOrientationEnum[
                    ScreenOrientation.OrientationLock.DEFAULT
                  ]
                }
              </DropdownMenu.ItemTitle>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              key="2"
              onSelect={() => {
                updateSettings({
                  defaultVideoOrientation:
                    ScreenOrientation.OrientationLock.PORTRAIT_UP,
                });
              }}
            >
              <DropdownMenu.ItemTitle>
                {
                  ScreenOrientationEnum[
                    ScreenOrientation.OrientationLock.PORTRAIT_UP
                  ]
                }
              </DropdownMenu.ItemTitle>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              key="3"
              onSelect={() => {
                updateSettings({
                  defaultVideoOrientation:
                    ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
                });
              }}
            >
              <DropdownMenu.ItemTitle>
                {
                  ScreenOrientationEnum[
                    ScreenOrientation.OrientationLock.LANDSCAPE_LEFT
                  ]
                }
              </DropdownMenu.ItemTitle>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              key="4"
              onSelect={() => {
                updateSettings({
                  defaultVideoOrientation:
                    ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
                });
              }}
            >
              <DropdownMenu.ItemTitle>
                {
                  ScreenOrientationEnum[
                    ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT
                  ]
                }
              </DropdownMenu.ItemTitle>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </ListItem>

      <ListItem title="Safe area in controls">
        <Switch
          value={settings.safeAreaInControlsEnabled}
          onValueChange={(value) =>
            updateSettings({ safeAreaInControlsEnabled: value })
          }
        />
      </ListItem>

      <ListItem
        title="Show Custom Menu Links"
        onPress={() =>
          Linking.openURL(
            "https://jellyfin.org/docs/general/clients/web-config/#custom-menu-links"
          )
        }
      >
        <Switch
          value={settings.showCustomMenuLinks}
          onValueChange={(value) =>
            updateSettings({ showCustomMenuLinks: value })
          }
        />
      </ListItem>
    </ListGroup>
  );
};
