import { api } from '@/lib/api';
import { School } from './schoolApi';

export interface SchoolClass {
    id: string;
    name: string;
    shift?: string;
    schoolId: string;
    gradeId?: string;
    school?: School;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateSchoolClassDTO = Omit<SchoolClass, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'school'> & { isActive?: boolean };
export type UpdateSchoolClassDTO = Partial<CreateSchoolClassDTO>;

interface SchoolClassApiPayload extends Partial<SchoolClass> {
    id: string;
    name: string;
    school_id?: string;
    grade_id?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

const BASE_URL = '/v1/tenant/classes';

const normalizeSchoolClass = (payload: SchoolClassApiPayload): SchoolClass => ({
    ...payload,
    schoolId: payload.schoolId ?? payload.school_id ?? '',
    gradeId: payload.gradeId ?? payload.grade_id,
    isActive: payload.isActive ?? payload.is_active,
    createdAt: payload.createdAt ?? payload.created_at,
    updatedAt: payload.updatedAt ?? payload.updated_at,
});

export const schoolClassApi = {
    findAll: async (schoolId?: string): Promise<SchoolClass[]> => {
        const url = schoolId ? `${BASE_URL}?schoolId=${schoolId}` : BASE_URL;
        const response = await api.get<SchoolClassApiPayload[]>(url);
        return response.data.map(normalizeSchoolClass);
    },

    findById: async (id: string): Promise<SchoolClass> => {
        const response = await api.get<SchoolClassApiPayload>(`${BASE_URL}/${id}`);
        return normalizeSchoolClass(response.data);
    },

    create: async (data: CreateSchoolClassDTO): Promise<SchoolClass> => {
        const response = await api.post<SchoolClassApiPayload>(BASE_URL, data);
        return normalizeSchoolClass(response.data);
    },

    update: async (id: string, data: UpdateSchoolClassDTO): Promise<SchoolClass> => {
        const response = await api.put<SchoolClassApiPayload>(`${BASE_URL}/${id}`, data);
        return normalizeSchoolClass(response.data);
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`${BASE_URL}/${id}`);
    }
};
