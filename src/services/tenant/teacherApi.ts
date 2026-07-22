import { api } from '@/lib/api';

export interface Teacher {
    id: string;
    name: string;
    registration?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateTeacherDTO = Omit<Teacher, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> & { isActive?: boolean };
export type UpdateTeacherDTO = Partial<CreateTeacherDTO>;

const BASE_URL = '/v1/tenant/teachers';

export const teacherApi = {
    findAll: async (schoolId?: string): Promise<Teacher[]> => {
        const url = schoolId ? `${BASE_URL}?schoolId=${schoolId}` : BASE_URL;
        const response = await api.get<Teacher[]>(url);
        return response.data;
    },

    findById: async (id: string): Promise<Teacher> => {
        const response = await api.get<Teacher>(`${BASE_URL}/${id}`);
        return response.data;
    },

    create: async (data: CreateTeacherDTO): Promise<Teacher> => {
        const response = await api.post<Teacher>(BASE_URL, data);
        return response.data;
    },

    update: async (id: string, data: UpdateTeacherDTO): Promise<Teacher> => {
        const response = await api.put<Teacher>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`${BASE_URL}/${id}`);
    }
};
