import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface BnccSkill {
  codigo?: string;
  code?: string;
  descricao?: string;
  description?: string;
}

export interface ImportBnccModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (count?: number) => void;
  subjects: Array<{ id: string; name: string }>;
  grades: Array<{ id: string; name: string }>;
  defaultSubjectId?: string;
  defaultGradeId?: string;
}

const ImportBnccModal = ({
  open,
  onOpenChange,
  onSuccess,
  subjects,
  grades,
  defaultSubjectId,
  defaultGradeId,
}: ImportBnccModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [bnccSkills, setBnccSkills] = useState<BnccSkill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  
  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId || "");
  const [gradeId, setGradeId] = useState<string>(defaultGradeId || "");
  
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar habilidades da BNCC quando abrir o modal ou mudar a busca
  const loadBnccSkills = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      // Endpoint que mapeia para o proxy BnccService no backend
      // Podemos mandar searchTerm se houver suporte na API da BNCC, caso contrário buscamos tudo e filtramos localmente.
      const { data } = await api.get<BnccSkill[]>("/bncc/habilidades");
      setBnccSkills(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Erro ao buscar BNCC:", err);
      setError("Não foi possível carregar as habilidades da base da BNCC.");
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setSelectedSkills(new Set());
      setSubjectId(defaultSubjectId || "");
      setGradeId(defaultGradeId || "");
      loadBnccSkills();
    }
  }, [open, defaultSubjectId, defaultGradeId, loadBnccSkills]);

  const filteredSkills = useMemo(() => {
    if (!searchTerm) return bnccSkills;
    const lower = searchTerm.toLowerCase();
    return bnccSkills.filter((s) => {
      const code = s.codigo || s.code || "";
      const desc = s.descricao || s.description || "";
      return code.toLowerCase().includes(lower) || desc.toLowerCase().includes(lower);
    });
  }, [bnccSkills, searchTerm]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allCodes = new Set(filteredSkills.map(s => s.codigo || s.code || "").filter(Boolean));
      setSelectedSkills(allCodes);
    } else {
      setSelectedSkills(new Set());
    }
  };

  const toggleSkill = (code: string, checked: boolean) => {
    const next = new Set(selectedSkills);
    if (checked) {
      next.add(code);
    } else {
      next.delete(code);
    }
    setSelectedSkills(next);
  };

  const handleImport = async () => {
    if (selectedSkills.size === 0) {
      setError("Selecione pelo menos uma habilidade.");
      return;
    }

    setImporting(true);
    setError(null);
    try {
      // Montar payload para salvar no DB local
      const skillsToImport = bnccSkills
        .filter(s => selectedSkills.has(s.codigo || s.code || ""))
        .map(s => ({
          code: s.codigo || s.code || "",
          description: s.descricao || s.description || "",
          subject_id: subjectId || undefined,
          grade_id: gradeId || undefined,
        }));

      const { data } = await api.post<{ count?: number }>("/skills/batch", { skills: skillsToImport });
      const created = data?.count ?? 0;
      
      onSuccess(created);
      onOpenChange(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Erro ao importar habilidades.";
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const isAllSelected = filteredSkills.length > 0 && selectedSkills.size === filteredSkills.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle>Importar Habilidades da BNCC</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 px-4 gap-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="mb-1 block text-sm font-medium">Disciplina (Opcional)</Label>
              <Select value={subjectId || "none"} onValueChange={(v) => setSubjectId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a uma disciplina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhuma —</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="mb-1 block text-sm font-medium">Série (Opcional)</Label>
              <Select value={gradeId || "none"} onValueChange={(v) => setGradeId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a uma série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhuma —</SelectItem>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar na base da BNCC (código ou descrição)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 border rounded-md overflow-hidden bg-muted/20 flex flex-col min-h-0 relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error && !bnccSkills.length ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-destructive">
                {error}
              </div>
            ) : filteredSkills.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-muted-foreground text-sm">
                {bnccSkills.length === 0 ? "Nenhuma habilidade encontrada na API da BNCC." : "Nenhuma habilidade corresponde à sua busca."}
              </div>
            ) : null}

            {filteredSkills.length > 0 && (
              <div className="p-3 bg-muted/50 border-b flex items-center gap-3">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(c) => toggleSelectAll(!!c)}
                  id="select-all-bncc"
                />
                <Label htmlFor="select-all-bncc" className="font-medium cursor-pointer">
                  Selecionar Todos ({filteredSkills.length})
                </Label>
              </div>
            )}
            
            <ScrollArea className="flex-1">
              <div className="p-3 divide-y">
                {filteredSkills.map((skill, idx) => {
                  const code = skill.codigo || skill.code || "";
                  const desc = skill.descricao || skill.description || "";
                  const uniqueKey = code || idx.toString();
                  return (
                    <div key={uniqueKey} className="py-2.5 flex items-start gap-3 hover:bg-muted/30 transition-colors rounded-md px-2">
                      <Checkbox
                        checked={selectedSkills.has(code)}
                        onCheckedChange={(c) => toggleSkill(code, !!c)}
                        className="mt-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
                          {code}
                        </div>
                        <div className="text-sm text-foreground leading-snug">
                          {desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {error && bnccSkills.length > 0 && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="p-4 border-t shrink-0">
          <div className="flex-1 text-sm text-muted-foreground flex items-center">
            {selectedSkills.size} {selectedSkills.size === 1 ? "selecionada" : "selecionadas"}
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={importing || selectedSkills.size === 0}>
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              "Importar Selecionadas"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportBnccModal;
