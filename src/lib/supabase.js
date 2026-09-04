import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wnoabftgidgvtvbyugve.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indub2FiZnRnaWRndnR2Ynl1Z3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDU5MzMsImV4cCI6MjEwMzgyMTkzM30.Ad1Va0CRiDph97qYYVr-6BxCTNb2SO26kIEQ-BSYC2g";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);