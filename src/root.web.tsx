import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { Stack } from "expo-router";
import { useEffect, useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import * as Data from "effect/Data";

import { UseCases } from "@/business/index.ts";

import "../../global.css";
import { FridgyContext } from "./context.ts";
import { useViewmodel } from "./lib/adapter.ts";

type Message = Data.TaggedEnum<{}>;

const Message = Data.taggedEnum<Message>();

export function RootLayout(layer: Layer.Layer<UseCases.All>) {
  const runtime = useMemo(() => ManagedRuntime.make(layer), [layer]);
  const model = useViewmodel({ runtime });

  useEffect(() => {
    return () => {
      void runtime.dispose();
    };
  }, [runtime]);

  return (
    <SafeAreaProvider>
      <FridgyContext.Provider value={runtime}>
        <Stack screenOptions={{ headerTitleAlign: "center" }}></Stack>
      </FridgyContext.Provider>
      <Toast />
    </SafeAreaProvider>
  );
}
