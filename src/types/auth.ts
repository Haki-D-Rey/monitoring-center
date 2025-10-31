export interface RegisterPayload {
  email: string
  password: string
  roleId: number
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthTokenPayload {
  id: number
}
