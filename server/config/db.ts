import { Pool  } from 'pg';

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  function convertQuery(sql, params) {
    let paramIdx = 1;
    let newSql = sql.replace(/\?/g, () => '$' + (paramIdx++));
    
    // Hack to return insertId for INSERT statements
    if (/^\s*INSERT\s+INTO/i.test(newSql) && !/RETURNING/i.test(newSql)) {
      newSql = newSql + ' RETURNING *';
    }
    
    // Replace true/false for tinyint/boolean
    
    return { sql: newSql, params };
  }

  const mockPool = {
    execute: async (sql, params = []) => {
      const { sql: newSql, params: newParams } = convertQuery(sql, params);
      try {
        const res = await pool.query(newSql, newParams);
        if (res.command === 'INSERT' || res.command === 'UPDATE' || res.command === 'DELETE') {
          const firstKey = res.rows && res.rows[0] ? Object.keys(res.rows[0])[0] : null;
          return [{
            insertId: firstKey ? res.rows[0][firstKey] : null,
            affectedRows: res.rowCount
          }, null];
        }
        return [res.rows, res.fields];
      } catch (e) {
        console.error('DB Error:', e.message, '\nSQL:', newSql, '\nParams:', newParams);
        throw e;
      }
    },
    getConnection: async () => {
      const client = await pool.connect();
      return {
        execute: async (sql, params = []) => {
          const { sql: newSql, params: newParams } = convertQuery(sql, params);
          try {
            const res = await client.query(newSql, newParams);
            if (res.command === 'INSERT' || res.command === 'UPDATE' || res.command === 'DELETE') {
              const firstKey = res.rows && res.rows[0] ? Object.keys(res.rows[0])[0] : null;
              return [{
                insertId: firstKey ? res.rows[0][firstKey] : null,
                affectedRows: res.rowCount
              }, null];
            }
            return [res.rows, res.fields];
          } catch (e) {
            console.error('DB Error (Tx):', e.message, '\nSQL:', newSql);
            throw e;
          }
        },
        beginTransaction: () => client.query('BEGIN'),
        commit: () => client.query('COMMIT'),
        rollback: () => client.query('ROLLBACK'),
        release: () => client.release()
      };
    }
  };

  export default mockPool;
  