const mysql = require('mysql2/promise');

async function updatePassword() {
  const connection = await mysql.createConnection({
    host: 'ts708yr65368.vicp.fun',
    port: 33787,
    user: 'root',
    password: 'abcABC123',
    database: 'newwork'
  });
  
  // 查询当前配置
  const [rows] = await connection.query('SELECT * FROM ekp_configs LIMIT 1');
  console.log('当前配置:', JSON.stringify(rows, null, 2));
  
  // 更新用户名和密码
  await connection.query(
    "UPDATE ekp_configs SET username = 'landray', password = 'GfdGDS434cv@' WHERE id = (SELECT id FROM (SELECT id FROM ekp_configs LIMIT 1) AS t) OR 1=1"
  );
  
  // 验证更新
  const [newRows] = await connection.query('SELECT username, password FROM ekp_configs LIMIT 1');
  console.log('更新后配置:', JSON.stringify(newRows, null, 2));
  
  await connection.end();
}

updatePassword().catch(console.error);
