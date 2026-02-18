import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
} from "react";

export type LogLevel = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  data?: string;
  ts: number;
}

interface State {
  logs: LogEntry[];
  isTerminalOpen: boolean;
}

type Action =
  | { type: "ADD"; entry: LogEntry }
  | { type: "CLEAR" }
  | { type: "SET_OPEN"; open: boolean };

const MAX_LOGS = 200;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD":
      return {
        ...state,
        logs: [...state.logs.slice(-(MAX_LOGS - 1)), action.entry],
      };
    case "CLEAR":
      return { ...state, logs: [] };
    case "SET_OPEN":
      return { ...state, isTerminalOpen: action.open };
  }
}

interface LogContextValue {
  logs: LogEntry[];
  isTerminalOpen: boolean;
  addLog: (level: LogLevel, message: string, data?: string) => void;
  clearLogs: () => void;
  setTerminalOpen: (open: boolean) => void;
}

const LogContext = createContext<LogContextValue | null>(null);

export const LogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, {
    logs: [],
    isTerminalOpen: true,
  });

  const addLog = useCallback(
    (level: LogLevel, message: string, data?: string) => {
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        level,
        message,
        data,
        ts: Date.now(),
      };
      dispatch({ type: "ADD", entry });
    },
    []
  );

  const clearLogs = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const setTerminalOpen = useCallback(
    (open: boolean) => dispatch({ type: "SET_OPEN", open }),
    []
  );

  return (
    <LogContext.Provider
      value={{
        logs: state.logs,
        isTerminalOpen: state.isTerminalOpen,
        addLog,
        clearLogs,
        setTerminalOpen,
      }}
    >
      {children}
    </LogContext.Provider>
  );
};

export function useLog(): LogContextValue {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error("useLog must be used inside <LogProvider>");
  return ctx;
}
