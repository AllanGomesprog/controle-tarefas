import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

export default async function setup() {
  if (process.env.E2E_EXTERNAL_SERVER) return;
  const server = await createServer({
    configFile: false,
    plugins: [react()],
    server: { host: '127.0.0.1', port: 4179, strictPort: true },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://controle-test.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-public-key'),
    },
  });
  await server.listen();
  return async () => { await server.close(); };
}
