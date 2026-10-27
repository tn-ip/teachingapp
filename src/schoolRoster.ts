export type SchoolProfile = {
  id: string;
  displayName: string | null;
  email: string | null;
  role: string | null;
};

export type SchoolClear = {
  userId: string;
  stageId: string;
};

export type SchoolStudent = {
  id: string;
  displayName: string;
  email: string | null;
  cleared: string[];
};

function sortStageIds(ids: string[], stageOrder: readonly string[]): string[] {
  const rank = new Map(stageOrder.map((id, index) => [id, index]));
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  unique.sort((a, b) => {
    const ai = rank.get(a) ?? rank.size;
    const bi = rank.get(b) ?? rank.size;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });
  return unique;
}

/**
 * Students only (`role` other than teacher), sorted by display name.
 * Cleared stage ids follow the bank order passed in.
 */
export function buildSchoolRoster(
  profiles: SchoolProfile[],
  clears: SchoolClear[],
  stageOrder: readonly string[],
): SchoolStudent[] {
  const byUser = new Map<string, string[]>();
  for (const clear of clears) {
    const list = byUser.get(clear.userId);
    if (list) list.push(clear.stageId);
    else byUser.set(clear.userId, [clear.stageId]);
  }

  const students: SchoolStudent[] = [];
  for (const profile of profiles) {
    if (profile.role === "teacher") continue;
    const name = profile.displayName?.trim() ?? "";
    const email = profile.email?.trim() ?? "";
    students.push({
      id: profile.id,
      displayName: name || email || "Student",
      email: name && email && email !== name ? email : null,
      cleared: sortStageIds(byUser.get(profile.id) ?? [], stageOrder),
    });
  }

  students.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "en", { numeric: true, sensitivity: "base" }),
  );
  return students;
}
