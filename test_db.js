import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log('Fetching distinct estado_entrega...');
  const { data, error } = await supabase.from('cartao_saude').select('estado_entrega, nif, nome_completo');
  if (error) { console.error('Error fetching:', error); return; }

  const unique = [...new Set(data.map(d => d.estado_entrega))];
  console.log('Unique states in DB:', unique);

  const validationCards = data.filter(d => d.estado_entrega === 'AGUARDAR_VALIDACAO' || d.estado_entrega === 'Aguardar Validação');
  console.log('Cards waiting validation:', validationCards);
}
check();
