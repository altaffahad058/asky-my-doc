"use client";

import { createContext, useContext } from "react";
import type { Session } from "next-auth";

type SessionUser = Session["user"] | null;

type SessionContextValue = {
  user: SessionUser;
};

const SessionContext = createContext<SessionContextValue>({ user: null });

export function useSessionUser() {
  return useContext(SessionContext).user;
}

type SessionProviderProps = {
  user: SessionUser;
  children: React.ReactNode;
};

export function SessionProvider({ user, children }: SessionProviderProps) {
  return (
    <SessionContext.Provider value={{ user }}>
      {children}
    </SessionContext.Provider>
  );
}


