import { useEffect, useState } from "react";
import type { AccountType } from "./account";

const STORAGE_KEY = "aqarak:account-type";

/** Remembers whether the visitor browses as an individual or an agency. */
export function useAccountType() {
  const [accountType, setAccountType] = useState<AccountType>("individual");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "individual" || stored === "agency") setAccountType(stored);
  }, []);

  const update = (value: AccountType) => {
    setAccountType(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  };

  return [accountType, update] as const;
}
