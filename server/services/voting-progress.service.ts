import * as candidateRepository from "../repositories/candidate.repository.js";
import * as judgeTokenRepository from "../repositories/judge-token.repository.js";
import { getJudgeTokenStatus } from "./judge-token.service.js";

export async function getVotingProgress(eventId: string) {
  const [candidates, judgeTokens] = await Promise.all([
    candidateRepository.findCandidatesForRanking(eventId),
    judgeTokenRepository.findJudgeTokensWithVotesForProgress(eventId),
  ]);

  const candidateCount = candidates.length;
  const qualifiedTokens = judgeTokens.filter((token) => token.type === "QUALIFICATA");
  const popularTokens = judgeTokens.filter((token) => token.type === "POPOLARE");
  const qualifiedActiveJudges = qualifiedTokens.filter(
    (token) => !token.revokedAt && getJudgeTokenStatus(token) === "active"
  );
  const qualifiedSubmittedJudges = qualifiedTokens.filter(
    (token) => !token.revokedAt && getJudgeTokenStatus(token) === "used"
  );
  const qualifiedRevokedJudges = qualifiedTokens.filter((token) => token.revokedAt);

  const judges = qualifiedTokens.map((token) => {
    const status = getJudgeTokenStatus(token);
    const votedCandidateIds = new Set(
      token.votes.filter((vote) => typeof vote.score === "number").map((vote) => vote.candidateId)
    );
    const votesCast = votedCandidateIds.size;
    const missingCandidates = candidates.filter((candidate) => !votedCandidateIds.has(candidate.id));

    return {
      id: token.id,
      label: token.label,
      type: token.type,
      voterStatus: token.status,
      tokenPreview: token.tokenPreview,
      status,
      votesCast,
      votesRequired: candidateCount,
      missingCandidates:
        status === "active"
          ? missingCandidates.map((candidate) => ({
              id: candidate.id,
              number: candidate.number,
              name: candidate.name,
            }))
          : [],
    };
  });

  const incompleteCandidates = candidates
    .map((candidate) => {
      const missingJudgeCount = qualifiedActiveJudges.filter(
        (judge) => !judge.votes.some((vote) => vote.candidateId === candidate.id && typeof vote.score === "number")
      ).length;

      return {
        candidateId: candidate.id,
        candidateNumber: candidate.number,
        candidateName: candidate.name,
        missingJudgeCount,
      };
    })
    .filter((entry) => entry.missingJudgeCount > 0);

  const popularValidVotes = popularTokens.flatMap((token) =>
    token.votes.filter((vote) => typeof vote.score === "number")
  );
  const popularActivatedTokens = popularTokens.filter((token) =>
    token.votes.some((vote) => typeof vote.score === "number")
  );
  const popularSubmittedTokens = popularTokens.filter(
    (token) => !token.revokedAt && getJudgeTokenStatus(token) === "used"
  );
  const popularActiveTokens = popularTokens.filter(
    (token) => !token.revokedAt && getJudgeTokenStatus(token) === "active"
  );
  const popularRevokedTokens = popularTokens.filter((token) => token.revokedAt);

  return {
    candidateCount,
    totalJudges: qualifiedTokens.length,
    activeJudges: qualifiedActiveJudges.length,
    finalizedJudges: qualifiedSubmittedJudges.length,
    revokedJudges: qualifiedRevokedJudges.length,
    judges,
    incompleteCandidates,
    qualified: {
      totalJudges: qualifiedTokens.length,
      activeJudges: qualifiedActiveJudges.length,
      submittedJudges: qualifiedSubmittedJudges.length,
      revokedJudges: qualifiedRevokedJudges.length,
    },
    popular: {
      totalTokens: popularTokens.length,
      activeTokens: popularActiveTokens.length,
      submittedTokens: popularSubmittedTokens.length,
      revokedTokens: popularRevokedTokens.length,
      activatedTokens: popularActivatedTokens.length,
      totalVotesCast: popularValidVotes.length,
    },
  };
}
