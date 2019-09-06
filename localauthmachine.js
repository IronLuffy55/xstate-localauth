import { Machine, assign } from "xstate";
const localAuthMachine = Machine({
  id: "localAuthentication",
  initial: "idle",
  context: {
    useLocalAuth: true,
    maxAttempts: 3,
    attempt: 0
  },
  states: {
    idle: {
      on: {
        AUTHENTICATE: [
          {
            target: "authenticating",
            cond: "useLocalAuth"
          },
          {
            target: "authed"
          }
        ]
      }
    },
    authenticating: {
      entry: assign({
        attempt: ctx => {
          console.log("increase entry attempt>", ctx);
          return ctx.attempt + 1;
        }
      }),
      invoke: {
        src: "authenticate",
        onDone: {
          target: "authed"
        },
        onError: [
          { target: "loggedOut", cond: "maxAttemptesExceeded" },
          { target: "authenticating", cond: "tryAgain" }
        ]
      }
    },
    authed: {
      entry: ["notifySuccess", "resetAttempt"],
      on: {
        ENABLE_LOCAL_AUTH: { actions: assign({ useLocalAuth: () => true }) },
        DISABLE_LOCAL_AUTH: { actions: assign({ useLocalAuth: () => false }) },
        AUTHENTICATE: [
          {
            target: "authenticating",
            cond: "useLocalAuth"
          }
        ]
      }
    },
    loggedOut: {
      entry: ["notifyFailure", "resetAttempt"],
      type: "final"
    }
  }
});

export default localAuthMachine;

export const resumeMachine = Machine({
  id: "resume",
  initial: "active",

  states: {
    active: {
      on: {
        BACKGROUND: "background",
        INACTIVE: "background"
      }
    },
    pending: {
      on: { ACTIVE: "active" }
    },
    background: {
      on: { ACTIVE: "pending" }
    }
  }
});
