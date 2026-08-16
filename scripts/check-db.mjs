// Verificación del estado de la base de datos (tablas, filas, admin)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tables = await prisma.$queryRawUnsafe(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name"
);

console.log('TABLAS EN prisma/dev.db:');
for (const t of tables) {
  const [{ count }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS count FROM "${t.name}"`);
  console.log(`  ${t.name}: ${count} filas`);
}

const admin = await prisma.adminUser.findFirst();
console.log('\nADMIN EN LA DB:');
if (admin) {
  const hashOk = admin.passwordHash.startsWith('$2');
  console.log(`  email: ${admin.email}`);
  console.log(`  nombre: ${admin.name}`);
  console.log(`  hash bcrypt presente: ${hashOk ? 'SÍ' : 'NO'}`);
  console.log('  (la contraseña NO se guarda en texto plano, solo el hash)');
} else {
  console.log('  NO HAY admin. Ejecutá: npm run db:seed');
}

await prisma.$disconnect();
