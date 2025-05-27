// src/useUserRoleStore.ts
import { create } from 'zustand'

type Role = 'host' | 'guest'

export const useUserRoleStore = create<{
  role: Role
  setRole: (role: Role) => void
}>((set) => ({
  role: 'guest',
  setRole: (role) => set({ role }),
}))
