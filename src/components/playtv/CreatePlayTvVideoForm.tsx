import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, School, GraduationCap, BookOpen, X, Check, ChevronsUpDown, MapPin, Building2, Link2, Paperclip, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FormMultiSelect } from '@/components/ui/form-multi-select';
import {
  extractCreatedPlayTvVideoId,
  getPlayTvApiErrorMessage,
  PLAY_TV_MAX_UPLOAD_BYTES,
  uploadPlayTvFileResource,
  validatePlayTvVideoUrl,
} from '@/lib/playtv';
import { CreatePlayTvVideoDTO, PlayTvSchool, PlayTvGrade, PlayTvSubject } from '@/types/playtv';

interface CreatePlayTvVideoFormProps {
  onSuccess: () => void;
  userRole: string;
  userMunicipioId?: string;
  userMunicipioName?: string;
  userMunicipioState?: string;
  userEscolaId?: string;
  userTurmas?: Array<{ class_id: string; school_id: string; grade_id: string; subject_id?: string }>;
}

interface ApiNamedEntity {
  id: string;
  name?: string;
  nome?: string;
}

interface ApiClassEntity extends ApiNamedEntity {
  school_id?: string;
  grade_id?: string;
  grade?: ApiNamedEntity;
}

interface ApiMunicipalityEntity extends ApiNamedEntity {
  state?: string;
}

