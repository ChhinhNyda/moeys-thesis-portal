// Auth.js v5 catch-all route — exposes /api/auth/signin, /api/auth/callback,
// /api/auth/session, etc. Implementation lives in lib/auth.ts.

import { handlers } from "../../../../lib/auth";

export const { GET, POST } = handlers;
