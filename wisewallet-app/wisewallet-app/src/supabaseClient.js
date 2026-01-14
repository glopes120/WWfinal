import { createClient } from '@supabase/supabase-js'

// 1. Ler as variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Verificação de Segurança (Para evitar o Ecrã Branco)
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('🚨 ERRO CRÍTICO: Variáveis de ambiente do Supabase em falta!');
    console.error('Por favor configura VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no painel do Netlify.');
}

// 3. Criar o cliente de forma segura
// Se as variáveis não existirem, passamos uma string vazia '' para o site não crashar logo no arranque.
// (O login não vai funcionar, mas pelo menos consegues abrir a consola e ver o erro).
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseAnonKey || 'placeholder-key'
);
