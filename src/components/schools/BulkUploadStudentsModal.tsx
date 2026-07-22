import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Upload, FileSpreadsheet, Download, X, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";

interface BulkUploadStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName?: string;
  onSuccess: () => void;
  schoolAddress?: string;
  schoolState?: string;
  schoolMunicipality?: string;
  /** Lista de séries da escola (id + nome), vinda do pai; usada para preencher serie e grade_id no template */
  grades?: { id: string; name: string }[];
  /** Quando informado, força criação/vínculo dos alunos nesta turma. */
  fixedClassId?: string;
  fixedClassName?: string;
  fixedGradeId?: string;
  fixedGradeName?: string;
}

interface UploadResult {
  mensagem: string;
  resumo: {
    total_linhas: number;
    sucessos: number;
    erros: number;
  };
  alunos_criados: Array<{
    nome: string;
    email: string;
    senha: string;
    data_nascimento?: string | null;
    matricula?: string | null;
    escola: string;
    endereco_escola?: string;
    estado_escola?: string;
    municipio_escola?: string;
    curso?: string;
    serie: string;
    turma: string;
    foto_perfil?: string;
  }>;
  erros: Array<{
    linha: number;
    campo: string;
    valor: string;
    erro: string;
  }>;
}

type ImportRow = Record<string, unknown>;

interface UploadErrorResponse {
  response?: {
    data?: Partial<UploadResult> & {
      erro?: string;
    };
  };
  message?: string;
}

class ImportValidationError extends Error {}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeImportText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getImportFieldKey(row: ImportRow, expectedKey: string): string | undefined {
  return Object.keys(row).find(
    (key) => normalizeImportText(key).replace(/^\ufeff/, "") === expectedKey
  );
}

function getGradeNumber(value: unknown): string | undefined {
  return normalizeImportText(value).match(/\d+/)?.[0];
}

function resolveGradeId(
  rawGradeId: unknown,
  rawGradeName: unknown,
  grades: Array<{ id: string; name: string }>
): string | undefined {
  const gradeId = String(rawGradeId ?? "").trim();
  if (UUID_PATTERN.test(gradeId)) return gradeId;

  const references = [rawGradeName, rawGradeId]
    .map(normalizeImportText)
    .filter(Boolean);

  for (const reference of references) {
    const exactMatch = grades.find(
      (grade) =>
        normalizeImportText(grade.id) === reference ||
        normalizeImportText(grade.name) === reference
    );
    if (exactMatch) return exactMatch.id;
  }

  const gradeNumber = getGradeNumber(rawGradeName) ?? getGradeNumber(rawGradeId);
  if (!gradeNumber) return undefined;

  const numericMatches = grades.filter(
    (grade) => getGradeNumber(grade.name) === gradeNumber
  );
  return numericMatches.length === 1 ? numericMatches[0].id : undefined;
}

