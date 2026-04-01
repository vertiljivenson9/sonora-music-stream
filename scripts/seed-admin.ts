import { db } from '../src/lib/db';
import * as bcryptjs from 'bcryptjs';

async function seedAdmin() {
  const hashedPassword = await bcryptjs.hash('admin123', 12);
  
  const admin = await db.adminConfig.upsert({
    where: { id: 'main' },
    update: { password: hashedPassword },
    create: { id: 'main', password: hashedPassword },
  });

  console.log('✅ Admin password updated successfully');
  console.log('  Password: admin123');
  console.log('  Hash:', hashedPassword.substring(0, 20) + '...');
  
  await db.$disconnect();
}

seedAdmin().catch(console.error);
