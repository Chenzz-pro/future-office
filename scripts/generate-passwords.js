// 生成 bcrypt 密码的脚本
const bcrypt = require('bcryptjs');

// 生成 admin123 的 bcrypt 密码
const password1 = 'admin123';
const hash1 = bcrypt.hashSync(password1, 10);
console.log(`admin123 -> ${hash1}`);

// 生成 user123 的 bcrypt 密码
const password2 = 'user123';
const hash2 = bcrypt.hashSync(password2, 10);
console.log(`user123 -> ${hash2}`);

// 验证密码
console.log('\n验证密码：');
console.log(`admin123 验证: ${bcrypt.compareSync('admin123', hash1)}`);
console.log(`user123 验证: ${bcrypt.compareSync('user123', hash2)}`);
