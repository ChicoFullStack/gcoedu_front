import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, HelpCircle } from "lucide-react";
import { Question } from "@/components/evaluations/types";
import QuestionForm from "@/components/evaluations/questions/QuestionForm";

const CreateQuestionPage = () => {
  const navigate = useNavigate();
  const handleSubmit = (_questionData: Question) => {
    navigate("/app/cadastros/questao");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950/30 dark:via-background dark:to-purple-950/30">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header aprimorado */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate("/app/cadastros/questao")}
              className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-300 dark:hover:border-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Banco de Questões
            </Button>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
                <HelpCircle className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
                Criar Nova Questão
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Adicione uma nova questão ao banco de questões da plataforma
              </p>
            </div>
          </div>


        </div>

        {/* Formulário */}
        <div className="max-w-5xl mx-auto">
          <QuestionForm
            open={true}
            onClose={() => navigate("/app/cadastros/questao")}
            onQuestionAdded={handleSubmit}
          />
        </div>


      </div>
    </div>
  );
};

export default CreateQuestionPage; 
