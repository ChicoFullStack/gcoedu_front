import { api } from '@/lib/api';

export interface Question {
    id: string;
    description: string;
    subjectId?: string;
    topic?: string;
    difficulty?: string;
    type?: string;
    options?: any[]; // adjust based on actual structure
    answer?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateQuestionDTO = Omit<Question, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateQuestionDTO = Partial<CreateQuestionDTO>;

const BASE_URL = '/v1/tenant/questions';

export const questionApi = {
    findAll: async (params?: Record<string, any>): Promise<Question[]> => {
        const response = await api.get<Question[]>(BASE_URL, { params });
        return response.data;
    },

    findById: async (id: string): Promise<Question> => {
        const response = await api.get<Question>(`${BASE_URL}/${id}`);
        return response.data;
    },

    create: async (data: CreateQuestionDTO): Promise<Question> => {
        const response = await api.post<Question>(BASE_URL, data);
        return response.data;
    },

    update: async (id: string, data: UpdateQuestionDTO): Promise<Question> => {
        const response = await api.put<Question>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`${BASE_URL}/${id}`);
    }
};
