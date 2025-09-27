/**
 * Утилиты для очистки и оптимизации кода
 */

// Удаление неиспользуемых импортов
export function removeUnusedImports(code: string): string {
  // Простая проверка на неиспользуемые импорты
  const lines = code.split('\n');
  const usedImports = new Set<string>();
  const importLines: { line: string; index: number }[] = [];
  
  // Находим все импорты
  lines.forEach((line, index) => {
    if (line.trim().startsWith('import ')) {
      importLines.push({ line, index });
    }
  });
  
  // Проверяем использование импортированных модулей
  importLines.forEach(({ line }) => {
    const match = line.match(/import\s+{([^}]+)}\s+from/);
    if (match) {
      const imports = match[1].split(',').map(i => i.trim());
      imports.forEach(imp => {
        const cleanImp = imp.replace(/\s+as\s+\w+/, ''); // Убираем alias
        usedImports.add(cleanImp);
      });
    }
  });
  
  // Удаляем неиспользуемые импорты
  return lines.filter((line, index) => {
    if (line.trim().startsWith('import ')) {
      const match = line.match(/import\s+{([^}]+)}\s+from/);
      if (match) {
        const imports = match[1].split(',').map(i => i.trim());
        const hasUsedImports = imports.some(imp => {
          const cleanImp = imp.replace(/\s+as\s+\w+/, '');
          return usedImports.has(cleanImp);
        });
        return hasUsedImports;
      }
    }
    return true;
  }).join('\n');
}

// Удаление console.log в production
export function removeConsoleLogs(code: string, isProduction: boolean = false): string {
  if (!isProduction) return code;
  
  return code
    .replace(/console\.log\([^)]*\);?\s*/g, '')
    .replace(/console\.warn\([^)]*\);?\s*/g, '')
    .replace(/console\.error\([^)]*\);?\s*/g, '')
    .replace(/console\.debug\([^)]*\);?\s*/g, '');
}

// Удаление комментариев TODO, FIXME, HACK
export function removeTemporaryComments(code: string): string {
  return code
    .replace(/\/\/\s*TODO[^\n]*/g, '')
    .replace(/\/\/\s*FIXME[^\n]*/g, '')
    .replace(/\/\/\s*HACK[^\n]*/g, '')
    .replace(/\/\*\s*TODO[^*]*\*\//g, '')
    .replace(/\/\*\s*FIXME[^*]*\*\//g, '')
    .replace(/\/\*\s*HACK[^*]*\*\//g, '');
}

// Минификация простых функций
export function minifySimpleFunctions(code: string): string {
  return code
    // Убираем лишние пробелы
    .replace(/\s+/g, ' ')
    // Убираем пробелы вокруг операторов
    .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1')
    // Убираем пустые строки
    .replace(/\n\s*\n/g, '\n')
    // Убираем пробелы в начале и конце
    .trim();
}

// Проверка на дублирующийся код
export function findDuplicateCode(code: string): string[] {
  const lines = code.split('\n').filter(line => line.trim().length > 10);
  const duplicates: string[] = [];
  const seen = new Set<string>();
  
  lines.forEach(line => {
    const cleanLine = line.trim();
    if (seen.has(cleanLine)) {
      duplicates.push(cleanLine);
    } else {
      seen.add(cleanLine);
    }
  });
  
  return Array.from(new Set(duplicates));
}

// Оптимизация условий
export function optimizeConditions(code: string): string {
  return code
    // Упрощаем if (true) -> if (true)
    .replace(/if\s*\(\s*true\s*\)/g, 'if (true)')
    .replace(/if\s*\(\s*false\s*\)/g, 'if (false)')
    // Убираем лишние скобки
    .replace(/\(\s*([^()]+)\s*\)/g, '($1)')
    // Упрощаем двойные отрицания
    .replace(/!!([a-zA-Z_$][a-zA-Z0-9_$]*)/g, '$1');
}

// Проверка размера файла
export function getFileSizeInfo(filePath: string): { size: number; lines: number; complexity: number } {
  // Это заглушка - в реальности нужно читать файл
  return {
    size: 0,
    lines: 0,
    complexity: 0
  };
}

// Рекомендации по оптимизации
export function getOptimizationRecommendations(code: string): string[] {
  const recommendations: string[] = [];
  
  // Проверяем размер файла
  const lines = code.split('\n').length;
  if (lines > 500) {
    recommendations.push('Файл слишком большой, рассмотрите разделение на модули');
  }
  
  // Проверяем количество импортов
  const importCount = (code.match(/import\s+/g) || []).length;
  if (importCount > 20) {
    recommendations.push('Много импортов, рассмотрите создание barrel exports');
  }
  
  // Проверяем на дублирующийся код
  const duplicates = findDuplicateCode(code);
  if (duplicates.length > 0) {
    recommendations.push(`Найдено ${duplicates.length} дублирующихся строк кода`);
  }
  
  // Проверяем на неиспользуемые переменные
  const varMatches = code.match(/const\s+(\w+)\s*=/g) || [];
  const usedVars = new Set<string>();
  
  varMatches.forEach(match => {
    const varName = match.match(/const\s+(\w+)\s*=/)?.[1];
    if (varName) {
      const usageCount = (code.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;
      if (usageCount <= 1) {
        recommendations.push(`Возможно неиспользуемая переменная: ${varName}`);
      }
    }
  });
  
  return recommendations;
}

// Автоматическая очистка кода
export function autoCleanup(code: string, options: {
  removeConsole?: boolean;
  removeComments?: boolean;
  minify?: boolean;
  optimizeConditions?: boolean;
} = {}): string {
  let cleanedCode = code;
  
  if (options.removeConsole) {
    cleanedCode = removeConsoleLogs(cleanedCode, true);
  }
  
  if (options.removeComments) {
    cleanedCode = removeTemporaryComments(cleanedCode);
  }
  
  if (options.minify) {
    cleanedCode = minifySimpleFunctions(cleanedCode);
  }
  
  if (options.optimizeConditions) {
    cleanedCode = optimizeConditions(cleanedCode);
  }
  
  return cleanedCode;
}
