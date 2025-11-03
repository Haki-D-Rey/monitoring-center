// ==============================================
// src/types/profileUser.ts
// ==============================================

export type ProfileUserSafeDTO = {
  id: number;
  userId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  address?: string;
  phone?: string;
  cus?: string;
  profession?: string;
  company?: string;
  position?: string;
  experience?: number;
  linkedinUrl?: string;
  githubUrl?: string;
  skills?: string[];     // default: []
  bio?: string;
  status: boolean;
  createdAt: Date;
  updatedAt?: Date;
};

export type ProfileUserCreateDTO = {
  userId?: number | null; // puede crearse sin asignar al user todavía
  firstName: string;
  lastName: string;
  email: string;
  address?: string | null;
  phone?: string | null;
  cus?: string | null;
  profession?: string | null;
  company?: string | null;
  position?: string | null;
  experience?: number | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  skills?: string[] | null;
  bio?: string | null;
  status?: boolean;
};

export type ProfileUserUpdateDTO = Partial<Omit<ProfileUserCreateDTO, "email">> & {
  email?: string; // si permites actualizar email
};

export type ProfileUserQuery = {
  page: number;
  pageSize: number;
  q?: string;            // búsqueda por nombre/apellido/email
  status?: boolean;      // activos/inactivos
  userId?: number;       // filtrar por user asignado
};

export type ProfileUserPage = {
  data: ProfileUserSafeDTO[];
  total: number;
  page: number;
  pageSize: number;
};
