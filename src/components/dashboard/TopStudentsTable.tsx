import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Award, BookOpen } from "lucide-react";
import { DashboardApiService } from "@/services/dashboardApi";

interface StudentRanking {
  position: number;
  studentName: string;
  serie?: string;
  className: string;
  schoolName?: string;
  averageScore: number;
  totalEvaluations: number;
  bestProficiency?: number;
}

export default function TopStudentsTable() {
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudentRankings() {
      try {
        setIsLoading(true);
        setError(null);

        // Preferir endpoint do dashboard (ranking-alunos; sem scope = escopo do usuário logado)
        const apiRanking = await DashboardApiService.getStudentRanking({ limit: 10 });
        if (!apiRanking || !Array.isArray(apiRanking.ranking)) {
          setError("Não foi possível carregar o ranking de alunos.");
          setRankings([]);
          return;
        }

        const mapped: StudentRanking[] = apiRanking.ranking.map((item, index) => ({
          position: item.position ?? index + 1,
          studentName: item.name,
          serie: item.serie,
          className: item.class_name,
          schoolName: item.school_name || undefined,
          averageScore: item.media,
          totalEvaluations: item.completed_evaluations,
        }));
        setRankings(mapped);
      } catch (error: unknown) {
        console.error("Erro ao buscar ranking de alunos:", error);
        setError("Não foi possível carregar o ranking de alunos.");
        setRankings([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStudentRankings();
  }, []);

  const getPerformanceColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400";
    if (score >= 6) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400";
    return "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400";
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (position === 2) return <Award className="h-4 w-4 text-muted-foreground" />;
    if (position === 3) return <Award className="h-4 w-4 text-amber-600" />;
    return <span className="text-sm font-medium text-muted-foreground">#{position}</span>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Alunos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Alunos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-8">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Alunos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Nenhum aluno encontrado para compor o ranking.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Alunos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rankings.map((student) => (
            <div key={student.position} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors border-border">
              {/* Posição e Nome do Aluno */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {getPositionIcon(student.position)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm truncate">
                    {student.studentName}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {[student.serie, student.className].filter(Boolean).join(" • ")}
                    {student.schoolName && ` • ${student.schoolName}`}
                  </p>
                </div>
              </div>

              {/* Métricas */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {/* Média de Notas */}
                <div className="text-center">
                  <div className={`text-sm font-semibold px-2 py-1 rounded-full ${getPerformanceColor(student.averageScore)}`}>
                    {student.averageScore > 0 ? student.averageScore.toFixed(1) : '0.0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Média</p>
                </div>

                {/* Número de Avaliações */}
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3 text-blue-500" />
                    <span className="text-sm font-medium">{student.totalEvaluations}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Avaliações</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
