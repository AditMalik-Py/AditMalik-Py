require('dotenv').config();

// config.js
window.env = {
  
  SUPABASE_URL: `${process.env.SUPABASE_URL}`,
   SUPABASE_ANON_KEY :`${process.env.SUPABASE_ANON_KEY}`,
   SUPABASE_SERVICE_ROLE_KEY:`${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        
   ADMIN_PASSWORD : `${process.env.ADMIN_PASSWORD}`
  
};