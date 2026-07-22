import { api } from '@/lib/api';
import { Question } from './questionApi';

export interface Test {
    id: string;
    name: string;
    description?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    questions?: Question[];
}

export type CreateTestDTO = Omit<Test, 'id' | 'createdAt' | 'updatedAt' | 'questions'>;
export type UpdateTestDTO = Partial<CreateTestDTO>;

const BASE_URL = '/v1/tenant/tests';

export const testApi = {
    findAll: async (params?: Record<string, any>): Promise<Test[]> => {
        const response = await api.get<Test[]>(BASE_URL, { params });
        return response.data;
    },

    findById: async (id: string): Promise<Test> => {
        const response = await api.get<Test>(`${BASE_URL}/${id}`);
        return response.data;
    },

    create: async (data: CreateTestDTO): Promise<Test> => {
        const response = await api.post<Test>(BASE_URL, data);
        return response.data;
    },

    update: async (id: string, data: UpdateTestDTO): Promise<Test> => {
        const response = await api.put<Test>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`${BASE_URL}/${id}`);
    },

    getQuestions: async (testId: string): Promise<Question[]> => {
        const response = await api.get<Question[]>(`${BASE_URL}/${testId}/questions`);
        return response.data;
    },

    addQuestion: async (testId: string, questionId: string): Promise<void> => {
        await api.post(`${BASE_URL}/${testId}/questions/${questionId}`);
    },

    removeQuestion: async (testId: string, questionId: string): Promise<void> => {
        await api.delete(`${BASE_URL}/${testId}/questions/${questionId}`);
    },
    
    // Extensões para Turmas (Classes) usadas em Olimpíadas
    getClasses: async (testId: string): Promise<any[]> => {
        const response = await api.get<any[]>(`${BASE_URL}/${testId}/classes`);
        return response.data;
    },
    
    addClasses: async (testId: string, classIds: string[]): Promise<void> => {
        await api.post(`${BASE_URL}/${testId}/classes`, { class_ids: classIds });
    },
    
    removeClasses: async (testId: string, classIds: string[]): Promise<void> => {
        await api.post(`${BASE_URL}/${testId}/classes/remove`, { class_ids: classIds });
    },
    
    applyTest: async (testId: string, data: any): Promise<void> => {
        await api.post(`${BASE_URL}/${testId}/apply`, data);
    }
};
