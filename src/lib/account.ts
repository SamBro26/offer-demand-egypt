/** Account (user role) module. Mirrors the `account_type` enum in the database. */
export type AccountType = "individual" | "agency";

export const accountTypeLabels: Record<AccountType, string> = {
  individual: "أفراد",
  agency: "مكتب عقاري",
};
