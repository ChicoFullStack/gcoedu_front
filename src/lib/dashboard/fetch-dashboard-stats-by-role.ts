import { api } from "@/lib/api";

interface BaseDashboardResponse {
  students?: number;
  schools?: number;
  evaluations?: number;
  games?: number;
  users?: number;
  questions?: number;
  classes?: number;
  teachers?: number;
  last_sync?: string;
}

export interface DashboardCounts {
  students: number;
  evaluations: number;
  games: number;
  users: number;
  questions: number;
  classes: number;
  teachers: number;
  institution: {
    label: string;
    count: number;
  };
  lastSync: string | null;
}

interface FetchOptions {
  role: string;
}

function normaliseNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

export async function fetchDashboardCountsByRole(options: FetchOptions): Promise<DashboardCounts> {
  const role = String(options.role || "").toLowerCase();

  const comprehensiveResponse = await api.get<BaseDashboardResponse>(
    "/dashboard/comprehensive-stats",
  );
  const comprehensive = comprehensiveResponse.data ?? {};

  const students = normaliseNumber(comprehensive.students);
  const evaluations = normaliseNumber(comprehensive.evaluations);
  const games = normaliseNumber(comprehensive.games);
  const users = normaliseNumber(comprehensive.users);
  const questions = normaliseNumber(comprehensive.questions);
  const classes = normaliseNumber(comprehensive.classes);
  const teachers = normaliseNumber(comprehensive.teachers);
  let institutionLabel = "Escolas cadastradas";
  let institutionCount = normaliseNumber(comprehensive.schools);

  if (role === "tecadm") {
    institutionLabel = "Escolas do município";
  }

  if (role === "diretor" || role === "coordenador") {
    institutionLabel = "Turmas cadastradas";
    institutionCount = normaliseNumber(comprehensive.classes);
  }

  return {
    students,
    evaluations,
    games,
    users,
    questions,
    classes,
    teachers,
    institution: {
      label: institutionLabel,
      count: institutionCount,
    },
    lastSync: comprehensive.last_sync ?? null,
  };
}
