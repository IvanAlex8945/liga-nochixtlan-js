import 'server-only';

import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import { buildAccessSnapshot } from '@/lib/access-control';

export const getCurrentAdminAccess = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return buildAccessSnapshot(user?.email);
});
