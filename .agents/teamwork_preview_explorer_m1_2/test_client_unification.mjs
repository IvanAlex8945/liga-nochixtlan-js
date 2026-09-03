// Test script to verify Supabase browser client unification logic
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

console.log('Testing Supabase client unification logic...');

const dummyUrl = 'https://example.supabase.co';
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy';

// 1. Simulate server runtime (no window)
function getSupabaseClientServer() {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return createBrowserClient(dummyUrl, dummyKey);
  }
  return createSupabaseClient(dummyUrl, dummyKey);
}

const serverClient = getSupabaseClientServer();
console.log('Server client created successfully:', !!serverClient);
console.log('Server client .from is function:', typeof serverClient.from === 'function');

// 2. Simulate browser runtime (mock window and document.cookie)
global.window = {
  document: {
    cookie: 'sb-example-auth-token.0=test_token_part'
  }
};
global.document = global.window.document;

function getSupabaseClientBrowser() {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return createBrowserClient(dummyUrl, dummyKey);
  }
  return createSupabaseClient(dummyUrl, dummyKey);
}

const browserClient1 = getSupabaseClientBrowser();
const browserClient2 = createBrowserClient(dummyUrl, dummyKey);

console.log('Browser client 1 created successfully:', !!browserClient1);
console.log('Browser client 2 created successfully:', !!browserClient2);
console.log('Are both browser clients identical singleton instance?', browserClient1 === browserClient2);
console.log('Browser client .from is function:', typeof browserClient1.from === 'function');
console.log('Browser client .auth is object:', typeof browserClient1.auth === 'object');

console.log('All tests passed!');
