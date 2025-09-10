const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Очистка кеша Next.js...');

// Функция для удаления директории
function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Удалена: ${dirPath}`);
    } catch (error) {
      console.log(`⚠️  Не удалось удалить: ${dirPath} - ${error.message}`);
    }
  }
}

// Функция для удаления файла
function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Удален: ${filePath}`);
    } catch (error) {
      console.log(`⚠️  Не удалось удалить: ${filePath} - ${error.message}`);
    }
  }
}

// Очищаем кеш Next.js
removeDirectory('.next');
removeDirectory('out');

// Очищаем кеш npm
try {
  console.log('🧹 Очистка кеша npm...');
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ Кеш npm очищен');
} catch (error) {
  console.log('⚠️  Ошибка очистки кеша npm:', error.message);
}

// Очищаем node_modules (опционально)
const shouldRemoveNodeModules = process.argv.includes('--remove-node-modules');
if (shouldRemoveNodeModules) {
  console.log('🧹 Удаление node_modules...');
  removeDirectory('node_modules');
  console.log('📦 Переустановка зависимостей...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Зависимости переустановлены');
  } catch (error) {
    console.log('❌ Ошибка переустановки зависимостей:', error.message);
  }
}

console.log('\n🎉 Очистка завершена!');
console.log('💡 Теперь запустите: npm run dev');
