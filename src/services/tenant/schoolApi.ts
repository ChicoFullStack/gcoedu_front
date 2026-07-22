import { api } from '@/lib/api';

export interface School {
    id: string;
    name: string;
    inepCode?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateSchoolDTO = Omit<School, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> & { isActive?: boolean };
export type UpdateSchoolDTO = Partial<CreateSchoolDTO>;

const BASE_URL = '/v1/tenant/schools';

export const schoolApi = {
    findAll: async (): Promise<School[]> => {
        const response = await api.get<School[]>(BASE_URL);
        return response.data;
    },

    findById: async (id: string): Promise<School> => {
        const response = await api.get<School>(`${BASE_URL}/${id}`);
        return response.data;
    },

    create: async (data: CreateSchoolDTO): Promise<School> => {
        const response = await api.post<School>(BASE_URL, data);
        return response.data;
    },

    update: async (id: string, data: UpdateSchoolDTO): Promise<School> => {
        const response = await api.put<School>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`${BASE_URL}/${id}`);
    }
};
