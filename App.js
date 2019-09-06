import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, Button, Text } from "react-native";
import { assign } from "xstate";
import { useMachine } from "@xstate/react";
import localAuthMachine, { resumeMachine } from "./localauthmachine";
import { useAppState } from "react-native-hooks";
import LocalAuth from "react-native-local-auth";
const wait = async () => {
  return new Promise(resolve => {
    console.log("wait 5 secpmds");
    setTimeout(() => {
      resolve();
    }, 1000);
  });
};
const useLocalAuthentication = () => {
  const [current, send] = useMachine(localAuthMachine, {
    guards: {
      useLocalAuth: ctx => {
        // console.log('useLocalAuth: ctx>', ctx);
        return ctx.useLocalAuth;
      },
      tryAgain: ctx => {
        console.log("tryAgain: ctx>", ctx);
        return ctx.attempt < ctx.maxAttempts;
      },
      maxAttemptesExceeded: ctx => {
        console.log("maxAttemptesExceeded: ctx>", ctx);
        return ctx.attempt >= ctx.maxAttempts;
      }
    },
    actions: {
      notifySuccess: ctx => {
        console.log("notifySuccess: user is authed");
      },
      notifyFailure: ctx => {
        console.log("notifyFailure: user is NOT authed");
      },
      resetAttempt: assign({
        attempt: () => {
          console.log("resetAttempt: start");
          return 0;
        }
      })
    },
    services: {
      authenticate: async ctx => {
        console.log("authenticate: start>", ctx);

        return await LocalAuth.authenticate({
          reason: "this is a secure area, please authenticate yourself",
          fallbackToPasscode: true, // fallback to passcode on cancel
          suppressEnterPassword: true // disallow Enter Password fallback
        });
      }
    }
  });
  return {
    state: current.value,
    authenticate: () => send("AUTHENTICATE"),
    disable: () => send("DISABLE_LOCAL_AUTH"),
    enable: () => send("ENABLE_LOCAL_AUTH"),
    isAuthenticated: current.value === "authed",
    isAuthenticating: current.value === "authenticating",
    attempt: current.context.attempt,
    isEnabled: current.context.useLocalAuth
  };
};
const App = () => {
  const {
    isAuthenticated,
    authenticate,
    enable,
    disable,
    state,
    isAuthenticating,
    attempt,
    isEnabled: isLocalAuthEnabled
  } = useLocalAuthentication();
  const [current, send] = useMachine(resumeMachine);
  const appState = useAppState();

  useEffect(() => {
    send(appState.toUpperCase());
  }, [appState]);

  useEffect(() => {
    console.log("ResumeState>", current.value);
    if (current.value == "pending") {
      authenticate();
    }
  }, [current]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "pink" }}>
      <Text>Current app state:{appState}</Text>
      <Text>Current state:{state}</Text>
      <Button onPress={authenticate} title="Authenticate" />
      {isAuthenticating && (
        <React.Fragment>
          <Text>Attempt: {attempt}</Text>
          <ActivityIndicator size="large" />
        </React.Fragment>
      )}

      {isAuthenticated ? (
        isLocalAuthEnabled ? (
          <Button title="Disable Local Auth" onPress={disable} />
        ) : (
          <Button title="Enable Local Auth" onPress={enable} />
        )
      ) : null}
    </SafeAreaView>
  );
};

export default App;
