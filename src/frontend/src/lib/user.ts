import { BACKEND_BASE_URL } from "@/config"

export interface UserStruct { email: string; createdAt: string }
export interface RegisterData { email: string; password: string; code: string }
export interface LoginData { email: string; password: string }
export interface ChangePasswordData { currentPassword: string; newPassword: string }
export interface ResetPasswordData { email: string; code: string; newPassword: string }

export async function sendRequest<T>(url: string, data: T): Promise<unknown> {
  const response = await fetch(url, {
    credentials: "include",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(errorText || `Request error: ${response.status}`)
  }
  if (response.headers.get("content-type")?.includes("application/json")) {
    return await response.json()
  }
  return await response.text()
}

export const authService = {
  register: (data: RegisterData) => sendRequest(`${BACKEND_BASE_URL}/auth/register`, data),
  login: (data: LoginData) => sendRequest(`${BACKEND_BASE_URL}/auth/login`, data),
  changePassword: (data: ChangePasswordData) => sendRequest(`${BACKEND_BASE_URL}/auth/change`, data),
  resetPassword: (data: ResetPasswordData) => sendRequest(`${BACKEND_BASE_URL}/auth/reset`, data),

  sendCode: async (): Promise<void> => {
    const res = await fetch(`${BACKEND_BASE_URL}/auth/code`)
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(text || `Request error: ${res.status}`)
    }
  },

  logout: async (): Promise<void> => {
    try {
      await fetch(`${BACKEND_BASE_URL}/auth/logout`, { credentials: "include" })
    } catch {
    }
  },
}