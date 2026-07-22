import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Cog,
  FileText,
  Plus,
  Settings,
  Upload,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  color: string;
  bgColor: string;
}

function ActionCard({
  icon,
  title,
  description,
  action,
  color,
  bgColor,
}: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={action}
      className="group w-full rounded-xl bg-card text-left shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={`rounded-lg p-3 ${bgColor} transition-transform duration-200 group-hover:scale-110`}
        >
          <div className={color}>{icon}</div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-sm font-semibold transition-colors group-hover:text-primary">
            {title}
          </h3>
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
            {description}
          </p>
          <span className="inline-flex h-8 items-center rounded-md px-2 text-xs transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            Acessar
            <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </button>
  );
}

interface CompactActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  iconBackground: string;
}

function CompactAction({
  icon,
  title,
  description,
  action,
  iconBackground,
}: CompactActionProps) {
  return (
    <button
      type="button"
      onClick={action}
      className="group w-full rounded-xl border border-border bg-card p-3 text-left transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-center gap-2">
        <div className={`rounded-lg p-2 ${iconBackground}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-medium text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

interface ActionCardsProps {
  role?: string;
  onAnaliseSistemaClick?: () => void;
}

export default function ActionCards({
  role,
  onAnaliseSistemaClick,
}: ActionCardsProps) {
  const navigate = useNavigate();
  const normalizedRole = String(role ?? "").toLowerCase();
  const canConfigure =
    normalizedRole === "admin" || normalizedRole === "tecadm";
  const canManageAcademic = [
    "admin",
    "tecadm",
    "diretor",
    "coordenador",
  ].includes(normalizedRole);
  const canManageUsers = canManageAcademic;

  const actions = [
    {
      icon: <Plus className="h-5 w-5" />,
      title: "Criar Nova Avaliação",
      description:
        "Crie uma nova avaliação personalizada com questões de múltipla escolha, dissertativas e mais.",
      action: () => navigate("/app/criar-avaliacao"),
      color: "text-primary",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      visible: canManageAcademic,
    },
    {
      icon: <Upload className="h-5 w-5" />,
      title: "Importar Alunos",
      description:
        "Importe uma lista de alunos em lote usando planilhas CSV ou Excel para agilizar o cadastro.",
      action: () => navigate("/app/cadastros/gestao?tab=usuarios"),
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      visible: canManageUsers,
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Gerar Relatório",
      description:
        "Gere relatórios detalhados de performance, estatísticas e análises personalizadas.",
      action: () => navigate("/app/relatorios/analise-avaliacoes"),
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      visible: canManageAcademic,
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: "Configurar Sistema",
      description:
        "Configure parâmetros do sistema, usuários, permissões e integrações.",
      action: () => navigate("/app/configuracoes"),
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      visible: canConfigure,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="mb-4 flex items-center gap-2">
        <Cog className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Ações Rápidas</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {actions
          .filter((action) => action.visible)
          .map((action) => (
            <ActionCard key={action.title} {...action} />
          ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {canManageUsers && (
          <CompactAction
            icon={
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            }
            title="Gerenciar Usuários"
            description="Adicionar, editar e gerenciar usuários do sistema"
            action={() => navigate("/app/cadastros/gestao?tab=usuarios")}
            iconBackground="bg-indigo-50 dark:bg-indigo-950/30"
          />
        )}
        {canManageAcademic && (
          <>
            <CompactAction
              icon={
                <BookOpen className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              }
              title="Banco de Questões"
              description="Criar e gerenciar questões para avaliações"
              action={() => navigate("/app/cadastros/questao")}
              iconBackground="bg-teal-50 dark:bg-teal-950/30"
            />
            <CompactAction
              icon={
                <BarChart3 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              }
              title="Análise de Dados"
              description="Visualizar métricas e tendências do sistema"
              action={
                onAnaliseSistemaClick ?? (() => navigate("/app/resultados"))
              }
              iconBackground="bg-cyan-50 dark:bg-cyan-950/30"
            />
          </>
        )}
      </div>
    </div>
  );
}
