/**
 * 文字转漫画功能测试脚本
 * 测试整个流程的各个组件
 */

const fs = require('fs');
const path = require('path');

// 测试配置
const testConfig = {
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || 'test-key',
  googleApiKey: process.env.GOOGLE_API_KEY || 'test-key',
  googleProjectId: process.env.GOOGLE_PROJECT_ID || 'test-project',
  testText: `小明是一个好奇心很强的孩子。有一天，他在公园里发现了一只受伤的小鸟。小鸟的翅膀受了伤，无法飞翔。

小明小心翼翼地把小鸟带回家，请妈妈帮忙照顾。妈妈教小明如何给小鸟喂食和包扎伤口。

经过几天的精心照料，小鸟的伤口慢慢愈合了。当小鸟能够重新飞翔时，小明依依不舍地把它放回了大自然。

从那以后，小明更加热爱动物，也明白了保护环境的重要性。他经常和同学们一起参加环保活动，成为了一个小小环保卫士。`
};

/**
 * 检查文件是否存在
 */
function checkFiles() {
  console.log('🔍 检查文件结构...');
  
  const requiredFiles = [
    'database/text_to_comic_schema.sql',
    'services/deepseekService.ts',
    'services/googleImagenService.ts',
    'services/textToComicService.ts',
    'services/fontService.ts',
    'services/ocrService.ts',
    'components/TextToComicPage.tsx',
    'components/TextInput.tsx',
    'components/ComicViewer.tsx',
    'components/FontToggle.tsx',
    'components/ProcessingProgress.tsx',
    'components/PhotoUpload.tsx',
    'components/ProjectsList.tsx',
    'styles/dyslexic-fonts.css'
  ];

  const missingFiles = [];
  const existingFiles = [];

  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      existingFiles.push(file);
      console.log(`✅ ${file}`);
    } else {
      missingFiles.push(file);
      console.log(`❌ ${file} - 文件不存在`);
    }
  });

  console.log(`\n📊 文件检查结果:`);
  console.log(`✅ 存在: ${existingFiles.length} 个文件`);
  console.log(`❌ 缺失: ${missingFiles.length} 个文件`);

  return missingFiles.length === 0;
}

/**
 * 检查TypeScript类型
 */
function checkTypes() {
  console.log('\n🔍 检查TypeScript类型定义...');
  
  try {
    // 检查服务类型导出
    const deepseekService = fs.readFileSync(path.join(__dirname, 'services/deepseekService.ts'), 'utf8');
    const hasDeepseekTypes = deepseekService.includes('export interface ExtractedPlot') && 
                            deepseekService.includes('export interface PlotElement');
    
    const textToComicService = fs.readFileSync(path.join(__dirname, 'services/textToComicService.ts'), 'utf8');
    const hasComicTypes = textToComicService.includes('export interface ComicProject') && 
                         textToComicService.includes('export interface ComicPage');

    const fontService = fs.readFileSync(path.join(__dirname, 'services/fontService.ts'), 'utf8');
    const hasFontTypes = fontService.includes('export interface FontSettings') && 
                        fontService.includes('export interface FontConfig');

    if (hasDeepseekTypes && hasComicTypes && hasFontTypes) {
      console.log('✅ 所有必要的TypeScript类型定义都已导出');
      return true;
    } else {
      console.log('❌ 缺少必要的TypeScript类型定义');
      return false;
    }
  } catch (error) {
    console.log('❌ 检查TypeScript类型时出错:', error.message);
    return false;
  }
}

/**
 * 检查数据库架构
 */
function checkDatabaseSchema() {
  console.log('\n🔍 检查数据库架构...');
  
  try {
    const schemaContent = fs.readFileSync(path.join(__dirname, 'database/text_to_comic_schema.sql'), 'utf8');
    
    const requiredTables = [
      'comic_projects',
      'comic_pages',
      'comic_text_boxes',
      'comic_processing_logs'
    ];

    const missingTables = [];
    requiredTables.forEach(table => {
      if (schemaContent.includes(`CREATE TABLE ${table}`)) {
        console.log(`✅ 表 ${table} 已定义`);
      } else {
        missingTables.push(table);
        console.log(`❌ 表 ${table} 未找到`);
      }
    });

    // 检查RLS策略
    const hasRLS = schemaContent.includes('ROW LEVEL SECURITY') && 
                   schemaContent.includes('CREATE POLICY');
    
    if (hasRLS) {
      console.log('✅ 行级安全策略已配置');
    } else {
      console.log('❌ 缺少行级安全策略');
    }

    return missingTables.length === 0 && hasRLS;
  } catch (error) {
    console.log('❌ 检查数据库架构时出错:', error.message);
    return false;
  }
}

/**
 * 检查CSS样式
 */
