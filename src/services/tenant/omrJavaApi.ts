import { api } from '@/lib/api';

/**
 * Interface para a resposta do upload (Inicia o Job)
 */
export interface OmrUploadResponse {
    jobId: string;
    message: string;
}

/**
 * Interface para o progresso do Job
 */
export interface OmrJobProgress {
    jobId: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progressPercentage: number;
    message: string;
    errorDetails?: string;
    resultData?: any;
    completedAt?: string;
}

const JAVA_BASE_URL = import.meta.env.VITE_JAVA_API_BASE_URL || 'http://localhost:8080';

export const omrJavaApi = {
    /**
     * Faz upload de uma imagem de cartão-resposta para correção OMR no backend Java.
     */
    uploadAnswerSheet: async (
        file: File, 
        tenantId: string = 'public',
        schoolId?: string,
        classId?: string,
        testId?: string
    ): Promise<OmrUploadResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        if (schoolId) formData.append('schoolId', schoolId);
        if (classId) formData.append('classId', classId);
        if (testId) formData.append('testId', testId);

        const response = await api.post<OmrUploadResponse>(
            `${JAVA_BASE_URL}/api/v1/tenant/omr/upload`, 
            formData, 
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'X-Tenant-ID': tenantId
                }
            }
        );
        return response.data;
    },

    /**
     * Consulta o progresso de um Job assíncrono de correção no Redis.
     */
    getJobProgress: async (jobId: string, tenantId: string = 'public'): Promise<OmrJobProgress> => {
        const response = await api.get<OmrJobProgress>(
            `${JAVA_BASE_URL}/api/v1/tenant/omr/progress/${jobId}`,
            {
                headers: {
                    'X-Tenant-ID': tenantId
                }
            }
        );
        return response.data;
    },

    /**
     * Faz download do PDF do relatório de uma prova.
     */
    downloadTestReport: async (testId: string, tenantId: string = 'public'): Promise<void> => {
        const response = await api.get(
            `${JAVA_BASE_URL}/api/v1/tenant/reports/test/${testId}/pdf`,
            {
                headers: {
                    'X-Tenant-ID': tenantId
                },
                responseType: 'blob'
            }
        );

        // Criar URL e forçar o download
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        
        // Tenta obter o nome do arquivo do header Content-Disposition se disponível
        let filename = `relatorio_prova_${testId}.pdf`;
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition && contentDisposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(contentDisposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        
        // Limpeza
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
};
