import { createClient } from '@supabase/supabase-js';

// Usaremos argumentos de la línea de comandos
// node scripts/createAdmins.mjs <service_role_key>
const serviceKey = process.argv[2];

if (!serviceKey) {
  console.error("❌ POR FAVOR PASA LA SERVICE ROLE KEY COMO ARGUMENTO.");
  process.exit(1);
}

// Inicializamos cliente con permisos de 'dios' (Service Role)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fnjvvbelrleamywyxoaq.supabase.co';
const supabase = createClient(supabaseUrl, serviceKey);

const adminsToCreate = [
  { email: 'admin1@liganochixtlan.com', password: 'Liganochixtlan2026+', role: 'Mesa Directiva' },
  { email: 'admin2@liganochixtlan.com', password: 'Liganochixtlan2026', role: 'Mesa Directiva' },
  { email: 'admin3@liganochixtlan.com', password: 'Liganochixtlan2026+', role: 'Mesa Directiva' }
];

async function run() {
  console.log("⚙️  Creando administradores iniciales...\n");

  for (const admin of adminsToCreate) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true // <-- Esto es clave: marca el correo como confirmado automáticamente sin tener que mandarles un correo real.
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`✅ Omitido: El usuario ${admin.email} ya existe.`);
      } else {
        console.error(`❌ Error al crear ${admin.email}:`, error.message);
      }
    } else {
      console.log(`✅ ¡Éxito! Usuario ${admin.email} creado con la contraseña asignada.`);
    }
  }

  console.log("\n🎉 Proceso terminado. Los usuarios ya pueden iniciar sesión en el nuevo panel.");
}

run();