function checkStyles() {
  console.log('\n🔍 检查CSS样式...');
  
  try {
    const stylesContent = fs.readFileSync(path.join(__dirname, 'styles/dyslexic-fonts.css'), 'utf8');
    
    const requiredClasses = [
      '.dyslexic-font',
      '.comic-text-box',
      '.font-toggle-button'
    ];

    const missingClasses = [];
    requiredClasses.forEach(className => {
      if (stylesContent.includes(className)) {
        console.log(`✅ CSS类 ${className} 已定义`);
      } else {
        missingClasses.push(className);
        console.log(`❌ CSS类 ${className} 未找到`);
      }
    });

    // 检查OpenDyslexic字体导入
    const hasOpenDyslexic = stylesContent.includes('OpenDyslexic');
    if (hasOpenDyslexic) {
      console.log('✅ OpenDyslexic字体已配置');
    } else {
      console.log('❌ 缺少OpenDyslexic字体配置');
    }

    return missingClasses.length === 0 && hasOpenDyslexic;
  } catch (error) {
    console.log('❌ 检查CSS样式时出错:', error.message);
    return false;
  }
}

/**
 * 检查React组件
 */
function checkComponents() {
  console.log('\n🔍 检查React组件...');
  
  const components = [
    'TextToComicPage',
    'TextInput',
    'ComicViewer',
    'FontToggle',
    'ProcessingProgress',
    'PhotoUpload',
    'ProjectsList'
  ];

  let allValid = true;

  components.forEach(component => {
    try {
      const componentPath = path.join(__dirname, `components/${component}.tsx`);
      const componentContent = fs.readFileSync(componentPath, 'utf8');
      
      // 检查基本的React组件结构
      const hasReactImport = componentContent.includes("import React");
      const hasComponentExport = componentContent.includes(`const ${component}:`) || 
                                componentContent.includes(`function ${component}`);
      const hasDefaultExport = componentContent.includes(`export default ${component}`);

      if (hasReactImport && hasComponentExport && hasDefaultExport) {
        console.log(`✅ 组件 ${component} 结构正确`);
      } else {
        console.log(`❌ 组件 ${component} 结构有问题`);
        allValid = false;
      }
    } catch (error) {
      console.log(`❌ 检查组件 ${component} 时出错:`, error.message);
      allValid = false;
    }
  });

  return allValid;
}

/**
 * 检查应用集成
 */
function checkAppIntegration() {
  console.log('\n🔍 检查应用集成...');
  
  try {
    const appContent = fs.readFileSync(path.join(__dirname, 'App.tsx'), 'utf8');
    const headerContent = fs.readFileSync(path.join(__dirname, 'components/Header.tsx'), 'utf8');
    const indexCssContent = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');

    // 检查App.tsx集成
    const hasTextToComicImport = appContent.includes("import TextToComicPage");
    const hasTextToComicView = appContent.includes("'text-to-comic'") && 
                              appContent.includes("case 'text-to-comic':");
    const hasNavigationHandler = appContent.includes("handleNavigateToTextToComic");

    // 检查Header.tsx集成
    const hasHeaderButton = headerContent.includes("文字转漫画") && 
                           headerContent.includes("text-to-comic");

    // 检查CSS集成
    const hasCssImport = indexCssContent.includes("dyslexic-fonts.css") && 
                        indexCssContent.includes("OpenDyslexic");

    const integrations = [
      { name: 'App.tsx 导入', status: hasTextToComicImport },
      { name: 'App.tsx 路由', status: hasTextToComicView },
      { name: 'App.tsx 导航处理', status: hasNavigationHandler },
      { name: 'Header.tsx 按钮', status: hasHeaderButton },
      { name: 'CSS 导入', status: hasCssImport }
    ];

    let allIntegrated = true;
    integrations.forEach(integration => {
      if (integration.status) {
        console.log(`✅ ${integration.name} 已集成`);
      } else {
        console.log(`❌ ${integration.name} 未集成`);
        allIntegrated = false;
      }
    });

    return allIntegrated;
  } catch (error) {
    console.log('❌ 检查应用集成时出错:', error.message);
    return false;
  }
}

/**
 * 生成测试报告
 */
function generateReport(results) {
  console.log('\n📋 测试报告');
  console.log('=' .repeat(50));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const failedTests = totalTests - passedTests;

  console.log(`总测试项: ${totalTests}`);
  console.log(`通过: ${passedTests}`);
  console.log(`失败: ${failedTests}`);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  console.log('\n详细结果:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });

  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过！文字转漫画功能已成功集成。');
    console.log('\n📝 下一步操作:');
    console.log('1. 配置API密钥 (DEEPSEEK_API_KEY, GOOGLE_API_KEY)');
    console.log('2. 运行数据库迁移脚本');
    console.log('3. 启动开发服务器测试功能');
  } else {
    console.log('\n⚠️  部分测试失败，请检查并修复上述问题。');
  }
}

/**
 * 主测试函数
 */
function runTests() {
  console.log('🚀 开始测试文字转漫画功能集成...\n');

  const results = {
    '文件结构': checkFiles(),
    'TypeScript类型': checkTypes(),
    '数据库架构': checkDatabaseSchema(),
    'CSS样式': checkStyles(),
    'React组件': checkComponents(),
    '应用集成': checkAppIntegration()
  };

  generateReport(results);
}

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testConfig
};