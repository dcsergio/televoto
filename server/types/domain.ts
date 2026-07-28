export type VoterType = "QUALIFICATA" | "POPOLARE";
export type VoterStatus = "ACTIVE" | "SUBMITTED";

export type JudgeTokenSnapshot = {
  id: string;
  label: string | null;
  type: VoterType;
  voterStatus: VoterStatus;
  tokenPreview: string;
  createdAt: Date;
  finalizedAt: Date | null;
  usedAt: Date | null;
  revokedAt: Date | null;
  status: "active" | "used" | "revoked";
};
