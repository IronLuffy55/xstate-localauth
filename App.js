import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, Button, Text } from "react-native";
import { assign } from "xstate";
import { useMachine } from "@xstate/react";
import localAuthMachine, {
  resumeMachine,
  counselorMachine
} from "./localauthmachine";
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
const useNotifySuccess = () => {
  const [calls, setCalls] = useState(0);
  const cb = useCallback(() => {
    console.log("Success count: " + (calls + 1));
    setCalls(calls + 1);
  }, [calls]);
  return cb;
};
let ignore = false;
let didFire = false;
const useLocalAuthentication = () => {
  const notifySuccess = useNotifySuccess();
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
      notifySuccess: notifySuccess,
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
  useEffect(() => {
    console.log("current changed");
  }, [current]);
  useEffect(() => {
    setTimeout(() => {
      console.log("Will current chagne?");
      notifySuccess();
    }, 3000);
  }, []);

  useEffect(() => {
    console.log("new copy of notify success");
    if (!didFire) {
      didFire = true;
      return;
    }
    if (!ignore) {
      setTimeout(() => {
        console.log("Will current chagne?");
        notifySuccess();
      }, 5000);
      ignore = true;
    }
  }, [notifySuccess]);

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

// const useAuthentication = () => {
//   const [checkLocalAuth, setCheckLocalAuth]  = useState();
//   const [current, send] = useMachine(counselorMachine, {
//     guards: {
//       hasCredentials: () => {
//         return true;
//       }
//     },
//     services: {
//       getUser: async () => {
//         return true;
//       }
//     }
//   });

//   useEffect(()=>{
//     if(current.value == "ready") {

//     }
//   }, [current])
// };
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
      <Button
        onPress={() => {
          send("PENDING");
          authenticate();
        }}
        title="Authenticate"
      />
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
