import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { omrJavaApi, OmrJobProgress } from '@/services/tenant/omrJavaApi';

interface OmrJavaCorrectionTabProps {
  testId?: string;
  defaultTenantId?: string;
}

export function OmrJavaCorrectionTab({ 
  testId = "teste-padrao-123", 
  defaultTenantId = "public" 
}: OmrJavaCorrectionTabProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<OmrJobProgress | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Limpa o polling ao desmontar o componente
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Monitora mudanças no jobId para iniciar o polling
  useEffect(() => {
    if (jobId) {
      startPolling(jobId);
    }
  }, [jobId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      // Resetar estados anteriores
      setJobId(null);
      setJobProgress(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      const response = await omrJavaApi.uploadAnswerSheet(
        selectedFile,
        defaultTenantId,
        "school-default",
        "class-default",
        testId
      );

      toast({
        title: "Upload bem-sucedido",
        description: response.message,
      });

      setJobId(response.jobId);
    } catch (error: any) {
      toast({
        title: "Erro no Upload",
        description: error.response?.data?.error || error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const startPolling = (currentJobId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const progress = await omrJavaApi.getJobProgress(currentJobId, defaultTenantId);
        setJobProgress(progress);

        if (progress.status === 'COMPLETED' || progress.status === 'FAILED') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          
          if (progress.status === 'COMPLETED') {
            toast({
              title: "Correção Finalizada",
              description: "O gabarito foi corrigido com sucesso!",
            });
          } else {
            toast({
              title: "Falha na Correção",
              description: progress.errorDetails || "Ocorreu um erro no processamento OMR.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Erro ao checar progresso:", error);
      }
    }, 2000); // Polling a cada 2 segundos
  };

  const handleDownloadReport = async () => {
    try {
      setIsDownloadingPdf(true);
      await omrJavaApi.downloadTestReport(testId, defaultTenantId);
      toast({
        title: "Download iniciado",
        description: "O PDF do relatório está sendo baixado.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar PDF",
        description: error.response?.data?.message || "Não foi possível baixar o relatório.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="border-blue-200/80 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <Upload className="h-5 w-5" />
            Correção Rápida (OMR Java)
          </CardTitle>
          <CardDescription className="text-blue-900/85 dark:text-blue-100/80">
            Faça upload do cartão-resposta. O processamento ocorrerá em background e você poderá baixar o relatório em PDF assim que concluído.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <FileText className="mr-2 h-4 w-4" />
              {selectedFile ? selectedFile.name : "Selecionar Cartão-Resposta"}
            </Button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            
            <Button 
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar para Correção"
              )}
            </Button>
          </div>

          {/* Área de Progresso */}
          {jobId && jobProgress && (
            <div className="mt-6 space-y-3 rounded-lg border bg-background p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progresso do Processamento</span>
                <span className="text-muted-foreground">{jobProgress.progressPercentage}%</span>
              </div>
              
              <Progress value={jobProgress.progressPercentage} className="h-2" />
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {jobProgress.status === 'PROCESSING' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                {jobProgress.status === 'COMPLETED' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {jobProgress.status === 'FAILED' && <XCircle className="h-4 w-4 text-red-500" />}
                
                <span>{jobProgress.message}</span>
              </div>

              {jobProgress.errorDetails && (
                <div className="mt-2 rounded bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  {jobProgress.errorDetails}
                </div>
              )}
            </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t border-blue-200/40 bg-blue-50/20 px-6 py-4 dark:border-blue-900/40 dark:bg-blue-950/10">
          <Button
            variant="secondary"
            onClick={handleDownloadReport}
            disabled={isDownloadingPdf}
          >
            {isDownloadingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Baixar Relatório (PDF)
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
