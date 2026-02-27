// Mock Supabase Client for UI-only clone

const mockUser = {
  id: "mock-user-123",
  email: "mock@example.com",
};

const mockSession = {
  access_token: "mock-token",
  expires_in: 3600,
  refresh_token: "mock-refresh",
  token_type: "bearer",
  user: mockUser,
};

// Mock Auth leveraging localStorage
const SESSION_KEY = "mock_supabase_session";

const getLocalSession = () => {
  try {
    const val = localStorage.getItem(SESSION_KEY);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

const setLocalSession = (session: any) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  authListeners.forEach(cb => cb("SIGNED_IN", session));
};

const clearLocalSession = () => {
  localStorage.removeItem(SESSION_KEY);
  authListeners.forEach(cb => cb("SIGNED_OUT", null));
};

const authListeners: any[] = [];

const auth = {
  signInWithPassword: async ({ email, password }: any) => {
    // Artificial network delay to look real
    await new Promise(r => setTimeout(r, 600));

    // Hardcoded credentials match
    if (email === "sharma.ajay8561@gmail.com" && password === "ripple@2025") {
      const user = { id: "mock-ripple-admin", email, is_anonymous: false, user_metadata: { full_name: "Admin" } };
      const session = { access_token: "mock-token", expires_in: 3600, refresh_token: "mock-refresh", token_type: "bearer", user };
      setLocalSession(session);
      return { data: { session, user }, error: null };
    }

    // Guest Demo mode match
    if (email === "guest@portfolio.demo" && password === "demo2026") {
      const user = { id: "mock-guest", email, is_anonymous: true, user_metadata: { full_name: "Guest" } };
      const session = { access_token: "mock-token", expires_in: 3600, refresh_token: "mock-refresh", token_type: "bearer", user };
      setLocalSession(session);
      return { data: { session, user }, error: null };
    }

    // Reject all others
    return { data: { session: null, user: null }, error: new Error("Invalid email or password") };
  },
  signUp: async ({ email, password, options }: any) => {
    const fullName = options?.data?.full_name || email.split('@')[0];
    const user = { id: "mock-user-" + Date.now(), email, is_anonymous: false, user_metadata: { full_name: fullName } };
    const session = { access_token: "mock-token", expires_in: 3600, refresh_token: "mock-refresh", token_type: "bearer", user };
    setLocalSession(session);
    return { data: { session, user }, error: null };
  },
  signOut: async () => {
    clearLocalSession();
    return { error: null };
  },
  getSession: async () => ({ data: { session: getLocalSession() }, error: null }),
  onAuthStateChange: (callback: any) => {
    authListeners.push(callback);
    // Immediately fire with current session
    setTimeout(() => {
      const current = getLocalSession();
      if (current) callback("SIGNED_IN", current);
    }, 10);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const idx = authListeners.indexOf(callback);
            if (idx > -1) authListeners.splice(idx, 1);
          }
        }
      }
    };
  },
  getUser: async () => {
    const session = getLocalSession();
    return { data: { user: session?.user || null }, error: null };
  },
};

// Mock DB wrapper
const makeQueryBuilder = (table: string) => {
  return {
    select: () => makeQueryBuilder(table),
    insert: () => makeQueryBuilder(table),
    update: () => makeQueryBuilder(table),
    delete: () => makeQueryBuilder(table),
    eq: () => makeQueryBuilder(table),
    gte: () => makeQueryBuilder(table),
    lte: () => makeQueryBuilder(table),
    order: () => makeQueryBuilder(table),
    limit: () => makeQueryBuilder(table),
    range: () => makeQueryBuilder(table),
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], count: 0, error: null }),
  };
};

const from = (table: string) => makeQueryBuilder(table);

// Mock Functions
const functions = {
  invoke: async () => ({ data: { id: "mock-exec-id" }, error: null }),
};

// Realtime Channel Mocks
const channelMock = {
  on: () => channelMock,
  subscribe: () => channelMock,
};
const channel = () => channelMock;
const removeChannel = () => { };

export const supabase = {
  auth,
  from,
  functions,
  channel,
  removeChannel,
} as any;