export function CreatePlayTvVideoForm({
  onSuccess,
  userRole,
  userMunicipioId,
  userMunicipioName,
  userMunicipioState,
  userEscolaId,
  userTurmas,
}: CreatePlayTvVideoFormProps) {
  const { toast } = useToast();
  const isGlobalAdmin = userRole === 'admin';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  // Estados do formulário
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [selectedSchools, setSelectedSchools] = useState<PlayTvSchool[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  type LocalLinkRow = { key: string; title: string; url: string };
  type LocalFileRow = { key: string; title: string; file: File | null };
  const [linkRows, setLinkRows] = useState<LocalLinkRow[]>([]);
  const [fileRows, setFileRows] = useState<LocalFileRow[]>([]);

  // Estados dos popovers
  const [openStateCombo, setOpenStateCombo] = useState(false);
  const [openMunicipalityCombo, setOpenMunicipalityCombo] = useState(false);
  const [openSchoolCombo, setOpenSchoolCombo] = useState(false);
  const [openGradeCombo, setOpenGradeCombo] = useState(false);
  const [openSubjectCombo, setOpenSubjectCombo] = useState(false);

  // Listas de opções
  const [states, setStates] = useState<Array<{ id: string; nome: string }>>([]);
  const [municipalities, setMunicipalities] = useState<Array<{ id: string; nome: string; state?: string }>>([]);
  const [schools, setSchools] = useState<PlayTvSchool[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<PlayTvSchool[]>([]);
  const [grades, setGrades] = useState<PlayTvGrade[]>([]);
  const [gradesLoadError, setGradesLoadError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<PlayTvSubject[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [classesOptions, setClassesOptions] = useState<Array<{ id: string; name: string; school_id?: string; grade_id?: string }>>([]);

  const professorAllowedClassIds = useMemo(() => {
    if (userRole !== 'professor') return null;
    const ids = (userTurmas ?? []).map((t) => t.class_id).filter(Boolean);
    return new Set(ids);
  }, [userRole, userTurmas]);

  const effectiveMunicipalityId = isGlobalAdmin
    ? selectedMunicipality
    : (userMunicipioId ?? '');

  const filteredMunicipalities = useMemo(
    () => municipalities.filter((municipality) => municipality.state === selectedState),
    [municipalities, selectedState]
  );

  // Apenas ADMIN precisa do diretório geográfico para trocar o tenant de referência.
  useEffect(() => {
    if (isGlobalAdmin) {
      loadAdminLocations();
    } else {
      setStates([]);
      setMunicipalities([]);
    }
    loadSubjects();
    // Os loaders usam o contexto da mesma renderização que disparou a troca de perfil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGlobalAdmin, userRole]);

  // Perfis vinculados recebem o município do contexto autenticado, sem seleção manual.
  useEffect(() => {
    if (!isGlobalAdmin) {
      setSelectedMunicipality(userMunicipioId ?? '');
    }
  }, [isGlobalAdmin, userMunicipioId]);

  // Para ADMIN, o estado apenas filtra o diretório de municípios já carregado.
  useEffect(() => {
    if (!isGlobalAdmin) return;
    setSelectedMunicipality('');
    setSelectedSchools([]);
    setFilteredSchools([]);
    setGrades([]);
    setSelectedGrade('');
  }, [isGlobalAdmin, selectedState]);

  // O backend resolve o tenant pelo JWT para perfis vinculados e pelo cityId para ADMIN.
  useEffect(() => {
    if (effectiveMunicipalityId) {
      loadSchools();
      setSelectedSchools([]);
      setGrades([]);
      setSelectedGrade('');
    } else {
      setSchools([]);
      setFilteredSchools([]);
      setSelectedSchools([]);
    }
    // O município é a chave autoritativa desta carga; o loader não é uma dependência de negócio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMunicipalityId]);

  // Filtrar escolas baseado no município selecionado ou role do usuário
  useEffect(() => {
    if (userRole === 'professor' && userTurmas && userTurmas.length > 0) {
      // Professor vê apenas escolas das suas turmas
      const allowedSchoolIds = new Set(userTurmas.map(t => t.school_id));
      const filtered = schools.filter(school => allowedSchoolIds.has(school.id));
      setFilteredSchools(filtered);
      
      // Auto-selecionar escolas das turmas do professor
      if (filtered.length > 0 && selectedSchools.length === 0) {
        const uniqueSchools = Array.from(
          new Map(filtered.map(s => [s.id, s])).values()
        );
        setSelectedSchools(uniqueSchools);
      }
    } else if ((userRole === 'diretor' || userRole === 'coordenador') && userEscolaId && schools.length > 0) {
      // Diretor/Coordenador vê apenas sua escola
      const filtered = schools.filter(school => school.id === userEscolaId);
      setFilteredSchools(filtered);
      // Auto-selecionar a escola do usuário
      if (filtered.length > 0 && selectedSchools.length === 0) {
        setSelectedSchools([filtered[0]]);
      }
    } else {
      // ADMIN e TECADM recebem do backend apenas as escolas do tenant ativo.
      setFilteredSchools(schools);
    }
  }, [schools, userRole, userEscolaId, userTurmas, selectedSchools.length]);

  // Carregar séries quando escolas são selecionadas
  useEffect(() => {
    const loadGradesForProfessor = async () => {
      if (userRole === 'professor' && userTurmas && userTurmas.length > 0) {
        // Para professor, usar séries das suas turmas
        setIsLoadingGrades(true);
        try {
          const allowedGradeIds = new Set(userTurmas.map(t => t.grade_id));
          const allGradesResponse = await api.get('/grades/').catch(() => ({ data: [] }));
          const allGrades = allGradesResponse.data || [];
          const filteredGrades = allGrades.filter((grade: { id: string }) => 
            allowedGradeIds.has(grade.id)
          );
          setGrades(filteredGrades);
        } catch (error) {
          console.error('Erro ao carregar séries do professor:', error);
          setGrades([]);
        } finally {
          setIsLoadingGrades(false);
        }
      } else if (selectedSchools.length > 0) {
        loadGradesForSchools();
      } else {
        setGrades([]);
        setGradesLoadError(null);
        setSelectedGrade('');
      }
    };

    loadGradesForProfessor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchools, userRole, userTurmas]);

  // Carregar turmas quando escola(s) e série forem selecionadas
  useEffect(() => {
    const loadClassesForSelection = async () => {
      setSelectedClasses([]);
      setClassesOptions([]);

      if (selectedSchools.length === 0 || !selectedGrade) return;

      setIsLoadingClasses(true);
      try {
        const classPromises = selectedSchools.map((school) =>
          api.get(`/classes/school/${school.id}`, {
            ...(userRole === 'admin' && selectedMunicipality
              ? { meta: { cityId: selectedMunicipality } }
              : {}),
          })
        );
        const classResponses = await Promise.all(classPromises);

        const normalized = classResponses.flatMap((res, idx) => {
          const school = selectedSchools[idx];
          const data = res.data || [];
          return (Array.isArray(data) ? data : []).map((c: ApiClassEntity) => ({
            id: String(c.id),
            name: String(c.name ?? c.nome ?? ''),
            school_id: String(c.school_id ?? school?.id ?? ''),
            grade_id: String(c.grade_id ?? c.grade?.id ?? ''),
          }));
        });

        const filteredByGrade = normalized.filter((c) => c.grade_id === selectedGrade);
        const filteredByRole =
          userRole === 'professor' && professorAllowedClassIds
            ? filteredByGrade.filter((c) => professorAllowedClassIds.has(c.id))
            : filteredByGrade;

        const dedup = Array.from(new Map(filteredByRole.map((c) => [c.id, c])).values());
        setClassesOptions(dedup);
      } catch (error) {
        console.error('Erro ao carregar turmas:', error);
        setClassesOptions([]);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as turmas das escolas selecionadas',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingClasses(false);
      }
    };

    loadClassesForSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchools, selectedGrade, userRole, professorAllowedClassIds]);

  const loadAdminLocations = async () => {
    setIsLoadingStates(true);
    setIsLoadingMunicipalities(true);
    try {
      const response = await api.get('/city');
      const cityRows = Array.isArray(response.data) ? response.data : [];
      const normalizedMunicipalities = cityRows
        .map((municipality: ApiMunicipalityEntity) => ({
          id: municipality.id,
          nome: municipality.nome || municipality.name || '',
          state: municipality.state?.trim(),
        }))
        .filter((municipality) => municipality.id && municipality.nome && municipality.state);

      setMunicipalities(normalizedMunicipalities);
      setStates(
        Array.from(new Set(normalizedMunicipalities.map((municipality) => municipality.state as string)))
          .sort((a, b) => a.localeCompare(b, 'pt-BR'))
          .map((state) => ({ id: state, nome: state }))
      );
    } catch (error) {
      console.error('Erro ao carregar municípios:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de municípios',
        variant: 'destructive',
      });
      setStates([]);
      setMunicipalities([]);
    } finally {
      setIsLoadingStates(false);
      setIsLoadingMunicipalities(false);
    }
  };

  const loadSchools = async () => {
    setIsLoadingSchools(true);
    try {
      const response = await api.get('/school/', {
        ...(userRole === 'admin' && selectedMunicipality
          ? { meta: { cityId: selectedMunicipality } }
          : {}),
      });
      const schoolsData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setSchools(schoolsData);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de escolas',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const loadGradesForSchools = async () => {
    if (selectedSchools.length === 0) return;

    setIsLoadingGrades(true);
    setGradesLoadError(null);
    try {
      // Buscar turmas de todas as escolas selecionadas para obter as séries disponíveis
      const classPromises = selectedSchools.map(school =>
        api.get(`/classes/school/${school.id}`, {
          ...(userRole === 'admin' && selectedMunicipality
            ? { meta: { cityId: selectedMunicipality } }
            : {}),
        })
      );

      const [classResponses, gradesResponse] = await Promise.all([
        Promise.all(classPromises),
        api.get('/grades/'),
      ]);
      const gradeCatalog = Array.isArray(gradesResponse.data) ? gradesResponse.data : [];
      const gradesById = new Map<string, PlayTvGrade>(
        gradeCatalog
          .map((grade: ApiNamedEntity) => ({
            id: String(grade.id),
            name: String(grade.name ?? grade.nome ?? ''),
          }))
          .filter((grade: PlayTvGrade) => grade.id && grade.name)
          .map((grade: PlayTvGrade) => [grade.id, grade])
      );
      const gradeMap = new Map<string, PlayTvGrade>();

      classResponses.forEach(response => {
        const classesData = Array.isArray(response.data) ? response.data : [];
        classesData.forEach((classItem: ApiClassEntity) => {
          const gradeId = String(classItem.grade_id ?? classItem.grade?.id ?? '');
          const grade = gradesById.get(gradeId);
          if (grade && !gradeMap.has(gradeId)) {
            gradeMap.set(gradeId, grade);
          }
        });
      });

      const allGrades = Array.from(gradeMap.values());
      setGrades(allGrades);
      setSelectedGrade((currentGrade) =>
        currentGrade && !gradeMap.has(currentGrade) ? '' : currentGrade
      );
    } catch (error) {
      console.error('Erro ao carregar séries:', error);
      setGrades([]);
      setSelectedGrade('');
      setGradesLoadError('Não foi possível carregar as séries das escolas selecionadas');
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as séries das escolas selecionadas',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingGrades(false);
    }
  };

  const loadSubjects = async () => {
    setIsLoadingSubjects(true);
    try {
      const response = await api.get('/subjects');
      const allSubjects = response.data || [];
      
      // Para professor, filtrar apenas disciplinas das suas turmas (se disponível)
      if (userRole === 'professor' && userTurmas && userTurmas.length > 0) {
        const allowedSubjectIds = userTurmas
          .map(t => t.subject_id)
          .filter((id): id is string => id !== undefined);
        
        if (allowedSubjectIds.length > 0) {
          setSubjects(allSubjects.filter((subject: { id: string }) => 
            allowedSubjectIds.includes(subject.id)
          ));
        } else {
          // Se não tiver subject_id nas turmas, mostrar todas
          setSubjects(allSubjects);
        }
      } else {
        setSubjects(allSubjects);
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de disciplinas',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const validateForm = (): boolean => {
    if (!url.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'O link do vídeo é obrigatório',
        variant: 'destructive',
      });
      return false;
    }

    if (!validatePlayTvVideoUrl(url)) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, insira uma URL válida',
        variant: 'destructive',
      });
      return false;
    }

    if (isGlobalAdmin && !selectedState) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione um estado',
        variant: 'destructive',
      });
      return false;
    }

    if (!effectiveMunicipalityId) {
      toast({
        title: isGlobalAdmin ? 'Erro de validação' : 'Município não vinculado',
        description: isGlobalAdmin
          ? 'Selecione um município'
          : 'Seu usuário não possui município vinculado. Entre em contato com o administrador.',
        variant: 'destructive',
      });
      return false;
    }

    if (selectedSchools.length === 0) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione pelo menos uma escola',
        variant: 'destructive',
      });
      return false;
    }

    if (!selectedGrade) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione uma série',
        variant: 'destructive',
      });
      return false;
    }

    if (!selectedSubject) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione uma disciplina',
        variant: 'destructive',
      });
      return false;
    }

    if (userRole === 'professor') {
      if (!userTurmas || userTurmas.length === 0) {
        toast({
          title: 'Turmas do professor',
          description: 'Nenhuma turma vinculada ao seu usuário. Entre em contato com o administrador.',
          variant: 'destructive',
        });
        return false;
      }
      if (selectedClasses.length === 0) {
        toast({
          title: 'Erro de validação',
          description: 'Selecione pelo menos uma turma',
          variant: 'destructive',
        });
        return false;
      }
    }

    return validateComplementaryResources();
  };

  const validateComplementaryResources = (): boolean => {
    for (const row of linkRows) {
      const t = row.title.trim();
      const u = row.url.trim();
      if (!t && !u) continue;
      if (!t || !u) {
        toast({
          title: 'Material complementar',
          description: 'Cada link precisa de nome e URL.',
          variant: 'destructive',
        });
        return false;
      }
      if (t.length > 200) {
        toast({
          title: 'Material complementar',
          description: 'Título do link: no máximo 200 caracteres.',
          variant: 'destructive',
        });
        return false;
      }
      if (!validatePlayTvVideoUrl(u)) {
        toast({
          title: 'Material complementar',
          description: 'Informe uma URL válida (http/https) para o link.',
          variant: 'destructive',
        });
        return false;
      }
    }

    for (const row of fileRows) {
      if (!row.file) continue;
      const t = row.title.trim();
      if (!t) {
        toast({
          title: 'Material complementar',
          description: 'Cada arquivo precisa de um nome (título) para exibição.',
          variant: 'destructive',
        });
        return false;
      }
      if (t.length > 200) {
        toast({
          title: 'Material complementar',
          description: 'Título do arquivo: no máximo 200 caracteres.',
          variant: 'destructive',
        });
        return false;
      }
      if (row.file.size > PLAY_TV_MAX_UPLOAD_BYTES) {
        toast({
          title: 'Material complementar',
          description: `Arquivo "${row.file.name}" excede o limite de 50 MB.`,
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const addLinkRow = () => {
    setLinkRows((prev) => [...prev, { key: crypto.randomUUID(), title: '', url: '' }]);
  };

  const removeLinkRow = (key: string) => {
    setLinkRows((prev) => prev.filter((r) => r.key !== key));
  };

  const updateLinkRow = (key: string, patch: Partial<Pick<LocalLinkRow, 'title' | 'url'>>) => {
    setLinkRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addFileRow = () => {
    setFileRows((prev) => [...prev, { key: crypto.randomUUID(), title: '', file: null }]);
  };

  const removeFileRow = (key: string) => {
    setFileRows((prev) => prev.filter((r) => r.key !== key));
  };

  const updateFileRow = (key: string, patch: Partial<Pick<LocalFileRow, 'title' | 'file'>>) => {
    setFileRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const handleToggleSchool = (school: PlayTvSchool) => {
    const isSelected = selectedSchools.some(s => s.id === school.id);
    if (isSelected) {
      setSelectedSchools(selectedSchools.filter(s => s.id !== school.id));
    } else {
      setSelectedSchools([...selectedSchools, school]);
    }
  };

  const handleRemoveSchool = (schoolId: string) => {
    setSelectedSchools(selectedSchools.filter(s => s.id !== schoolId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const linkResources = linkRows
        .filter((r) => r.title.trim() && r.url.trim())
        .map((r, i) => ({
          type: 'link' as const,
          title: r.title.trim(),
          url: r.url.trim(),
          sort_order: i,
        }));

      const videoData: CreatePlayTvVideoDTO = {
        url: url.trim(),
        title: title.trim() || undefined,
        schools: selectedSchools.map(s => s.id),
        ...(selectedClasses.length > 0 ? { classes: selectedClasses } : {}),
        grade: selectedGrade,
        subject: selectedSubject,
        ...(linkResources.length > 0 ? { resources: linkResources } : {}),
      };

      const selectedCityId = userRole === 'admin' ? selectedMunicipality : undefined;
      const createRes = await api.post('/play-tv/videos', videoData, {
        ...(selectedCityId ? { meta: { cityId: selectedCityId } } : {}),
      });
      const videoId = extractCreatedPlayTvVideoId(createRes.data);

      const filesToUpload = fileRows.filter((r): r is LocalFileRow & { file: File } => r.file !== null);
      const uploadErrors: string[] = [];
      let missingVideoIdForFiles = false;

      if (filesToUpload.length > 0) {
        if (!videoId) {
          missingVideoIdForFiles = true;
        } else {
          const linkCount = linkResources.length;
          for (let i = 0; i < filesToUpload.length; i++) {
            const row = filesToUpload[i];
            try {
              await uploadPlayTvFileResource(
                api,
                videoId,
                row.file,
                row.title,
                linkCount + i,
                selectedCityId
              );
            } catch (uploadErr) {
              console.error('Erro ao enviar anexo Play TV:', uploadErr);
              uploadErrors.push(getPlayTvApiErrorMessage(uploadErr, row.file.name));
            }
          }
        }
      }

      if (missingVideoIdForFiles) {
        toast({
          title: 'Vídeo cadastrado',
          description:
            'O vídeo foi salvo, mas não foi possível obter o ID da resposta para enviar os anexos. Verifique na listagem ou tente cadastrar os anexos novamente quando a API retornar o objeto do vídeo.',
          variant: 'destructive',
        });
      } else if (uploadErrors.length > 0) {
        toast({
          title: 'Vídeo cadastrado com avisos',
          description: `O vídeo foi salvo, mas parte dos anexos falhou: ${uploadErrors.slice(0, 2).join(' · ')}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Vídeo cadastrado com sucesso!',
          description:
            filesToUpload.length > 0
              ? 'O vídeo e os materiais complementares foram enviados.'
              : 'O vídeo foi publicado e está disponível para os alunos.',
        });
      }

      // Limpar formulário
      setUrl('');
      setTitle('');
      setSelectedSchools([]);
      setSelectedGrade('');
      setSelectedSubject('');
      setSelectedClasses([]);
      setLinkRows([]);
      setFileRows([]);

      onSuccess();
    } catch (error: unknown) {
      let errorMessage = 'Não foi possível cadastrar o vídeo. Tente novamente.';
      const err = error as { response?: { status?: number }; status?: number };
      const is404 = err.response?.status === 404 || err.status === 404;

      if (is404) {
        errorMessage = 'O município ou algum vínculo selecionado não foi encontrado. Atualize as opções e tente novamente.';
      } else {
        console.error('Erro ao cadastrar vídeo:', error);
        errorMessage = getPlayTvApiErrorMessage(error, errorMessage);
      }

      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedGradeData = grades.find(g => g.id === selectedGrade);
  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastrar Novo Vídeo</CardTitle>
        <CardDescription>
          Adicione um vídeo para os alunos assistirem
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Link do Vídeo */}
          <div className="space-y-2">
            <Label htmlFor="url">
              Link do Vídeo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Cole o link do vídeo (YouTube, Vimeo, etc.)
            </p>
          </div>

          {/* Título (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Título do Vídeo (opcional)
            </Label>
            <Input
              id="title"
              placeholder="Título do vídeo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/100 caracteres
            </p>
          </div>

          {/* Materiais complementares (links + arquivos) */}
          <div className="space-y-4 rounded-lg border border-dashed border-primary/25 bg-muted/30 p-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                Material complementar (opcional)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Links são enviados com o vídeo. Arquivos (até 50 MB cada) são enviados em seguida automaticamente.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Links
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addLinkRow}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar link
                </Button>
              </div>
              {linkRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum link extra. Use o botão acima para incluir.</p>
              ) : (
                <div className="space-y-3">
                  {linkRows.map((row) => (
                    <div key={row.key} className="flex flex-col sm:flex-row gap-2 sm:items-end border rounded-md p-3 bg-background">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Nome do link</Label>
                        <Input
                          placeholder="Ex.: Leitura complementar"
                          value={row.title}
                          maxLength={200}
                          onChange={(e) => updateLinkRow(row.key, { title: e.target.value })}
                        />
                      </div>
                      <div className="flex-[2] space-y-2">
                        <Label className="text-xs">URL</Label>
                        <Input
                          type="url"
                          placeholder="https://..."
                          value={row.url}
                          onChange={(e) => updateLinkRow(row.key, { url: e.target.value })}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0"
                        onClick={() => removeLinkRow(row.key)}
                        aria-label="Remover link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  Arquivos
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addFileRow}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar arquivo
                </Button>
              </div>
              {fileRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum arquivo. PDFs e outros anexos podem ser incluídos aqui.</p>
              ) : (
                <div className="space-y-3">
                  {fileRows.map((row) => (
                    <div key={row.key} className="flex flex-col gap-2 border rounded-md p-3 bg-background">
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs">Nome exibido</Label>
                          <Input
                            placeholder="Ex.: Roteiro da aula (PDF)"
                            value={row.title}
                            maxLength={200}
                            onChange={(e) => updateFileRow(row.key, { title: e.target.value })}
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs">Arquivo</Label>
                          <Input
                            type="file"
                            className="cursor-pointer"
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              updateFileRow(row.key, { file: f });
                            }}
                          />
                          {row.file && (
                            <p className="text-xs text-muted-foreground">
                              {(row.file.size / (1024 * 1024)).toFixed(2)} MB
                              {row.file.size > PLAY_TV_MAX_UPLOAD_BYTES ? ' — excede 50 MB' : ''}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive shrink-0 self-end"
                          onClick={() => removeFileRow(row.key)}
                          aria-label="Remover arquivo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Seleção de Disciplina */}
          <div className="space-y-2">
            <Label>
              Disciplina <span className="text-red-500">*</span>
            </Label>
            <Popover open={openSubjectCombo} onOpenChange={setOpenSubjectCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSubjectCombo}
                  className="w-full justify-between"
                  disabled={isLoadingSubjects}
                >
                  {selectedSubject
                    ? selectedSubjectData?.name
                    : "Selecione uma disciplina..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar disciplina..." />
                  <CommandEmpty>Nenhuma disciplina encontrada.</CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {subjects.length > 0 ? (
                      subjects.map((subject) => {
                        const subjectName = subject.name || '';
                        return (
                          <CommandItem
                            key={subject.id}
                            value={subjectName}
                            onSelect={() => {
                              setSelectedSubject(subject.id);
                              setOpenSubjectCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedSubject === subject.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{subjectName}</span>
                          </CommandItem>
                        );
                      })
                    ) : (
                      <CommandItem disabled>
                        <span className="text-muted-foreground">Nenhuma disciplina disponível</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {isGlobalAdmin ? (
            <>
          {/* Seleção de Estado */}
          <div className="space-y-2">
            <Label>
              Estado <span className="text-red-500">*</span>
            </Label>
            <Popover open={openStateCombo} onOpenChange={setOpenStateCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openStateCombo}
                  className="w-full justify-between"
                  disabled={isLoadingStates}
                >
                  {selectedState
                    ? states.find(state => state.id === selectedState)?.nome
                    : isLoadingStates
                    ? "Carregando estados..."
                    : "Selecione um estado..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar estado..." />
                  <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {states.length > 0 ? (
                      states.map((state) => {
                        const stateName = state.nome;
                        return (
                          <CommandItem
                            key={state.id}
                            value={stateName}
                            onSelect={() => {
                              setSelectedState(state.id);
                              setOpenStateCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedState === state.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{stateName}</span>
                          </CommandItem>
                        );
                      })
                    ) : (
                      <CommandItem disabled>
                        <span className="text-muted-foreground">Nenhum estado disponível</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Seleção de Município */}
          <div className="space-y-2">
            <Label>
              Município <span className="text-red-500">*</span>
            </Label>
            <Popover open={openMunicipalityCombo} onOpenChange={setOpenMunicipalityCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openMunicipalityCombo}
                  className="w-full justify-between"
                  disabled={isLoadingMunicipalities || !selectedState}
                >
                  {selectedMunicipality
                    ? municipalities.find(municipality => municipality.id === selectedMunicipality)?.nome
                    : !selectedState
                    ? "Selecione um estado primeiro..."
                    : isLoadingMunicipalities
                    ? "Carregando municípios..."
                    : "Selecione um município..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar município..." />
                  <CommandEmpty>
                    {!selectedState
                      ? "Selecione um estado primeiro"
                      : "Nenhum município encontrado para o estado selecionado"}
                  </CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {filteredMunicipalities.length > 0 ? (
                      filteredMunicipalities.map((municipality) => {
                        const municipalityName = municipality.nome;
                        return (
                          <CommandItem
                            key={municipality.id}
                            value={municipalityName}
                            onSelect={() => {
                              setSelectedMunicipality(municipality.id);
                              setOpenMunicipalityCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedMunicipality === municipality.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{municipalityName}</span>
                          </CommandItem>
                        );
                      })
                    ) : (
                      <CommandItem disabled>
                        <span className="text-muted-foreground">Nenhum município disponível</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Município</Label>
              {effectiveMunicipalityId ? (
                <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">
                      {userMunicipioName || 'Município vinculado'}
                      {userMunicipioState ? ` – ${userMunicipioState}` : ''}
                    </span>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    Definido pelo perfil
                  </Badge>
                </div>
              ) : (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  Seu usuário não possui município vinculado. Entre em contato com o administrador.
                </div>
              )}
            </div>
          )}

          {/* Seleção de Escolas */}
          <div className="space-y-2">
            <Label>
              Escolas <span className="text-red-500">*</span>
            </Label>
            <Popover open={openSchoolCombo} onOpenChange={setOpenSchoolCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSchoolCombo}
                  className="w-full justify-between"
                  disabled={isLoadingSchools || !effectiveMunicipalityId}
                >
                  {selectedSchools.length > 0
                    ? `${selectedSchools.length} escola${selectedSchools.length !== 1 ? 's' : ''} selecionada${selectedSchools.length !== 1 ? 's' : ''}`
                    : !effectiveMunicipalityId
                    ? "Selecione um município primeiro..."
                    : "Selecione as escolas..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar escola..." />
                  <CommandEmpty>
                    {!effectiveMunicipalityId
                      ? "Selecione um município primeiro"
                      : "Nenhuma escola encontrada para o município selecionado"}
                  </CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {filteredSchools.length > 0 ? (
                      filteredSchools.map((school) => {
                        const schoolName = school.name || '';
                        return (
                          <CommandItem
                            key={school.id}
                            value={schoolName}
                            onSelect={() => handleToggleSchool(school)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedSchools.some(s => s.id === school.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <School className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{schoolName}</span>
                          </CommandItem>
                        );
                      })
                    ) : (
                      <CommandItem disabled>
                        <span className="text-muted-foreground">Nenhuma escola disponível</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            
            {/* Escolas selecionadas */}
            {selectedSchools.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedSchools.map((school) => (
                  <Badge key={school.id} variant="secondary" className="flex items-center gap-1">
                    {school.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveSchool(school.id)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {!effectiveMunicipalityId && (
              <p className="text-xs text-muted-foreground">
                Selecione um município para visualizar as escolas disponíveis
              </p>
            )}
            {selectedSchools.length > 0 && (
              <p className="text-xs text-muted-foreground">
                As séries serão filtradas pelas escolas selecionadas
              </p>
            )}
          </div>

          {/* Seleção de Série */}
          <div className="space-y-2">
            <Label>
              Série <span className="text-red-500">*</span>
            </Label>
            <Popover open={openGradeCombo} onOpenChange={setOpenGradeCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openGradeCombo}
                  className="w-full justify-between"
                  disabled={isLoadingGrades || selectedSchools.length === 0}
                >
                  {selectedGrade
                    ? selectedGradeData?.name
                    : selectedSchools.length === 0
                    ? "Selecione escolas primeiro..."
                    : isLoadingGrades
                    ? "Carregando séries..."
                    : "Selecione uma série..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar série..." />
                  <CommandEmpty>
                    {selectedSchools.length === 0
                      ? "Selecione escolas primeiro"
                      : gradesLoadError
                      ? gradesLoadError
                      : "Nenhuma série encontrada para as escolas selecionadas"}
                  </CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {grades.length > 0 ? (
                      grades.map((grade) => {
                        const gradeName = grade.name || '';
                        return (
                          <CommandItem
                            key={grade.id}
                            value={gradeName}
                            onSelect={() => {
                              setSelectedGrade(grade.id);
                              setOpenGradeCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedGrade === grade.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{gradeName}</span>
                          </CommandItem>
                        );
                      })
                    ) : (
                      <CommandItem disabled>
                        <span className="text-muted-foreground">Nenhuma série disponível</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedSchools.length > 0 && grades.length === 0 && !isLoadingGrades && (
              <p className="text-xs text-destructive">
                {gradesLoadError ?? 'Nenhuma série cadastrada para as escolas selecionadas'}
              </p>
            )}
          </div>

          {/* Seleção de Turmas */}
          <div className="space-y-2">
            <Label>
              Turmas {userRole === 'professor' ? <span className="text-red-500">*</span> : null}
            </Label>
            <FormMultiSelect
              options={classesOptions.map((c) => ({ id: c.id, name: c.name }))}
              selected={selectedClasses}
              onChange={setSelectedClasses}
              placeholder={
                selectedSchools.length === 0
                  ? 'Selecione escolas primeiro...'
                  : !selectedGrade
                  ? 'Selecione uma série primeiro...'
                  : isLoadingClasses
                  ? 'Carregando turmas...'
                  : classesOptions.length === 0
                  ? 'Nenhuma turma disponível'
                  : 'Selecione uma ou mais turmas...'
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {userRole === 'professor'
                ? 'Você só pode selecionar turmas vinculadas ao seu usuário.'
                : 'Opcional. Se não selecionar turmas, o vídeo fica disponível para as escolas/série informadas.'}
            </p>
          </div>

          {/* Botão de Enviar */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUrl('');
                setTitle('');
                setSelectedState('');
                setSelectedMunicipality(isGlobalAdmin ? '' : (userMunicipioId ?? ''));
                setSelectedSchools([]);
                setSelectedGrade('');
                setSelectedSubject('');
                setSelectedClasses([]);
                setLinkRows([]);
                setFileRows([]);
              }}
              disabled={isSubmitting}
            >
              Limpar
            </Button>
            <Button type="submit" disabled={isSubmitting || !effectiveMunicipalityId}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Cadastrar Vídeo
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
