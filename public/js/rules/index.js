/**
 * 规则管理模块
 * 支持：名称匹配规则、合并规则、自定义规则、规则模板
 */
import { state } from '../core/state.js';
import { STORAGE_KEYS } from '../core/constants.js';
import { notifications } from '../ui/notifications.js';

// 内置规则模板 - 使用通用模式，避免硬编码日期
const RULE_TEMPLATES = {
  // OpenAI 系列
  'openai-standardization': {
    name: 'OpenAI 标准化',
    description: '移除 GPT 模型名中的日期后缀和版本号，统一为标准名称',
    example: 'gpt-4-0125-preview → gpt-4, gpt-4o-2024-08-06 → gpt-4o',
    rules: [
      { type: 'regex', pattern: '^(gpt-4)(?:-\\d{4})?(?:-preview)?$', replacement: '$1', condition: 'all', name: 'GPT-4 标准化' },
      { type: 'regex', pattern: '^(gpt-4-turbo)(?:-\\d{4}-\\d{2}-\\d{2})?(?:-preview)?$', replacement: '$1', condition: 'all', name: 'GPT-4 Turbo 标准化' },
      { type: 'regex', pattern: '^(gpt-4o)(?:-\\d{4}-\\d{2}-\\d{2})?(?:-mini)?$', replacement: '$1', condition: 'all', name: 'GPT-4o 标准化' },
      { type: 'regex', pattern: '^gpt-35-turbo(?:-\\d+)?$', replacement: 'gpt-3.5-turbo', condition: 'all', name: 'GPT-3.5 标准化' },
    ]
  },
  // Anthropic 系列
  'anthropic-standardization': {
    name: 'Anthropic 标准化',
    description: '移除 Claude 模型名中的日期后缀，统一为标准名称',
    example: 'claude-3-5-sonnet-20241022 → claude-3.5-sonnet',
    rules: [
      { type: 'regex', pattern: '^claude-(\\d+)-(\\d+)-(haiku|sonnet|opus)(?:-\\d{8})?$', replacement: 'claude-$1.$2-$3', condition: 'all', name: 'Claude 版本标准化' },
      { type: 'regex', pattern: '^claude-(haiku|sonnet|opus)(?:-\\d{8})?$', replacement: 'claude-$1', condition: 'all', name: 'Claude 简称标准化' },
    ]
  },
  // Google 系列
  'google-standardization': {
    name: 'Google 标准化',
    description: '移除 Gemini 模型名中的版本号和日期后缀',
    example: 'gemini-1.5-pro-002 → gemini-pro, gemini-2.0-flash → gemini-flash',
    rules: [
      { type: 'regex', pattern: '^gemini-[\\d.]+-?(pro|flash|ultra)(?:-\\d+)?(?:-latest)?$', replacement: 'gemini-$1', condition: 'all', name: 'Gemini 标准化' },
      { type: 'regex', pattern: '^gemini-(pro|flash|ultra)(?:-\\d{4}-\\d{2}-\\d{2})?$', replacement: 'gemini-$1', condition: 'all', name: 'Gemini 日期移除' },
    ]
  },
  // 渠道商前缀清理
  'clean-provider-prefix': {
    name: '清理渠道前缀',
    description: '移除渠道商在模型名前添加的标识前缀',
    example: '[官方]gpt-4 → gpt-4, @provider/claude → claude',
    rules: [
      { type: 'regex', pattern: '^\\[.+?\\]', replacement: '', condition: 'all', name: '移除方括号前缀' },
      { type: 'regex', pattern: '^【.+?】', replacement: '', condition: 'all', name: '移除中文方括号前缀' },
      { type: 'regex', pattern: '^\\(.+?\\)', replacement: '', condition: 'all', name: '移除圆括号前缀' },
      { type: 'regex', pattern: '^@[^/]+/', replacement: '', condition: 'all', name: '移除 @provider/ 前缀' },
    ]
  },
  // 渠道商后缀清理
  'clean-provider-suffix': {
    name: '清理渠道后缀',
    description: '移除渠道商在模型名后添加的标识后缀',
    example: 'gpt-4-官方 → gpt-4, claude-beta → claude',
    rules: [
      { type: 'regex', pattern: '-[\\u4e00-\\u9fa5]+$', replacement: '', condition: 'all', name: '移除中文后缀' },
      { type: 'regex', pattern: '-(official|test|beta|alpha|preview|stable)$', replacement: '', condition: 'all', name: '移除状态后缀' },
    ]
  },
  // 通用日期清理
  'clean-dates': {
    name: '清理日期后缀',
    description: '移除模型名中的各种日期格式后缀',
    example: 'model-20241022 → model, model-2024-01-15 → model',
    rules: [
      { type: 'regex', pattern: '-\\d{8}$', replacement: '', condition: 'all', name: '移除 YYYYMMDD 格式' },
      { type: 'regex', pattern: '-\\d{4}-\\d{2}-\\d{2}$', replacement: '', condition: 'all', name: '移除 YYYY-MM-DD 格式' },
      { type: 'regex', pattern: '-\\d{4}$', replacement: '', condition: 'all', name: '移除 MMDD 格式' },
      { type: 'regex', pattern: '-v?\\d+(\\.\\d+)*$', replacement: '', condition: 'all', name: '移除版本号后缀' },
    ]
  }
};

