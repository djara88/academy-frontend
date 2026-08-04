import { createClient } from '@supabase/supabase-js';

// URL y ANON KEY públicas de tu proyecto (Totalmente seguro colocarlo aquí)
const supabaseUrl = 'https://yihcktculicmuuzzxzik.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaGNrdGN1bGljbXV1enp4emlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNzA1ODIsImV4cCI6MjEwMDg0NjU4Mn0.ipvbcSacWn3rQhV3_O6Qg2gB7e-xEnSsaQRNADOud7M';

// Inicializamos el cliente de Supabase para el Frontend
export const supabase = createClient(supabaseUrl, supabaseKey);
