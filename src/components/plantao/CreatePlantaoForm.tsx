import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, School, GraduationCap, BookOpen, X, Check, ChevronsUpDown, MapPin, Building2, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CreatePlantaoOnlineDTO } from '@/types/plantao';

interface PlayTvSchool {
  id: string;
  name: string;
  city_id?: string;
}

interface PlayTvGrade {
  id: string;
  name: string;
}

interface PlayTvSubject {
  id: string;
  name: string;
}

interface CreatePlantaoFormProps {
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
  grade_id?: string;
  grade?: ApiNamedEntity;
}

interface ApiMunicipalityEntity extends ApiNamedEntity {
  state?: string;
}

export function CreatePlantaoForm({
  onSuccess,
  userRole,
  userMunicipioId,
  userMunicipioName,
  userMunicipioState,
  userEscolaId,
  userTurmas,
}: CreatePlantaoFormProps) {
  const { toast } = useToast();
  const isGlobalAdmin = userRole === 'admin';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  // Estados do formulário
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [selectedSchools, setSelectedSchools] = useState<PlayTvSchool[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

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

  const effectiveMunicipalityId = isGlobalAdmin
    ? selectedMunicipality
    : (userMunicipioId ?? '');

  const filteredMunicipalities = useMemo(
    () => municipalities.filter((municipality) => municipality.state === selectedState),
    [municipalities, selectedState]
  );

  // Apenas ADMIN escolhe outro município; os demais perfis usam o tenant autenticado.
  useEffect(() => {
    if (isGlobalAdmin) {
      loadAdminLocations();
    } else {
      setStates([]);
      setMunicipalities([]);
    }
    loadSubjects();
    // Os loaders usam o contexto da renderização que disparou a troca de perfil.
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
    setGradesLoadError(null);
    setSelectedGrade('');
  }, [isGlobalAdmin, selectedState]);

  // O backend resolve o tenant pelo JWT ou pelo cityId explícito do ADMIN.
  useEffect(() => {
    if (effectiveMunicipalityId) {
      loadSchools();
      setSelectedSchools([]);
      setGrades([]);
      setGradesLoadError(null);
      setSelectedGrade('');
    } else {
      setSchools([]);
      setFilteredSchools([]);
      setSelectedSchools([]);
    }
    // O município efetivo é a chave autoritativa desta carga.
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
      // ADMIN e TECADM recebem do backend somente as escolas do tenant ativo.
      setFilteredSchools(schools);
    }
  }, [schools, userRole, userEscolaId, userTurmas, selectedSchools.length]);

  // Carregar séries quando escolas são selecionadas
  useEffect(() => {
    const loadGradesForProfessor = async () => {
      if (userRole === 'professor' && userTurmas && userTurmas.length > 0) {
        // Para professor, usar séries das suas turmas
        setIsLoadingGrades(true);
        setGradesLoadError(null);
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
        ...(isGlobalAdmin && selectedMunicipality
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
          ...(isGlobalAdmin && selectedMunicipality
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

  const validateUrl = (meetLink: string): boolean => {
    if (!meetLink.trim()) return false;
    
    try {
      const url = new URL(meetLink);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      // Aceitar links do Google Meet mesmo que não sejam URLs completas
      return meetLink.includes('meet.google.com') || meetLink.includes('zoom.us') || meetLink.includes('teams.microsoft.com');
    }
  };

  const validateForm = (): boolean => {
    if (!link.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'O link da reunião é obrigatório',
        variant: 'destructive',
      });
      return false;
    }

    if (!validateUrl(link)) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, insira uma URL válida (Google Meet, Zoom, Teams, etc.)',
        variant: 'destructive',
      });
      return false;
    }

    if (!title.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'O título do plantão é obrigatório',
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

    return true;
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
      const plantaoData: CreatePlantaoOnlineDTO = {
        link: link.trim(),
        title: title.trim(),
        schools: selectedSchools.map(s => s.id),
        grade: selectedGrade,
        subject: selectedSubject,
      };

      await api.post('/plantao-online', plantaoData, {
        ...(isGlobalAdmin && selectedMunicipality
          ? { meta: { cityId: selectedMunicipality } }
          : {}),
      });

      toast({
        title: 'Plantão online cadastrado com sucesso!',
        description: 'O plantão foi publicado e está disponível para os alunos.',
      });

      // Limpar formulário
      setLink('');
      setTitle('');
      setSelectedSchools([]);
      setSelectedGrade('');
      setSelectedSubject('');

      onSuccess();
    } catch (error: unknown) {
      const apiError = error as {
        status?: number;
        response?: {
          status?: number;
          data?: { message?: string };
        };
      };
      // Mensagem específica para quando o endpoint não existe
      let errorMessage = 'Não foi possível cadastrar o plantão online. Tente novamente.';
      const is404 = apiError.response?.status === 404 || apiError.status === 404;
      
      if (is404) {
        errorMessage = 'Endpoint ainda não implementado no sistema. Aguarde a implementação da API.';
        // Não logar erro para endpoints que ainda não existem
      } else {
        console.error('Erro ao cadastrar plantão online:', error);
        if (apiError.response?.data?.message) {
          errorMessage = apiError.response.data.message;
        }
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
        <CardTitle>Cadastrar Novo Plantão Online</CardTitle>
        <CardDescription>
          Adicione um link de reunião para os alunos acessarem
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Link da Reunião */}
          <div className="space-y-2">
            <Label htmlFor="link">
              Link da Reunião <span className="text-red-500">*</span>
            </Label>
            <Input
              id="link"
              type="url"
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Cole o link da reunião (Google Meet, Zoom, Teams, etc.)
            </p>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Título do Plantão <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Ex: Plantão de Matemática"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/100 caracteres
            </p>
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

          {/* Botão de Enviar */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLink('');
                setTitle('');
                setSelectedState('');
                setSelectedMunicipality(isGlobalAdmin ? '' : (userMunicipioId ?? ''));
                setSelectedSchools([]);
                setSelectedGrade('');
                setSelectedSubject('');
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
                  Cadastrar Plantão
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