class RulesManager {
  constructor() {
    this.nameMatchRules = [];
    this.mergeRules = [];
    this.customRules = [];
    this.loadRules();
  }

  /**
   * 应用规则模板
   */
  applyTemplate(templateId) {
    const template = RULE_TEMPLATES[templateId];
    if (!template) {
      notifications.error('模板不存在');
      return { added: 0 };
    }

    let added = 0;
    for (const ruleConfig of template.rules) {
      const existingRule = this.customRules.find(
        r => r.pattern === ruleConfig.pattern && r.type === ruleConfig.type
      );

      if (!existingRule) {
        this.addCustomRule({
          name: template.name,
          ...ruleConfig,
          priority: 100 - added // 倒序优先级
        });
        added++;
      }
    }

    this.saveRules();
    notifications.success(`已应用模板 "${template.name}"，添加 ${added} 条规则`);
    return { added, templateName: template.name };
  }

  /**
   * 获取所有模板列表
   */
  getTemplates() {
    return Object.entries(RULE_TEMPLATES).map(([id, tmpl]) => ({
      id,
      name: tmpl.name,
      description: tmpl.description,
      example: tmpl.example || '',
      rulesCount: tmpl.rules.length
    }));
  }

  /**
   * 加载规则
   */
  loadRules() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RULES);
      if (saved) {
        const data = JSON.parse(saved);
        this.nameMatchRules = data.nameMatch || [];
        this.mergeRules = data.merge || [];
        this.customRules = data.custom || [];
      }
    } catch (error) {
      console.warn('加载规则失败:', error);
    }
  }

  /**
   * 保存规则
   */
  saveRules() {
    const data = {
      nameMatch: this.nameMatchRules,
      merge: this.mergeRules,
      custom: this.customRules
    };
    try {
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(data));
    } catch (error) {
      console.warn('保存规则失败:', error);
    }
  }

  /**
   * 添加名称匹配规则
   */
  addNameMatchRule(source, target, enabled = true) {
    const rule = {
      id: Date.now(),
      source,
      target,
      enabled,
      createdAt: new Date().toISOString()
    };
    this.nameMatchRules.push(rule);
    this.saveRules();
    return rule;
  }

  /**
   * 删除名称匹配规则
   */
  deleteNameMatchRule(id) {
    this.nameMatchRules = this.nameMatchRules.filter(r => r.id !== id);
    this.saveRules();
  }

  /**
   * 更新名称匹配规则
   */
  updateNameMatchRule(id, updates) {
    const rule = this.nameMatchRules.find(r => r.id === id);
    if (rule) {
      Object.assign(rule, updates);
      this.saveRules();
    }
  }

  /**
   * 添加合并规则
   */
  addMergeRule(models, target, enabled = true) {
    const rule = {
      id: Date.now(),
      models: Array.isArray(models) ? models : [models],
      target,
      enabled,
      createdAt: new Date().toISOString()
    };
    this.mergeRules.push(rule);
    this.saveRules();
    return rule;
  }

  /**
   * 删除合并规则
   */
  deleteMergeRule(id) {
    this.mergeRules = this.mergeRules.filter(r => r.id !== id);
    this.saveRules();
  }

  /**
   * 添加自定义规则
   */
  addCustomRule(rule) {
    const newRule = {
      id: Date.now(),
      ...rule,
      enabled: rule.enabled !== false,
      createdAt: new Date().toISOString()
    };
    this.customRules.push(newRule);
    this.saveRules();
    return newRule;
  }

  /**
   * 删除自定义规则
   */
  deleteCustomRule(id) {
    this.customRules = this.customRules.filter(r => r.id !== id);
    this.saveRules();
  }

  /**
   * 应用名称匹配规则
   */
  applyNameMatchRules(modelName) {
    for (const rule of this.nameMatchRules) {
      if (!rule.enabled) continue;
      if (rule.source === modelName) {
        return rule.target;
      }
    }
    return modelName;
  }

  /**
   * 应用合并规则
   */
  applyMergeRules(models) {
    let result = [...models];

    for (const rule of this.mergeRules) {
      if (!rule.enabled) continue;

      const hasAllModels = rule.models.every(m => result.includes(m));
      if (hasAllModels) {
        // 移除原始模型，添加目标模型
        result = result.filter(m => !rule.models.includes(m));
        result.push(rule.target);
      }
    }

    return result;
  }

  /**
   * 应用自定义规则
   */
  applyCustomRule(modelName, rule) {
    if (!rule.enabled) return modelName;

    // 检查应用条件
    if (rule.condition && rule.condition !== 'all') {
      const conditionValue = rule.conditionValue || '';
      let shouldApply = false;

      switch (rule.condition) {
        case 'startswith':
          shouldApply = modelName.startsWith(conditionValue);
          break;
        case 'endswith':
          shouldApply = modelName.endsWith(conditionValue);
          break;
        case 'contains':
          shouldApply = modelName.includes(conditionValue);
          break;
        default:
          shouldApply = true;
      }

      if (!shouldApply) {
        console.log(`   ⏭️ 条件不满足: ${rule.condition}("${conditionValue}")`);
        return modelName;
      }
    }

    switch (rule.type) {
      case 'regex':
        try {
          const regex = new RegExp(rule.pattern, rule.flags || 'gi');
          return modelName.replace(regex, rule.replacement);
        } catch (e) {
          console.warn(`   ❌ 正则表达式错误: ${e.message}`);
          return modelName;
        }

      case 'string':
        return modelName.split(rule.pattern).join(rule.replacement);

      case 'prefix':
        if (modelName.startsWith(rule.pattern)) {
          return rule.replacement + modelName.slice(rule.pattern.length);
        }
        return modelName;

      case 'suffix':
        if (modelName.endsWith(rule.pattern)) {
          return modelName.slice(0, -rule.pattern.length) + rule.replacement;
        }
        return modelName;

      default:
        console.warn(`   ⚠️ 未知规则类型: ${rule.type}`);
        return modelName;
    }
  }

  /**
   * 应用所有规则到模型
   */
  applyRules(modelName) {
    let result = modelName;
    let appliedCount = 0;

    console.log(`🔧 开始应用规则到: ${modelName}`);
    console.log(`   - 自定义规则数量: ${this.customRules.length}`);
    console.log(`   - 名称匹配规则数量: ${this.nameMatchRules.length}`);

    // 应用自定义规则
    for (const rule of this.customRules) {
      if (!rule.enabled) {
        console.log(`   ⏭️ 跳过禁用的规则: ${rule.type}`);
        continue;
      }

      const before = result;
      result = this.applyCustomRule(result, rule);

      if (before !== result) {
        console.log(`   ✅ 规则 #${rule.id} (${rule.type}) 生效: ${before} → ${result}`);
        appliedCount++;
      }
    }

    // 应用名称匹配规则
    const beforeNameMatch = result;
    result = this.applyNameMatchRules(result);
    if (beforeNameMatch !== result) {
      console.log(`   ✅ 名称匹配规则生效: ${beforeNameMatch} → ${result}`);
      appliedCount++;
    }

    console.log(`🎯 规则应用完成: ${modelName} → ${result} (共应用 ${appliedCount} 个规则)`);

    return result;
  }

  /**
   * 获取规则统计
   */
  getStats() {
    return {
      nameMatch: this.nameMatchRules.length,
      merge: this.mergeRules.length,
      custom: this.customRules.length,
      total: this.nameMatchRules.length + this.mergeRules.length + this.customRules.length
    };
  }

  /**
   * 清空所有规则
   */
  clearAll() {
    this.nameMatchRules = [];
    this.mergeRules = [];
    this.customRules = [];
    this.saveRules();
    notifications.success('已清空所有规则');
  }

  /**
   * 导出规则
   */
  exportRules() {
    return {
      nameMatch: this.nameMatchRules,
      merge: this.mergeRules,
      custom: this.customRules,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * 导入规则
   */
  importRules(data) {
    if (data.nameMatch) this.nameMatchRules = data.nameMatch;
    if (data.merge) this.mergeRules = data.merge;
    if (data.custom) this.customRules = data.custom;
    this.saveRules();
    const stats = this.getStats();
    notifications.success(`已导入规则: 名称匹配 ${stats.nameMatch}, 合并 ${stats.merge}, 自定义 ${stats.custom}`);
  }
}

export const rulesManager = new RulesManager();

export default rulesManager;
