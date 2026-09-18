import { handleDeleteAccount, type VerifiedUser } from './handler.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const PUBLISHABLE_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function userFrom(payload: unknown): VerifiedUser | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const user = 'user' in payload ? (payload as { user?: unknown }).user : payload;
  if (typeof user !== 'object' || user === null) {
    return null;
  }
  const { id, email } = user as { id?: unknown; email?: unknown };
  return typeof id === 'string' && id.length > 0 ? { id, email: typeof email === 'string' ? email : null } : null;
}

Deno.serve(async (request: Request) => {
  let challengeToken: string | null = null;
  return handleDeleteAccount(request, {
    verifyAccessToken: async (accessToken) => {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: PUBLISHABLE_KEY, authorization: `Bearer ${accessToken}` },
      });
      return response.ok ? userFrom(await response.json()) : null;
    },

    verifyPassword: async ({ email, password }) => {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: PUBLISHABLE_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        return null;
      }
      const payload: unknown = await response.json();
      const token = (payload as { access_token?: unknown }).access_token;
      challengeToken = typeof token === 'string' ? token : null;
      return userFrom(payload);
    },

    deleteAccountData: async (userId) => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_account_data`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ p_user_id: userId }),
      });
      if (!response.ok) {
        throw new Error('deletion_failed');
      }
      const payload: unknown = await response.json();
      return { status: (payload as { status?: unknown }).status === 'already_deleted' ? 'already_deleted' : 'deleted' };
    },

    revokeChallengeSession: async () => {
      if (challengeToken === null) {
        return;
      }
      await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
        method: 'POST',
        headers: { apikey: PUBLISHABLE_KEY, authorization: `Bearer ${challengeToken}` },
      });
      challengeToken = null;
    },

    log: (entry) => {
      console.log(JSON.stringify(entry));
    },
  });
});