export function BulkUploadStudentsModal({
  isOpen,
  onClose,
  schoolId,
  schoolName = "Escola",
  onSuccess,
  schoolAddress = "",
  schoolState = "",
  schoolMunicipality = "",
  grades = [],
  fixedClassId,
  fixedClassName,
  fixedGradeId,
  fixedGradeName,
}: BulkUploadStudentsModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Usar valores padrão se não fornecidos
  const address = schoolAddress || "Não informado";
  const state = schoolState || "Não informado";
  const municipality = schoolMunicipality || "Não informado";

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato não suportado",
        description: "Por favor, selecione um arquivo CSV, XLS ou XLSX",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const prepareFileForUpload = async (): Promise<File> => {
    if (!selectedFile) {
      throw new ImportValidationError("Selecione um arquivo para enviar.");
    }

    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await selectedFile.arrayBuffer(), {
      type: "array",
      raw: false,
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) {
      throw new ImportValidationError("O arquivo não possui uma planilha válida.");
    }

    const rows = XLSX.utils.sheet_to_json<ImportRow>(worksheet, {
      defval: "",
      raw: false,
    });
    if (rows.length === 0) {
      throw new ImportValidationError("O arquivo não possui alunos para importar.");
    }

    if (!fixedClassId) {
      const invalidGradeRows: number[] = [];

      rows.forEach((row, index) => {
        const gradeIdKey = getImportFieldKey(row, "grade_id") ?? "grade_id";
        const gradeNameKey = getImportFieldKey(row, "serie");
        const resolvedGradeId = resolveGradeId(
          row[gradeIdKey],
          gradeNameKey ? row[gradeNameKey] : "",
          grades
        );

        if (resolvedGradeId) {
          row[gradeIdKey] = resolvedGradeId;
        } else {
          invalidGradeRows.push(index + 2);
        }
      });

      if (invalidGradeRows.length > 0) {
        const rowsPreview = invalidGradeRows.slice(0, 5).join(", ");
        const remaining = invalidGradeRows.length - 5;
        throw new ImportValidationError(
          `Não foi possível identificar a série nas linhas ${rowsPreview}${
            remaining > 0 ? ` e mais ${remaining}` : ""
          }. Use o nome da série, como 8º Ano, ou baixe o modelo atualizado.`
        );
      }
    }

    const normalizedWorksheet = XLSX.utils.json_to_sheet(rows);
    const csvContent = XLSX.utils.sheet_to_csv(normalizedWorksheet);
    const normalizedName =
      selectedFile.name.replace(/\.(csv|xls|xlsx)$/i, "") + ".csv";

    return new File(["\uFEFF", csvContent], normalizedName, {
      type: "text/csv;charset=utf-8",
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      const preparedFile = await prepareFileForUpload();
      const formData = new FormData();
      formData.append("file", preparedFile);
      if (fixedClassId) {
        formData.append("class_id", fixedClassId);
      }

      const response = await api.post<UploadResult>(
        "/users/bulk-upload-students",
        formData
      );

      setUploadResult(response.data);

      if (response.data.resumo.sucessos > 0) {
        toast({
          title: "Upload concluído com sucesso!",
          description: `${response.data.resumo.sucessos} alunos foram criados. Veja abaixo e baixe as credenciais (CSV/Excel) antes de fechar.`,
        });
        // Não chama onSuccess() aqui: deixa o usuário ver o resultado e baixar os arquivos.
        // onSuccess() será chamado ao fechar o modal (em handleClose).
      } else {
        toast({
          title: "Upload concluído com erros",
          description: "Nenhum aluno foi criado. Verifique os erros abaixo.",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      if (error instanceof ImportValidationError) {
        toast({
          title: "Arquivo inválido",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.error('Erro no upload:', error);
      const uploadError = error as UploadErrorResponse;
      const responseData = uploadError.response?.data;
      
      // Se a resposta contém dados estruturados de erro (erros, resumo, mensagem)
      // isso significa que o servidor processou o arquivo mas encontrou erros
      if (responseData?.erros && responseData?.resumo) {
        const erros = responseData.erros || [];
        
        setUploadResult({
          mensagem: responseData.mensagem || "Nenhum aluno foi criado. Verifique os erros abaixo.",
          resumo: responseData.resumo,
          alunos_criados: responseData.alunos_criados || [],
          erros: erros,
        });
        
        // Construir mensagem de erro detalhada a partir do array de erros
        let errorDescription = "";
        if (erros.length > 0) {
          const primeiroErro = erros[0];
          errorDescription = `Linha ${primeiroErro.linha}: ${primeiroErro.campo} - ${primeiroErro.erro}`;
          if (primeiroErro.valor) {
            errorDescription += ` (Valor: ${primeiroErro.valor})`;
          }
          // Se houver mais erros, adicionar informação
          if (erros.length > 1) {
            errorDescription += ` e mais ${erros.length - 1} erro(s). Verifique os detalhes abaixo.`;
          }
        } else {
          errorDescription = responseData.mensagem || "Nenhum aluno foi criado. Verifique os erros abaixo.";
        }
        
        toast({
          title: "Upload concluído com erros",
          description: errorDescription,
          variant: "destructive",
        });
      } else {
        // Erro genérico (404, 500, etc.)
        let errorMessage = "Erro ao fazer upload do arquivo";
        if (responseData?.erro) {
          errorMessage = responseData.erro;
        } else if (responseData?.mensagem) {
          errorMessage = responseData.mensagem;
        } else if (uploadError.message) {
          errorMessage = uploadError.message;
        }
        
        toast({
          title: "Erro no upload",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    const teveSucesso = (uploadResult?.resumo?.sucessos ?? 0) > 0;
    setSelectedFile(null);
    setUploadResult(null);
    onClose();
    if (teveSucesso) {
      onSuccess();
    }
  };

  const downloadCSVTemplate = () => {
    const headerRow = "nome,data_nascimento,matricula,turma,escola,endereco_escola,estado_escola,municipio_escola,curso,serie,grade_id";
    const rows = fixedClassName && fixedGradeId
      ? [`Exemplo,01/01/2010,2024001,${fixedClassName},${schoolName},${address},${state},${municipality},Anos Finais,${fixedGradeName || ""},${fixedGradeId}`]
      : grades.length > 0
        ? grades.map((g) => `Exemplo,01/01/2010,2024001,A,${schoolName},${address},${state},${municipality},Anos Finais,${g.name},${g.id}`)
        : [`Exemplo,01/01/2010,2024001,A,${schoolName},${address},${state},${municipality},Anos Finais,6º Ano,`];
    const csvContent = [headerRow, ...rows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_alunos.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = async () => {
    try {
      const XLSX = await import("xlsx");

      const headerRow = ["nome", "data_nascimento", "matricula", "turma", "escola", "endereco_escola", "estado_escola", "municipio_escola", "curso", "serie", "grade_id"];
      const dataRows = fixedClassName && fixedGradeId
        ? [["Exemplo", "01/01/2010", "2024001", fixedClassName, schoolName, address, state, municipality, "Anos Finais", fixedGradeName || "", fixedGradeId]]
        : grades.length > 0
          ? grades.map((g) => ["Exemplo", "01/01/2010", "2024001", "A", schoolName, address, state, municipality, "Anos Finais", g.name, g.id])
          : [["Exemplo", "01/01/2010", "2024001", "A", schoolName, address, state, municipality, "Anos Finais", "6º Ano", ""]];
      const templateData = [headerRow, ...dataRows];

      const worksheet = XLSX.utils.aoa_to_sheet(templateData);

      const columnWidths = [
        { wch: 20 }, // nome
        { wch: 15 }, // data_nascimento
        { wch: 12 }, // matricula
        { wch: 8 },  // turma
        { wch: 25 }, // escola
        { wch: 30 }, // endereco_escola
        { wch: 8 },  // estado_escola
        { wch: 20 }, // municipio_escola
        { wch: 20 }, // curso
        { wch: 12 }, // serie
        { wch: 38 }, // grade_id (UUID)
      ];
      worksheet["!cols"] = columnWidths;

      for (let col = 0; col < templateData[0].length; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4472C4" } },
            alignment: { horizontal: "center" },
          };
        }
      }

      for (let row = 1; row < templateData.length; row++) {
        for (let col = 0; col < templateData[row].length; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = {
              fill: { fgColor: { rgb: "F2F2F2" } },
            };
          }
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template Alunos");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template_alunos.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Modelo Excel baixado",
        description: "O arquivo Excel (.xlsx) foi baixado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao gerar arquivo Excel:", error);
      toast({
        title: "Erro ao gerar arquivo Excel",
        description: "Não foi possível gerar o arquivo Excel. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const downloadAlunosCriadosCSV = () => {
    if (!uploadResult?.alunos_criados?.length) return;
    const headers = ["nome", "email", "senha", "matricula", "escola", "serie", "turma"];
    const headerRow = headers.join(",");
    const rows = uploadResult.alunos_criados.map(
      (a) =>
        [
          `"${(a.nome || "").replace(/"/g, '""')}"`,
          `"${(a.email || "").replace(/"/g, '""')}"`,
          `"${(a.senha || "").replace(/"/g, '""')}"`,
          `"${(a.matricula ?? "").toString().replace(/"/g, '""')}"`,
          `"${(a.escola || "").replace(/"/g, '""')}"`,
          `"${(a.serie || "").replace(/"/g, '""')}"`,
          `"${(a.turma || "").replace(/"/g, '""')}"`,
        ].join(",")
    );
    const csvContent = [headerRow, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alunos_criados_credenciais.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "CSV baixado", description: "Arquivo com nomes, emails e senhas dos alunos criados." });
  };

  const downloadAlunosCriadosExcel = async () => {
    if (!uploadResult?.alunos_criados?.length) return;
    try {
      const XLSX = await import("xlsx");
      const headers = ["nome", "email", "senha", "matricula", "escola", "serie", "turma"];
      const rows = uploadResult.alunos_criados.map((a) => [
        a.nome || "",
        a.email || "",
        a.senha || "",
        a.matricula ?? "",
        a.escola || "",
        a.serie || "",
        a.turma || "",
      ]);
      const data = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const columnWidths = [{ wch: 25 }, { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 8 }];
      worksheet["!cols"] = columnWidths;
      for (let col = 0; col < headers.length; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "2E7D32" } },
            alignment: { horizontal: "center" },
          };
        }
      }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos criados");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "alunos_criados_credenciais.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Excel baixado", description: "Arquivo com nomes, emails e senhas dos alunos criados." });
    } catch (error) {
      console.error("Erro ao gerar Excel de alunos criados:", error);
      toast({
        title: "Erro ao gerar Excel",
        description: "Não foi possível gerar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            {fixedClassName ? `Importar Alunos em Massa - Turma ${fixedClassName}` : "Importar Alunos em Massa"}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Importe uma lista de alunos através de um arquivo CSV ou Excel.
            {fixedClassName && (
              <strong> Todos os alunos serão vinculados na turma {fixedClassName}.</strong>
            )} 
            {fixedClassName ? (
              <> No modo de turma fixa, basta preencher pelo menos a coluna <strong>nome</strong>; as demais colunas podem permanecer no formato do modelo.</>
            ) : (
              <> O arquivo deve conter as colunas: <strong>nome, data_nascimento, matricula, turma, escola, endereco_escola, estado_escola, municipio_escola, curso, serie, grade_id</strong>. 
              Use <strong>grade_id</strong> (id da série) para evitar erros de comparação no backend; o modelo baixado já vem com os grade_id das séries desta escola quando houver turmas cadastradas.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 py-4">
          {/* Template Download - gerado no frontend com dados da escola */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Modelos de Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Baixe o modelo CSV ou Excel. Escola, endereço, estado, município, curso, série (nome) e <strong>grade_id</strong> (id da série) vêm preenchidos quando a escola tem turmas. Preencha nome, data de nascimento, matrícula e turma (ex.: A, B, C). O <strong>grade_id</strong> evita erros de comparação no backend.
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={downloadCSVTemplate}>
                    <FileText className="h-4 w-4 mr-2" />
                    Baixar CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadExcelTemplate}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Baixar Excel (.xlsx)
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                  <strong>Colunas do arquivo:</strong> nome, data_nascimento, matricula, turma, escola, endereco_escola, estado_escola, municipio_escola, curso, serie, grade_id
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Selecionar Arquivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                
                {!selectedFile ? (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Arraste e solte um arquivo aqui
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ou clique para selecionar
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Selecionar Arquivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remover
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Enviar Arquivo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upload Result */}
          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resultado do Upload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {uploadResult.resumo.total_linhas}
                    </div>
                    <div className="text-xs text-gray-500">Total de Linhas</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResult.resumo.sucessos}
                    </div>
                    <div className="text-xs text-green-600">Sucessos</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {uploadResult.resumo.erros}
                    </div>
                    <div className="text-xs text-red-600">Erros</div>
                  </div>
                </div>

                {/* Success Message */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {uploadResult.mensagem}
                    </span>
                  </div>
                </div>

                {/* Created Students - exibe email e senha e permite baixar CSV/Excel */}
                {uploadResult.alunos_criados.length > 0 && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h4 className="font-medium text-sm">Alunos Criados (com email e senha)</h4>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={downloadAlunosCriadosCSV}>
                          <FileText className="h-4 w-4 mr-2" />
                          Baixar CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={downloadAlunosCriadosExcel}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Baixar Excel
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {uploadResult.alunos_criados.map((aluno, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded border border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                            <div>
                              <div className="font-medium text-foreground">{aluno.nome}</div>
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">Email:</span> {aluno.email}
                              </div>
                              <div className="text-xs text-gray-700">
                                <span className="font-medium">Senha:</span> {aluno.senha}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {aluno.matricula && <div>Matrícula: {aluno.matricula}</div>}
                              <div>{aluno.turma} – {aluno.serie}</div>
                              <div>{aluno.escola}</div>
                              {aluno.data_nascimento && <div>Nasc: {aluno.data_nascimento}</div>}
                              {aluno.curso && <div>Curso: {aluno.curso}</div>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {uploadResult.erros.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-red-700">Erros Encontrados</h4>
                    <div className="space-y-2">
                      {uploadResult.erros.map((erro, index) => (
                        <div key={index} className="flex items-start gap-3 p-2 bg-red-50 rounded border border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-red-800">
                              Linha {erro.linha}: {erro.campo}
                            </div>
                            <div className="text-xs text-red-600">
                              Valor: {erro.valor}
                            </div>
                            <div className="text-xs text-red-600">
                              Erro: {erro.erro}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
