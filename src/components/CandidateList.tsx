import type { CandidateData } from "../types";
import { CandidateCard } from "./CandidateCard";

interface CandidateListProps {
  candidates: CandidateData[];
  selectedId: string | null;
  votedMap: Record<string, number>;
  onSelect: (id: string) => void;
  onVote?: (candidateId: string, score: number) => void;
  submitting: boolean;
}

export function CandidateList({
  candidates,
  selectedId,
  votedMap,
  onSelect,
  onVote,
  submitting,
}: Readonly<CandidateListProps>) {
  return (
    <div className="flex flex-col gap-3">
      {candidates.map((c, i) => (
        <CandidateCard
          key={c.id}
          candidate={c}
          selected={c.id === selectedId}
          votedScore={votedMap[c.id] ?? null}
          onClick={() => onSelect(c.id)}
          onVote={onVote}
          submitting={submitting}
          delay={i * 60}
        />
      ))}
    </div>
  );
}
