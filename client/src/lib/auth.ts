import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getAuthHeader: () => Record<string, string>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
          }

          const data = await response.json();
          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { session } = get();
        if (session?.access_token) {
          try {
            await fetch('/auth/logout', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            });
          } catch (error) {
            console.error('Logout error:', error);
          }
        }
        set({
          user: null,
          session: null,
          isAuthenticated: false,
        });
      },

      refreshToken: async () => {
        const { session } = get();
        if (!session?.refresh_token) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await fetch('/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: session.refresh_token }),
          });

          if (!response.ok) {
            set({ user: null, session: null, isAuthenticated: false });
            throw new Error('Token refresh failed');
          }

          const data = await response.json();
          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
          });
        } catch (error) {
          set({ user: null, session: null, isAuthenticated: false });
          throw error;
        }
      },

      getAuthHeader: (): Record<string, string> => {
        const { session } = get();
        if (!session?.access_token) {
          return {} as Record<string, string>;
        }
        return { 'Authorization': `Bearer ${session.access_token}` };
      },
    }),
    {
      name: 'mop-mafia-auth',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
