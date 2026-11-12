import { runMigrations } from './migrator';
import { pool } from './pool';

runMigrations(pool)
  .then(ran => {
    ran.forEach(name => console.info(`Applied ${name}`));
    console.info('Migrations up to date');
    return pool.end();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
