import { RoleSafeDTO } from "./role";

export interface User {
  id: number
  email: string
  password: string
  roleId: number
}

export type UserSafeDTO = {
  id: number | null;
  email: string;
  roleId: number;
  role: RoleSafeDTO;
  status: boolean;
  createdAt: Date;
  updatedAt?: Date;
  refreshToken?: string;
};


export type UserCreateDTO = {
  email: string;
  password: string; // texto plano en input; se hashea en service
  roleId: number;
  status?: boolean;
  refreshToken?: string | null;
};


export type UserUpdateDTO = Partial<{
  email: string;
  password: string; // si viene, se hashea
  roleId: number;
  status: boolean;
  refreshToken: string | null;
}>;


export type UserWithProfileDTO = UserSafeDTO & {
  profile?: {
    id: number | null;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    status: boolean;
  } | null;
};

export type UserQuery = {
  page: number;
  pageSize: number;
  q?: string;
  status?: boolean;
  roleId?: number;
};

/** Response del listado paginado */
// export type UserPage = {
//   data: UserSafeDTO[];
//   total: number;
//   page: number;
//   pageSize: number;
// };

// Ejemplo: el “row” de la tabla
export type UserPage = UserSafeDTO;