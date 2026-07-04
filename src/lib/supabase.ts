import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ggteyviwygnpkzduwjxe.supabase.co';
const supabaseKey = 'sb_publishable_4eOim0QvUEBueI8Tu429uQ_0v-wIzyo';

export const supabase = createClient(supabaseUrl, supabaseKey);
