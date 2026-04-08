import 'dotenv/config';
import { createUserWithAdmin } from './user-management.ts';

/**
 * Example script to create additional users
 * This demonstrates how to create cashier and additional owner accounts
 * 
 * Usage: node scripts/seed-users.js
 */

async function seedAdditionalUsers() {
  console.log('Creating additional users...\n');

  // Example: Create a cashier user
  const cashier1 = await createUserWithAdmin(
    'putri',           // username
    '123456',     // password (should be strong and unique)
    'Rahma Putri',           // full name
    'cashier',                // role
    '085930964006'             // phone (optional)
  );

  if (!cashier1) {
    console.error('Failed to create cashier_putri');
  }

  // Example: Create another cashier user
  const cashier2 = await createUserWithAdmin(
    'ocha',
    '123456',
    'Maritza Vania',
    'cashier',
    '081227221989'
  );

  if (!cashier2) {
    console.error('Failed to create cashier_ocha');
  }

  // Example: Create additional owner (if needed)
  const owner2 = await createUserWithAdmin(
    'elisa',
    'rahasia33a',
    'Secondary Owner',
    'owner',
    '08199999999'
  );

  if (!owner2) {
    console.error('Failed to create owner_secondery');
  }

  console.log('\nDone! Users are now ready to login.');
  console.log('\nCredentials for testing:');
  console.log('- Username: cashier_putri, Password: 123456!');
  console.log('- Username: cashier_ocha, Password: 123456!');
  console.log('- Username: owner_elisa, Password: rahasia33a!');
  console.log('\n⚠️  IMPORTANT: Share passwords securely with users, then ask them to change on first login (future feature)!');
}

seedAdditionalUsers().catch(console.error);
