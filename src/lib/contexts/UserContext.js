"use client";

import { createContext, useEffect, useState } from "react";

export const UserContext = createContext();

export function UserProvider(props) {
  const [user, setUser] = useState(null);
  const { children } = props;
  const getUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    getUser();
  }, []);
  const data = {
    user,
    setUser,
    getUser,
  };
  return <UserContext.Provider value={data}>{children}</UserContext.Provider>;
}
