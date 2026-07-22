import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
// Componentes antigos removidos - substituídos pelos novos componentes da Fase 1

// Novos componentes da Fase 1
import ClassRankingTable from "@/components/dashboard/ClassRankingTable";
import TopStudentsTable from "@/components/dashboard/TopStudentsTable";
import RecentEvaluationsTable from "@/components/dashboard/RecentEvaluationsTable";
import QuestionsList from "@/components/dashboard/QuestionsList";
import ActionCards from "@/components/dashboard/ActionCards";
import { AnaliseSistemaModal } from "@/components/dashboard/AnaliseSistemaModal";
import ModernStatCard from "@/components/dashboard/ModernStatCard";
import PerformanceCard from "@/components/dashboard/PerformanceCard";

import {
  Users,
  School,
  List,
  Gamepad,
  User,
  Headset,
  Bell,
  Award,
  Trophy,
  Tv,
  TrendingUp,
  Clock,
  Target,
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Settings,
  Ticket,
  Smartphone,
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import {
  hasRestrictedStaffAccess,
  isAplicadorRole,
} from "@/utils/restrictedStaffAccess";
import { useToast } from "@/hooks/use-toast";
import ProfessorDashboard from "./ProfessorDashboard";
import { fetchDashboardCountsByRole, DashboardCounts } from "@/lib/dashboard/fetch-dashboard-stats-by-role";
import { DashboardApiService } from "@/services/dashboardApi";
import { CertificatesApiService } from "@/services/certificatesApi";

const Index = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isRestrictedStaff = hasRestrictedStaffAccess(user);
  const isAplicador = isAplicadorRole(user?.role);
  const { toast } = useToast();
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avisosQuantidade, setAvisosQuantidade] = useState<number | null>(null);
  const [certificadosQuantidade, setCertificadosQuantidade] = useState<number | null>(null);
  const [analiseSistemaModalOpen, setAnaliseSistemaModalOpen] = useState(false);
  const normalizedRole = String(user?.role ?? "").toLowerCase();

  useEffect(() => {
    if (!user?.id || !user?.role) {
      return;
    }

    const normalisedRole = String(user.role).toLowerCase();
    if (isRestrictedStaff) return;
    if (normalisedRole === "aluno" || normalisedRole === "professor") {
      return;
    }

    let isMounted = true;

    async function loadDashboardCounts() {
      try {
        setIsLoading(true);
        const metrics = await fetchDashboardCountsByRole({
          role: user.role,
        });

        if (!isMounted) {
          return;
        }

        setCounts(metrics);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error("Erro ao carregar estatísticas do painel:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as estatísticas do painel.",
          variant: "destructive",
        });
        setCounts(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardCounts();

    return () => {
      isMounted = false;
    };
  }, [toast, user?.role, user?.id, isRestrictedStaff]);

  // Quantidade de avisos (admin e tecadm)
  useEffect(() => {
    const role = user?.role?.toLowerCase();
    if (role !== "admin" && role !== "tecadm") return;

    let isMounted = true;
    DashboardApiService.getAvisosQuantidade()
      .then((qtd) => {
        if (isMounted) setAvisosQuantidade(qtd);
      })
      .catch((error) => {
        console.error("Erro ao carregar quantidade de avisos:", error);
        if (isMounted) {
          setAvisosQuantidade(null);
          toast({
            title: "Erro",
            description: "Não foi possível carregar a quantidade de avisos.",
            variant: "destructive",
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [toast, user?.role]);

  // Quantidade de certificados emitidos (admin, tecadm, diretor, coordenador)
  useEffect(() => {
    const role = user?.role?.toLowerCase();
    if (!role || role === "aluno" || role === "professor") return;

    let isMounted = true;
    CertificatesApiService.getQuantidade()
      .then((qtd) => {
        if (isMounted) setCertificadosQuantidade(qtd);
      })
      .catch((error) => {
        console.error("Erro ao carregar quantidade de certificados:", error);
        if (isMounted) {
          setCertificadosQuantidade(null);
          toast({
            title: "Erro",
            description:
              "Não foi possível carregar a quantidade de certificados.",
            variant: "destructive",
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [toast, user?.role]);

  // Usar dados da nova API se disponível, senão usar fallback
  const dashboardCounts = counts ?? {
    students: 0,
    evaluations: 0,
    games: 0,
    users: 0,
    questions: 0,
    classes: 0,
    teachers: 0,
    institution: { label: "Instituições", count: 0 },
    lastSync: null,
  };
  const isLoadingDashboard = isLoading;
  // Priorizar counts (comprehensive-stats) quando disponível, para não exibir zeros se a API nova falhar ou retornar vazio

  // Check user role and render appropriate dashboard
  if (normalizedRole === "professor") {
    return <ProfessorDashboard />;
  }

  // Painel inicial simples para corretor (e-mail) e aplicador (role)
  if (isRestrictedStaff) {
    const handleLogout = () => {
      logout().then(() => navigate("/"));
    };

    return (
      <div className="mx-auto w-full max-w-2xl px-3 sm:px-4 py-10">
        <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-sm p-6 sm:p-8">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="space-y-2">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-purple-500 drop-shadow">
                Seja bem-vindo(a)!
              </h1>
              <p className="text-purple-300/90 text-sm sm:text-base">
                Atalhos para sua rotina.
              </p>
              {user?.name && (
                <p className="text-muted-foreground text-sm sm:text-base">
                  {user.name}
                </p>
              )}
            </div>

            <div className={`w-full grid gap-3 sm:gap-4 ${
                isAplicador ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-4'
              }`}>
              <Link
                to="/app/cartao-resposta/corrigir"
                className="rounded-xl border border-border/60 bg-background/40 hover:bg-accent/40 transition-colors px-2.5 py-4 flex flex-col items-center justify-center gap-2"
              >
                <Ticket className="h-11 w-11 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">
                  Cartão Resposta
                </span>
              </Link>

              <Link
                to="/app/agenda"
                className="rounded-xl border border-border/60 bg-background/40 hover:bg-accent/40 transition-colors px-3 py-4 flex flex-col items-center justify-center gap-2"
              >
                <CalendarDays className="h-11 w-11 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">
                  Agenda
                </span>
              </Link>

              <Link
                to="/app/avaliacoes"
                className="rounded-xl border border-border/60 bg-background/40 hover:bg-accent/40 transition-colors px-3 py-4 flex flex-col items-center justify-center gap-2"
              >
                <ClipboardList className="h-11 w-11 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">
                  Avaliações
                </span>
              </Link>

              {isAplicador && (
                <Link
                  to="/app/modo-offline"
                  className="rounded-xl border border-border/60 bg-background/40 hover:bg-accent/40 transition-colors px-3 py-4 flex flex-col items-center justify-center gap-2"
                >
                  <Smartphone className="h-11 w-11 text-purple-500" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Aplicativo Offline
                  </span>
                </Link>
              )}

              <Link
                to="/app/configuracoes"
                className="rounded-xl border border-border/60 bg-background/40 hover:bg-accent/40 transition-colors px-3 py-4 flex flex-col items-center justify-center gap-2"
              >
                <Settings className="h-11 w-11 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">
                  Configurações
                </span>
              </Link>
            </div>

            <div className="w-full pt-1">
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={handleLogout}
              >
                Sair da conta
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default dashboard for admin and other roles
  return (
    <div className="mobile-container">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
            <LayoutDashboard className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Bem vindo! {user.name ? user.name : "Usuário"}
          </p>
        </div>
      </div>

      {/* Cards de Ação Rápida */}
      <div className="mb-8">
        <ActionCards
          role={normalizedRole}
          onAnaliseSistemaClick={
            normalizedRole === "admin" || normalizedRole === "tecadm"
              ? () => setAnaliseSistemaModalOpen(true)
              : undefined
          }
        />
      </div>

      <AnaliseSistemaModal
        open={analiseSistemaModalOpen}
        onOpenChange={setAnaliseSistemaModalOpen}
      />


      {/* Cards Principais com Performance */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <ModernStatCard
          icon={<Users size={20} className="sm:w-6 sm:h-6" />}
          title="Alunos"
          value={dashboardCounts.students}
          subtitle="Total de estudantes"
          performance={
            dashboardCounts.students > 1000
              ? "excellent"
              : dashboardCounts.students > 500
              ? "good"
              : "average"
          }
          isLoading={isLoadingDashboard}
          delay={0}
        />
        <ModernStatCard
          icon={
            dashboardCounts.institution.label.includes("Turma") ? (
              <List size={20} className="sm:w-6 sm:h-6" />
            ) : (
              <School size={20} className="sm:w-6 sm:h-6" />
            )
          }
          title={dashboardCounts.institution.label}
          value={dashboardCounts.institution.count}
          subtitle={
            dashboardCounts.institution.label.includes("Turma")
              ? "Turmas vinculadas"
              : "Instituições cadastradas"
          }
          performance={
            dashboardCounts.institution.count > 50
              ? "excellent"
              : dashboardCounts.institution.count > 20
              ? "good"
              : "average"
          }
          isLoading={isLoadingDashboard}
          delay={80}
        />
        <ModernStatCard
          icon={<List size={20} className="sm:w-6 sm:h-6" />}
          title="Avaliações"
          value={dashboardCounts.evaluations}
          subtitle="Avaliações ativas"
          performance={
            dashboardCounts.evaluations > 100
              ? "excellent"
              : dashboardCounts.evaluations > 50
              ? "good"
              : "average"
          }
          isLoading={isLoadingDashboard}
          delay={160}
        />
        <ModernStatCard
          icon={<Gamepad size={20} className="sm:w-6 sm:h-6" />}
          title="Jogos"
          value={dashboardCounts.games}
          subtitle="Jogos educacionais"
          performance={
            dashboardCounts.games > 20
              ? "excellent"
              : dashboardCounts.games > 10
              ? "good"
              : "average"
          }
          isLoading={isLoadingDashboard}
          delay={240}
        />
      </div>

      {/* Cards Secundários */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <PerformanceCard
          icon={<User size={20} className="sm:w-6 sm:h-6" />}
          title="Usuários"
          value={dashboardCounts.users}
          subtitle="Usuários do sistema"
          performance={
            dashboardCounts.users > 500
              ? "excellent"
              : dashboardCounts.users > 200
              ? "good"
              : "average"
          }
          isLoading={isLoadingDashboard}
          delay={0}
        />
        <PerformanceCard
          icon={<Headset size={20} className="sm:w-6 sm:h-6" />}
          title="Questões no Banco"
          value={dashboardCounts.questions}
          subtitle="Banco de questões"
          performance={
            dashboardCounts.questions > 150
              ? "excellent"
              : dashboardCounts.questions > 50
              ? "good"
              : "average"
          }
          isLoading={isLoadingDashboard}
          delay={80}
        />
        <PerformanceCard
          icon={<Bell size={20} className="sm:w-6 sm:h-6" />}
          title="Avisos"
          value={avisosQuantidade ?? "--"}
          subtitle="Avisos"
          performance="average"
          isLoading={isLoadingDashboard}
          delay={160}
        />
        <PerformanceCard
          icon={<Award size={20} className="sm:w-6 sm:h-6" />}
          title="Certificados"
          value={certificadosQuantidade ?? "--"}
          subtitle="Certificados"
          performance="average"
          isLoading={isLoadingDashboard}
          delay={240}
        />
      </div>

      {/* Tabelas Interativas - Nova Seção */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Target className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Análises e Rankings</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ClassRankingTable />
          <TopStudentsTable />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RecentEvaluationsTable />
          <QuestionsList />
        </div>
      </div>

    </div>
  );
};

export default Index;
