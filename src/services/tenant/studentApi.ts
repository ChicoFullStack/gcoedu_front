import { api } from '@/lib/api';
import { School } from './schoolApi';
import { SchoolClass } from './schoolClassApi';

export interface Student {
    id: string;
    name: string;
    registration?: string;
    schoolId?: string;
    schoolClassId?: string;
    school?: School;
    schoolClass?: SchoolClass;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateStudentDTO = Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'school' | 'schoolClass'> & { isActive?: boolean };
export type UpdateStudentDTO = Partial<CreateStudentDTO>;

const BASE_URL = '/v1/tenant/students';

export const studentApi = {
    findAll: async (schoolId?: string): Promise<Student[]> => {
        const url = schoolId ? `${BASE_URL}?schoolId=${schoolId}` : BASE_URL;
        const response = await api.get<Student[]>(url);
        return response.data;
    },

    findById: async (id: string): Promise<Student> => {
        const response = await api.get<Student>(`${BASE_URL}/${id}`);
        return response.data;
    },

    create: async (data: CreateStudentDTO): Promise<Student> => {
        const response = await api.post<Student>(BASE_URL, data);
        return response.data;
    },

    update: async (id: string, data: UpdateStudentDTO): Promise<Student> => {
        const response = await api.put<Student>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`${BASE_URL}/${id}`);
    }
};
