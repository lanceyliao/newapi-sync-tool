class NewAPISyncToolV3 {
    constructor() {
        this.config = {};
        this.channels = [];
        this.modelMapping = {};
        this.isSyncing = false;
        this.isUserEditedPreview = false; // 标记预览是否被用户编辑过
        this.channelSelectedModels = {};
        this.searchTimeout = null;
        this.channelModelsCache = new Map();
        this.globalModelsCache = new Map();
        this.currentSearchController = null;
        this.isSearching = false;
        this.previewTimeout = null;
        this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存过期时间
        this.performanceMetrics = {
            connectionTime: 0,
            channelsLoadTime: 0,
            searchTime: 0,
            syncTime: 0
        };

        // 新增性能指标跟踪
        this.requestMetrics = new Map(); // 单个请求性能指标
        this.concurrencyLimiter = null; // 并发限制器
        this.adaptiveBatchSize = 5; // 自适应批量大小
        this.failedRequests = new Set(); // 失败的请求集合

        // 新增美化相关属性
        this.notifications = [];
        this.loadingStates = new Map();
        this.animationQueue = [];
        this.isAnimating = false;

        this.initElements();
        this.bindEvents();
        this.initNavigation(); // 新增：初始化页面导航
        this.loadSavedConfig();
        this.loadChannelSelectionsFromStorage();
        this.initTheme();
        this.initKeyboardShortcuts();
        this.initVisualEnhancements();
        this.initProgressTracking();
        this.initConfigState();
        
        // 新增：模型来源跟踪系统 - 使用更精确的标识符
        this.modelSourceTracker = new Map(); // 记录每个模型的来源信息
        this.modelChannelMapping = new Map(); // 记录模型名称到渠道的映射关系
        this.initModelSourceTracking();
        
        // 规则管理系统
        this.rulesManager = new RulesManager();
        this.initRulesManagement();

        // 自定义规则系统
        this.customRules = [];
        this.customRulesManager = new CustomRulesManager();
        this.initCustomRulesManagement();
    }

    initElements() {
        this.elements = {
            // 折叠配置相关元素
            configToggle: document.getElementById('configToggle'),
            configContent: document.getElementById('configContent'),
            configChevron: document.querySelector('.config-chevron'),

            // 区块折叠相关元素
            channelsToggle: document.getElementById('channelsToggle'),
            channelsContent: document.getElementById('channelsContent'),
            mappingToggle: document.getElementById('mappingToggle'),
            mappingContent: document.getElementById('mappingContent'),
            
            baseUrl: document.getElementById('baseUrl'),
            token: document.getElementById('token'),
            userId: document.getElementById('userId'),
            authHeaderType: document.getElementById('authHeaderType'),
            proxyMode: document.getElementById('proxyMode'),
            connectAndLoadBtn: document.getElementById('connectAndLoadBtn'),
            saveConfigBtn: document.getElementById('saveConfigBtn'),
            connectionStatus: document.getElementById('connectionStatus'),
            channelsSection: document.getElementById('channelsSection'),
            reloadChannelsBtn: document.getElementById('reloadChannelsBtn'),
            globalSearchBtn: document.getElementById('globalSearchBtn'),
            channelsCount: document.getElementById('channelsCount'),
            channelsGrid: document.getElementById('channelsGrid'),
            mappingSection: document.getElementById('mappingSection'),
            originalModels: document.getElementById('originalModels'), // 隐藏的textarea用于兼容
            originalModelsContainer: document.getElementById('originalModelsContainer'),
            originalModelsList: document.getElementById('originalModelsList'),
            selectedModelsCount: document.getElementById('selectedModelsCount'),
            selectAllModelsBtn: document.getElementById('selectAllModelsBtn'),
            deselectAllModelsBtn: document.getElementById('deselectAllModelsBtn'),
            deleteSelectedModelsBtn: document.getElementById('deleteSelectedModelsBtn'),
              realtimePreview: document.getElementById('realtimePreview'),
            previewContent: document.getElementById('previewContent'),
            previewStats: document.getElementById('previewStats'),
            previewEditor: document.getElementById('previewEditor'),
            resetPreviewBtn: document.getElementById('resetPreviewBtn'),
            formatPreviewBtn: document.getElementById('formatPreviewBtn'),
            importPreviewBtn: document.getElementById('importPreviewBtn'),
            exportPreviewBtn: document.getElementById('exportPreviewBtn'),
            previewStatus: document.getElementById('previewStatus'),
            syncSection: document.getElementById('syncSection'),
            startSyncBtn: document.getElementById('startSyncBtn'),
            progressContainer: document.getElementById('progressContainer'),
            progressText: document.getElementById('progressText'),
            progressFill: document.getElementById('progressFill'),
            syncLogs: document.getElementById('syncLogs'),
            themeToggle: document.getElementById('themeToggle'),
            helpBtn: document.getElementById('helpBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            debugApiBtn: document.getElementById('debugApiBtn'),
            cleanDataBtn: document.getElementById('cleanDataBtn'),
            exportChannelsBtn: document.getElementById('exportChannelsBtn'),
            globalSearchModal: document.getElementById('globalSearchModal'),
            globalSearchInput: document.getElementById('globalSearchInput'),
            globalSearchResults: document.getElementById('globalSearchResults'),
            performGlobalSearchBtn: document.getElementById('performGlobalSearchBtn'),
            performDeepSearchBtn: document.getElementById('performDeepSearchBtn'),
            selectAllGlobalResultsBtn: document.getElementById('selectAllGlobalResultsBtn'),
            deselectAllGlobalResultsBtn: document.getElementById('deselectAllGlobalResultsBtn'),
            applyGlobalSelectionBtn: document.getElementById('applyGlobalSelectionBtn'),
            smartNameMatching: document.getElementById('smartNameMatching'),
            enableSmartMerge: document.getElementById('enableSmartMerge'),
            autoChannelSuffix: document.getElementById('autoChannelSuffix'),
            rulesSection: document.getElementById('rulesSection'),
            rulesList: document.getElementById('rulesList'),
            addRuleBtn: document.getElementById('addRuleBtn'),
            resetRulesBtn: document.getElementById('resetRulesBtn'),
            saveRulesBtn: document.getElementById('saveRulesBtn'),
            mergeRulesSection: document.getElementById('mergeRulesSection'),
            mergeRulesList: document.getElementById('mergeRulesList'),
            addMergeRuleBtn: document.getElementById('addMergeRuleBtn'),
            resetMergeRulesBtn: document.getElementById('resetMergeRulesBtn'),
            saveMergeRulesBtn: document.getElementById('saveMergeRulesBtn'),
            loadChannelsBtn: document.getElementById('loadChannelsBtn'),
            testConnectionBtn: document.getElementById('testConnectionBtn'),
            viewModelsBtn: document.getElementById('viewModelsBtn'),
            clearMappingBtn: document.getElementById('clearMappingBtn'),
            loadMappingBtn: document.getElementById('loadMappingBtn'),
            exportMappingBtn: document.getElementById('exportMappingBtn'),
            startSyncBtn2: document.getElementById('startSyncBtn2'),
            closeGlobalSearchModalBtn: document.getElementById('closeGlobalSearchModalBtn'),
            channelSearch: document.getElementById('channelSearch'),
            channelModelsModal: document.getElementById('channelModelsModal'),
            closeChannelModelsModalBtn: document.getElementById('closeChannelModelsModalBtn'),
            channelModelsTitle: document.getElementById('channelModelsTitle'),
            refreshModelsBtn: document.getElementById('refreshModelsBtn'),
            copyModelsBtn: document.getElementById('copyModelsBtn'),
            exportModelsBtn: document.getElementById('exportModelsBtn'),
            addToMappingBtn: document.getElementById('addToMappingBtn'),
            modelsSearchInput: document.getElementById('modelsSearchInput'),
            modelsCount: document.getElementById('modelsCount'),
            modelsList: document.getElementById('modelsList'),
            modelsContainer: document.querySelector('.models-container'),
            channelsGrid: document.getElementById('channelsGrid'),
            
            // 新增：已选择的模型折叠框元素
            selectedModelsSection: document.getElementById('selectedModelsSection'),
            selectedModelsCount: document.getElementById('selectedModelsCount'),
            selectedModelsInfo: document.getElementById('selectedModelsInfo'),
            selectedModelsList: document.getElementById('selectedModelsList'), // 主页面的已选择模型列表
            modalSelectedModelsList: document.getElementById('modalSelectedModelsList'), // 模态框内的已选择模型列表
            clearSelectedModelsBtn: document.getElementById('clearSelectedModelsBtn'),
            copySelectedModelsBtn: document.getElementById('copySelectedModelsBtn'),
            
            // 新增：NewAPI内模型相关元素
            showNewAPIModelsBtn: document.getElementById('showNewAPIModelsBtn'),
            newAPIModelsModal: document.getElementById('newAPIModelsModal'),
            closeNewAPIModelsModalBtn: document.getElementById('closeNewAPIModelsModalBtn'),
            newAPIModelsTitle: document.getElementById('newAPIModelsTitle'),
            newAPIModelsCount: document.getElementById('newAPIModelsCount'),
            newAPIModelsList: document.getElementById('newAPIModelsList'),
            refreshNewAPIModelsBtn: document.getElementById('refreshNewAPIModelsBtn'),
            copyNewAPIModelsBtn: document.getElementById('copyNewAPIModelsBtn'),
            
            // 规则管理相关元素
            rulesCount: document.getElementById('rulesCount'),
            addNameMatchingRule: document.getElementById('addNameMatchingRule'),
            addModelMergeRule: document.getElementById('addModelMergeRule'),
              nameMatchingRulesList: document.getElementById('nameMatchingRulesList'),
            modelMergeRulesList: document.getElementById('modelMergeRulesList'),
              resetRulesBtn: document.getElementById('resetRulesBtn'),
            importRulesBtn: document.getElementById('importRulesBtn'),
            exportRulesBtn: document.getElementById('exportRulesBtn'),
            saveRulesBtn: document.getElementById('saveRulesBtn'),
            ruleTestInput: document.getElementById('ruleTestInput'),
            testRulesBtn: document.getElementById('testRulesBtn'),
            ruleTestResults: document.getElementById('ruleTestResults'),

            // 自定义规则相关元素
            enableCustomRules: document.getElementById('enableCustomRules'),
            customRulesPreview: document.getElementById('customRulesPreview'),
            customRulesCount: document.getElementById('customRulesCount'),
            addCustomRuleBtn: document.getElementById('addCustomRule'),
            importCustomRulesBtn: document.getElementById('importCustomRulesBtn'),
            exportCustomRulesBtn: document.getElementById('exportCustomRulesBtn'),
            clearCustomRulesBtn: document.getElementById('clearCustomRulesBtn'),
            customRuleModal: document.getElementById('customRuleModal'),
            closeCustomRuleModalBtn: document.getElementById('closeCustomRuleModalBtn'),
            cancelCustomRuleBtn: document.getElementById('cancelCustomRuleBtn'),
            saveCustomRuleBtn: document.getElementById('saveCustomRuleBtn'),
            customRuleName: document.getElementById('customRuleName'),
            customRuleType: document.getElementById('customRuleType'),
            customRulePattern: document.getElementById('customRulePattern'),
            customRuleReplacement: document.getElementById('customRuleReplacement'),
            customRulePriority: document.getElementById('customRulePriority'),
            customRuleCondition: document.getElementById('customRuleCondition'),
            customRuleConditionValue: document.getElementById('customRuleConditionValue'),
            testCustomRuleBtn: document.getElementById('testCustomRuleBtn'),
            customRuleTestInput: document.getElementById('customRuleTestInput'),
            customRuleTestResult: document.getElementById('customRuleTestResult'),

            // 一键更新相关元素
            oneClickUpdateBtn: document.getElementById('oneClickUpdateBtn'),
            oneClickUpdateModal: document.getElementById('oneClickUpdateModal'),
            closeOneClickUpdateModalBtn: document.getElementById('closeOneClickUpdateModalBtn'),
            previewOneClickUpdateBtn: document.getElementById('previewOneClickUpdateBtn'),
            executeOneClickUpdateBtn: document.getElementById('executeOneClickUpdateBtn'),
            oneClickUpdateProgress: document.getElementById('oneClickUpdateProgress'),
            oneClickUpdateProgressFill: document.getElementById('oneClickUpdateProgressFill'),
            oneClickUpdateProgressText: document.getElementById('oneClickUpdateProgressText'),
            oneClickUpdateResults: document.getElementById('oneClickUpdateResults'),
            scannedChannelsCount: document.getElementById('scannedChannelsCount'),
            brokenMappingsCount: document.getElementById('brokenMappingsCount'),
            fixableMappingsCount: document.getElementById('fixableMappingsCount'),
            brokenMappingsList: document.getElementById('brokenMappingsList'),
            newMappingsList: document.getElementById('newMappingsList'),
            oneClickUpdateLogs: document.getElementById('oneClickUpdateLogs')
        };
        
        // 新增美化相关属性
        this.notifications = [];
        this.loadingStates = new Map();
        this.animationQueue = [];
        this.isAnimating = false;
    }

    bindEvents() {
        // 安全绑定事件的辅助函数
        const safeAddEventListener = (element, event, handler) => {
            if (element) {
                element.addEventListener(event, handler);
            }
        };
        
        // 折叠配置事件
        if (this.elements.configToggle) {
            safeAddEventListener(this.elements.configToggle, 'click', () => this.toggleConfig());
        }

        // 区块折叠事件
        if (this.elements.channelsToggle) {
            safeAddEventListener(this.elements.channelsToggle, 'click', () => this.toggleSection('channels'));
        }

        if (this.elements.mappingToggle) {
            safeAddEventListener(this.elements.mappingToggle, 'click', () => this.toggleSection('mapping'));
        }
        
        // Config Section
        safeAddEventListener(this.elements.saveConfigBtn, 'click', () => this.saveConfig());
        safeAddEventListener(this.elements.connectAndLoadBtn, 'click', () => this.connectAndLoadChannels());
        if (this.elements.testConnectionBtn) { safeAddEventListener(this.elements.testConnectionBtn, 'click', () => this.testConnection()); }

        // Main buttons
        safeAddEventListener(this.elements.loadChannelsBtn, 'click', () => this.connectAndLoadChannels());
        safeAddEventListener(this.elements.startSyncBtn, 'click', () => this.startSync());
        safeAddEventListener(this.elements.viewModelsBtn, 'click', () => this.openGlobalSearchModal());

        // Modal Buttons
        safeAddEventListener(this.elements.closeGlobalSearchModalBtn, 'click', () => this.closeGlobalSearchModal());
        safeAddEventListener(this.elements.performGlobalSearchBtn, 'click', () => this.performGlobalSearch());
        safeAddEventListener(this.elements.performDeepSearchBtn, 'click', () => this.performDeepSearch());
        safeAddEventListener(this.elements.selectAllGlobalResultsBtn, 'click', () => this.selectAllGlobalResults());
        safeAddEventListener(this.elements.deselectAllGlobalResultsBtn, 'click', () => this.deselectAllGlobalResults());
        safeAddEventListener(this.elements.applyGlobalSelectionBtn, 'click', () => this.applyGlobalSelection());

        // Other buttons
        safeAddEventListener(this.elements.reloadChannelsBtn, 'click', () => this.reloadChannels());
        safeAddEventListener(this.elements.globalSearchBtn, 'click', () => this.openGlobalSearchModal());
        safeAddEventListener(this.elements.clearMappingBtn, 'click', () => this.clearMapping());
        safeAddEventListener(this.elements.loadMappingBtn, 'click', () => this.loadMapping());
        safeAddEventListener(this.elements.exportMappingBtn, 'click', () => this.exportMapping());
        safeAddEventListener(this.elements.startSyncBtn2, 'click', () => this.startSync());

        // 选择式模型列表事件
        safeAddEventListener(this.elements.selectAllModelsBtn, 'click', () => this.selectAllModels());
        safeAddEventListener(this.elements.deselectAllModelsBtn, 'click', () => this.deselectAllModels());
        safeAddEventListener(this.elements.deleteSelectedModelsBtn, 'click', () => this.deleteSelectedModels());
        
        // Search functionality
        safeAddEventListener(this.elements.channelSearch, 'input', (e) => {
            this.searchChannels(e.target.value);
        });
        safeAddEventListener(this.elements.channelSearch, 'keyup', (e) => {
            if (e.key === 'Escape') {
                this.elements.channelSearch.value = '';
                this.searchChannels('');
            }
        });
        
        // Channel models modal events
        safeAddEventListener(this.elements.closeChannelModelsModalBtn, 'click', () => this.closeChannelModelsModal());
        
        // NewAPI内模型相关事件监听器
        safeAddEventListener(this.elements.showNewAPIModelsBtn, 'click', () => this.showNewAPIModelsModal());
        safeAddEventListener(this.elements.closeNewAPIModelsModalBtn, 'click', () => this.closeNewAPIModelsModal());
        safeAddEventListener(this.elements.refreshNewAPIModelsBtn, 'click', () => this.refreshNewAPIModels());
        safeAddEventListener(this.elements.copyNewAPIModelsBtn, 'click', () => this.copyNewAPIModels());
        
        // NewAPI内模型模态框外部点击关闭
        safeAddEventListener(this.elements.newAPIModelsModal, 'click', (e) => {
            if (e.target === this.elements.newAPIModelsModal) {
                this.closeNewAPIModelsModal();
            }
        });
        safeAddEventListener(this.elements.refreshModelsBtn, 'click', () => this.refreshChannelModels());
        safeAddEventListener(this.elements.copyModelsBtn, 'click', () => this.copyModelsToClipboard());
        safeAddEventListener(this.elements.exportModelsBtn, 'click', () => this.exportModelsToFile());
        safeAddEventListener(this.elements.addToMappingBtn, 'click', () => this.addSelectedModelsToMapping());
        safeAddEventListener(this.elements.modelsSearchInput, 'input', (e) => this.searchModels(e.target.value));
        
        // Close modal on outside click
        safeAddEventListener(this.elements.channelModelsModal, 'click', (e) => {
            if (e.target === this.elements.channelModelsModal) {
                this.closeChannelModelsModal();
            }
        });
        
        // 原始模型列表现在是只读的，移除输入事件监听
        // safeAddEventListener(this.elements.originalModels, 'input', ...) - 已移除
        
        // 渠道来源框现在是只读的，移除输入事件监听
        // safeAddEventListener(this.elements.channelSources, 'input', ...) - 已移除

        // Mapping configuration events - 添加冲突检测逻辑
        safeAddEventListener(this.elements.smartNameMatching, 'change', (e) => {
            // 如果启用了智能名称匹配，则禁用智能模型名合并
            if (e.target.checked) {
                this.elements.enableSmartMerge.checked = false;
                this.showWarning('智能名称匹配已启用，智能模型名合并已自动禁用（两者功能冲突）');
            }
            this.updatePreview();
        });

        safeAddEventListener(this.elements.enableSmartMerge, 'change', (e) => {
            // 如果启用了智能模型名合并，则禁用智能名称匹配
            if (e.target.checked) {
                this.elements.smartNameMatching.checked = false;
                this.showWarning('智能模型名合并已启用，智能名称匹配已自动禁用（两者功能冲突）');
            }
            this.updatePreview();
        });

        safeAddEventListener(this.elements.autoChannelSuffix, 'change', () => this.updatePreview());
          
  
        // 表格形式可编辑映射事件监听
        const tableBody = document.getElementById('mappingTableBody');
        if (tableBody) {
            // 映射表格输入事件委托
            safeAddEventListener(tableBody, 'input', (e) => {
                if (e.target.classList.contains('mapped-input')) {
                    this.updateMappingFromTable();
                    this.updatePreviewStats();
                }
            });

            // 映射表格点击事件委托
            safeAddEventListener(tableBody, 'click', (e) => {
                if (e.target.classList.contains('delete-mapping')) {
                    this.deleteMappingRow(e.target.closest('tr'));
                }
            });
        }

        // 控制按钮事件监听
        if (this.elements.resetPreviewBtn) {
            safeAddEventListener(this.elements.resetPreviewBtn, 'click', () => {
                this.resetMappingTableToDefault();
            });
        }

        if (this.elements.formatPreviewBtn) {
            safeAddEventListener(this.elements.formatPreviewBtn, 'click', () => {
                this.formatMappingTable();
            });
        }

        if (this.elements.importPreviewBtn) {
            safeAddEventListener(this.elements.importPreviewBtn, 'click', () => {
                this.importMappingToTable();
            });
        }

        if (this.elements.exportPreviewBtn) {
            safeAddEventListener(this.elements.exportPreviewBtn, 'click', () => {
                this.exportMappingFromTable();
            });
        }
        
        // Selected models section events
        if (this.elements.clearSelectedModelsBtn) {
            safeAddEventListener(this.elements.clearSelectedModelsBtn, 'click', () => this.clearSelectedModels());
        }
        if (this.elements.copySelectedModelsBtn) {
            safeAddEventListener(this.elements.copySelectedModelsBtn, 'click', () => this.copySelectedModels());
        }
        
        safeAddEventListener(this.elements.themeToggle, 'click', () => this.toggleTheme());

        // 一键更新模型事件监听
        safeAddEventListener(this.elements.oneClickUpdateBtn, 'click', () => this.openOneClickUpdateModal());
        safeAddEventListener(this.elements.closeOneClickUpdateModalBtn, 'click', () => this.closeOneClickUpdateModal());
        safeAddEventListener(this.elements.previewOneClickUpdateBtn, 'click', () => this.previewOneClickUpdate());
        safeAddEventListener(this.elements.executeOneClickUpdateBtn, 'click', () => this.executeOneClickUpdate());
        safeAddEventListener(this.elements.oneClickUpdateModal, 'click', (e) => {
            if (e.target === this.elements.oneClickUpdateModal) {
                this.closeOneClickUpdateModal();
            }
        });

        // 规则管理事件监听
        this.bindRulesManagementEvents();
    }

    async connectAndLoadChannels() {
        const config = this.getConfig();
        
        // 增强的调试信息
        console.log('🔗 开始连接测试:', {
            当前页面URL: window.location.href,
            配置: config,
            目标API: '/api/test-connection'
        });
        
        try {
            this.validateConfig(config);
            this.setLoading(this.elements.connectAndLoadBtn, true);
            
            // 显示全局进度条
            this.showGlobalProgress(0);
            
            this.updateConnectionProgress('🔄 正在智能连接服务器...', 'info', 20);

            const startTime = Date.now();
            
            // 使用本地服务器API进行连接测试
            this.showGlobalProgress(15);
            
            console.log('🚀 准备发送连接测试请求...');
            // 增强的连接测试逻辑，增加重试次数和更好的错误处理
            let quickTestResult;
            let lastError;

            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    console.log(`📡 连接尝试 ${attempt}/3: 发送请求到 /api/test-connection`);

                    quickTestResult = await this.fetchWithTimeout('/api/test-connection', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            ...config,
                            quickTest: true
                        })
                    }, 60000); // 增加超时时间到60秒

                    console.log(`✅ 第${attempt}次尝试成功`);
                    break; // 成功则跳出重试循环

                } catch (error) {
                    lastError = error;
                    console.warn(`⚠️ 第${attempt}次连接尝试失败:`, error.message);

                    if (attempt < 3) {
                        // 显示重试进度
                        this.updateConnectionProgress(`🔄 连接失败，第${attempt}次重试中... (${error.message})`, 'warning', 20 + (attempt * 10));

                        // 指数退避：1秒、2秒
                        const delay = 1000 * Math.pow(2, attempt - 1);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            // 检查是否所有重试都失败了
            if (!quickTestResult && lastError) {
                throw lastError;
            }

            // 解析响应
            if (quickTestResult && typeof quickTestResult.json === 'function') {
                console.log('📨 收到响应:', {
                    状态: quickTestResult.status,
                    状态文本: quickTestResult.statusText,
                    OK: quickTestResult.ok
                });

                if (!quickTestResult.ok) {
                    throw new Error(`HTTP ${quickTestResult.status}: ${quickTestResult.statusText}`);
                }

                const result = await quickTestResult.json();
                console.log('📦 解析结果:', result);
                quickTestResult = result;
            }

            console.log('✅ 连接测试完成:', quickTestResult);

            if (!quickTestResult.success) {
                // 如果连接失败，提供详细的错误信息和解决方案
                const errorMessage = quickTestResult.message || '未知连接错误';
                const errorSuggestions = quickTestResult.suggestions || [];
                const errorDetails = quickTestResult.error || '';

                this.updateConnectionStatus(`❌ 连接失败: ${errorMessage}`, 'error');
                this.setLoading(this.elements.connectAndLoadBtn, false);
                this.showGlobalProgress(100); // 隐藏进度条

                // 构建详细的错误提示信息
                let detailedMessage = `连接失败: ${errorMessage}`;

                if (errorDetails) {
                    detailedMessage += `\n详细错误: ${errorDetails}`;
                }

                if (errorSuggestions.length > 0) {
                    detailedMessage += `\n\n💡 解决建议:\n${errorSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
                }

                detailedMessage += '\n\n🔧 是否要进入演示模式？\n演示模式可以使用预设数据进行功能体验。';

                // 提供演示模式选项
                if (confirm(detailedMessage)) {
                    this.startDemoMode();
                    return;
                }

                // 显示带有建议的错误通知
                this.showNotification(errorMessage, 'error', errorSuggestions);

                // 在控制台显示详细信息
                console.group('🔍 连接失败诊断信息');
                console.error('错误消息:', errorMessage);
                console.error('详细错误:', errorDetails);
                console.error('建议方案:', errorSuggestions);
                console.groupEnd();

                return;
            }

            this.showGlobalProgress(30);
            this.updateConnectionProgress('✅ 服务器连接成功，正在加载渠道...', 'success', 40);

            // 保存配置到实例属性
            this.config = config;
            
            // 显示加载状态
            this.elements.channelsSection.style.display = 'block';
            this.elements.channelsGrid.innerHTML = `
                <div class="loading-full">
                    <div class="loading"></div>
                    <div>正在智能加载渠道...</div>
                    <div class="loading-subtitle">这将获取所有可用渠道信息</div>
                </div>
            `;

            // 使用本地服务器API获取渠道
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('连接超时')), 30000);
            });

            const channelsResponse = await Promise.race([
                this.retryWithBackoff(async () => {
                    const response = await this.fetchWithTimeout('/api/channels', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(config)
                    }, 60000); // 渠道数据可能更多，增加超时到60秒
                    return await response.json();
                }, 3, 2000),
                timeoutPromise
            ]).catch(() => ({ success: false, message: '连接超时' }));

            this.updateConnectionProgress('✅ 正在处理数据...', 'info', 80);

            // 处理渠道结果
            if (channelsResponse.success) {
                // 检查内层数据是否成功
                const innerData = channelsResponse.data;
                if (innerData && typeof innerData === 'object' && innerData.success === false) {
                    // 内层API调用失败
                    this.updateConnectionStatus(`❌ ${innerData.message || 'API调用失败'}`, 'error');
                    this.showNotification(innerData.message || 'API调用失败', 'error');
                    return;
                }
                
                this.channels = Array.isArray(innerData) ? innerData : [];
                
                // 如果渠道为空，显示错误信息
                if (this.channels.length === 0) {
                    this.updateConnectionStatus('❌ 未找到可用渠道，请检查配置', 'error');
                    this.showNotification('未找到可用渠道，请检查服务器地址和访问令牌', 'error');
                    
                    // 为了测试搜索功能，临时添加一些测试数据
                    console.log('添加测试数据用于测试搜索功能');
                    this.channels = [
                        { id: 1, name: '测试渠道1', type: 1, models: ['gpt-4', 'gpt-3.5-turbo'], model_count: 2 },
                        { id: 2, name: '测试渠道2', type: 14, models: ['claude-3-opus', 'claude-3-sonnet'], model_count: 2 },
                        { id: 3, name: '测试渠道3', type: 24, models: ['gemini-pro', 'gemini-pro-vision'], model_count: 2 }
                    ];
                }
                
                // 尝试获取模型数据（异步进行，不阻塞主要流程）
                setTimeout(() => {
                    this.fetchModelsForAllChannels();
                }, 100); // 100ms后开始获取模型数据
                
                // 立即开始获取前几个重要渠道的模型数据（用户体验优化）
                this.prefetchTopChannels();
                
                this.renderChannels();
                this.elements.channelsCount.textContent = `共 ${this.channels.length} 个渠道`;
                
                // 获取所有渠道的已选择模型
                setTimeout(() => {
                    this.fetchAllChannelsSelectedModels();
                }, 200);
                
                // 记录性能指标
                this.performanceMetrics.connectionTime = Date.now() - startTime;
                this.performanceMetrics.channelsLoadTime = Date.now() - startTime;
                
                // 显示连接状态
                let statusMessage = `✅ 连接成功，已加载 ${this.channels.length} 个渠道`;
                if (quickTestResult.data && quickTestResult.data.version) {
                    statusMessage += ` (版本: ${quickTestResult.data.version})`;
                }
                
                this.updateConnectionProgress(statusMessage, 'success', 100);

                // 显示其他功能按钮
                // this.elements.mappingSection.style.display = 'block';

                // 开始渐进式显示窗口
                this.startProgressiveReveal();

                this.saveConfig();
                
                // 优化：智能预加载模型缓存，只在渠道数量较少时执行
                if (this.channels.length <= 50) {
                    setTimeout(() => this.preloadModelCache(), 500);
                } else {
                    this.showNotification('渠道数量较多，按需加载模型', 'info');
                }
                
            } else {
                this.updateConnectionStatus(`❌ 渠道加载失败: ${channelsResponse.message}`, 'error');
                
                // 显示建议
                if (channelsResponse.suggestions) {
                    this.showSuggestions(channelsResponse.suggestions);
                }
            }

        } catch (error) {
            console.error('❌ 连接过程出现严重错误:', {
                错误类型: error.constructor.name,
                错误消息: error.message,
                错误堆栈: error.stack,
                当前配置: this.getConfig(),
                浏览器信息: navigator.userAgent
            });
            
            // 提供详细的错误信息和解决建议
            let errorMessage = error.message;
            let suggestions = [];
            
            if (error.message === 'Failed to fetch' || error.message.includes('fetch')) {
                errorMessage = '网络连接失败';
                suggestions = [
                    '确保后端服务已启动 (运行 node server.js)',
                    '检查服务器是否在正确端口运行 (默认3003)',
                    '检查防火墙或杀毒软件是否拦截连接',
                    '尝试刷新页面重新连接'
                ];
            } else if (error.message.includes('timeout') || error.message.includes('超时')) {
                suggestions = [
                    '网络连接较慢，请稍后重试',
                    '检查目标服务器是否正常运行',
                    '确认网络连接稳定'
                ];
            } else if (error.message.includes('401') || error.message.includes('认证')) {
                suggestions = [
                    '检查访问令牌是否正确',
                    '确认令牌未过期',
                    '检查认证类型设置'
                ];
            } else if (error.message.includes('CORS')) {
                suggestions = [
                    '可能存在跨域问题',
                    '尝试启用代理模式',
                    '确保后端CORS配置正确'
                ];
            }
            
            // 显示详细错误信息
            const detailedMessage = suggestions.length > 0 
                ? `${errorMessage}\n\n💡 解决建议:\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
                : errorMessage;
            
            this.updateConnectionStatus(`❌ 操作失败: ${errorMessage}`, 'error');
            this.showNotification(detailedMessage, 'error');
            
            // 如果是网络问题，提供演示模式选项
            if (error.message === 'Failed to fetch' || error.message.includes('fetch')) {
                setTimeout(() => {
                    if (confirm('检测到可能的网络连接问题。\n\n是否要进入演示模式？演示模式可以在没有后端服务的情况下体验界面功能。')) {
                        this.startDemoMode();
                    }
                }, 2000);
            }
        } finally {
            this.setLoading(this.elements.connectAndLoadBtn, false);
            
            // 3秒后清除进度条
            setTimeout(() => {
                this.clearConnectionProgress();
            }, 3000);
        }
    }

    searchChannels(searchTerm) {
        const filteredChannels = this.filterChannels(this.channels, searchTerm);
        this.renderFilteredChannels(filteredChannels, searchTerm);
        
        // 更新渠道计数
        this.elements.channelsCount.textContent = `共 ${filteredChannels.length} 个渠道${searchTerm ? ' (搜索结果)' : ''}`;
    }

    renderFilteredChannels(channels, searchTerm = '') {
        try {
            console.log('全局统计调试 - 渠道数据:', channels.slice(0, 3)); // 只显示前3个渠道
            
            // 计算总体统计信息
            const totalChannels = channels.length;
            const totalModels = channels.reduce((sum, channel) => {
                const count = this.getChannelModelCount(channel);
                console.log(`渠道 ${channel.id} 模型数量: ${count} (使用统一计数方法)`);
                return sum + count;
            }, 0);
            const uniqueModels = new Set();
            const activeChannels = channels.filter(channel => {
                return channel.status !== 'disabled' && channel.status !== 0;
            }).length;
            
            channels.forEach(channel => {
                if (channel.models && Array.isArray(channel.models)) {
                    channel.models.forEach(model => {
                        uniqueModels.add(model);
                    });
                }
            });
            
            console.log('全局统计结果:', {
                totalChannels,
                totalModels,
                uniqueModels: uniqueModels.size,
                activeChannels
            });
            
            // 更新全局统计信息
            this.updateGlobalStats(totalChannels, totalModels, uniqueModels.size, activeChannels);
            
            // 渲染渠道网格
            this.renderChannelsGrid(channels, searchTerm);
        } catch (error) {
            console.error('Error in renderFilteredChannels:', error);
        }
    }
    
    updateGlobalStats(totalChannels, totalModels, uniqueModels, activeChannels) {
        try {
            if (this.elements.totalChannels) {
                this.elements.totalChannels.textContent = totalChannels;
            }
            if (this.elements.totalModels) {
                this.elements.totalModels.textContent = totalModels;
            }
            if (this.elements.uniqueModels) {
                this.elements.uniqueModels.textContent = uniqueModels;
            }
            if (this.elements.activeChannels) {
                this.elements.activeChannels.textContent = activeChannels;
            }
            
            // 显示全局统计
            if (this.elements.globalStats) {
                this.elements.globalStats.style.display = 'block';
            }
        } catch (error) {
            console.error('Error updating global stats:', error);
        }
    }
    
    renderChannelsGrid(channels, searchTerm = '') {
        const filteredChannels = this.filterChannels(channels, searchTerm);
        
        const html = filteredChannels.map(channel => {
            const channelStatus = this.getChannelStatus(channel);
            const modelCount = this.getChannelModelCount(channel);
            const typeName = this.getChannelTypeName(channel.type);
            
            // 获取状态指示器
            const modelFetchStatus = this.getModelFetchStatus(channel);
            
            // 确定模型数量显示
            let modelDisplay = '';
            if (modelFetchStatus.loading) {
                modelDisplay = '🔄 获取中...';
            } else if (channel.models_fetched === 'pending') {
                modelDisplay = '⏳ 等待获取';
            } else if (modelFetchStatus.error) {
                modelDisplay = '❌ 获取失败';
            } else if (channel.models_fetched === true) {
                modelDisplay = `${modelCount} 个`;
            } else {
                modelDisplay = '0 个';
            }
            
            return `
                <div class="channel-card" data-channel-id="${channel.id}">
                    <div class="channel-card-header">
                        <div class="channel-card-title">
                            <h5>${this.highlightMatch(channel.name || '', searchTerm)}</h5>
                        </div>
                        <div class="channel-card-meta">
                            <div class="meta-item">
                                <span class="meta-label">ID:</span>
                                <span class="meta-value">${channel.id}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">类型:</span>
                                <span class="meta-value">${this.highlightMatch(typeName, searchTerm)}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">模型:</span>
                                <span class="meta-value model-count-tooltip" data-channel="${channel.id}">
                                    ${modelDisplay}
                                </span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">状态:</span>
                                <span class="meta-value">
                                    <span class="channel-status ${channelStatus.class}">${channelStatus.icon} ${channelStatus.text}</span>
                                    ${modelFetchStatus.error ? `<span class="model-fetch-error" title="${modelFetchStatus.error}">⚠️</span>` : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="channel-card-actions">
                        <button class="btn btn-primary btn-sm" onclick="app.showChannelModelsModal(${channel.id})">
                            <i class="fas fa-eye"></i> 查看模型
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="app.selectChannelModels(${channel.id})">
                            <i class="fas fa-check"></i> 选择全部
                        </button>
                        ${modelFetchStatus.canRetry ? `
                        <button class="btn btn-warning btn-sm" onclick="app.retryChannelModels(${channel.id})" title="重新获取模型数据">
                            <i class="fas fa-redo"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        this.elements.channelsGrid.innerHTML = html;
        
        // 增强交互体验
        setTimeout(() => {
            this.enhanceChannelCardInteraction();
            this.addSmartTooltips();
        }, 100);
    }
    
    getModelFetchStatus(channel) {
        if (channel.models_fetched === 'loading') {
            return { loading: true, error: false, canRetry: false };
        }
        
        if (channel.models_fetched === 'pending') {
            return { loading: false, error: false, canRetry: false };
        }
        
        if (channel.models_fetch_error) {
            return { 
                loading: false, 
                error: true, 
                canRetry: true,
                errorMsg: channel.models_fetch_error 
            };
        }
        
        if (channel.models_fetched === false) {
            return { loading: false, error: true, canRetry: true };
        }
        
        if (channel.models_fetched === undefined) {
            return { loading: false, error: false, canRetry: false };
        }
        
        return { loading: false, error: false, canRetry: false };
    }
    
    retryChannelModels(channelId) {
        const channel = this.channels.find(c => c.id == channelId);
        if (!channel) return;
        
        // 重置获取状态
        channel.models_fetched = undefined;
        channel.models_fetch_error = undefined;
        
        // 重新获取该渠道的模型数据
        this.fetchSingleChannelModels(channelId);
    }
    
    async fetchSingleChannelModels(channelId) {
        const channel = this.channels.find(c => c.id == channelId);
        if (!channel) return;
        
        try {
            console.log(`重新获取渠道 ${channelId} 的模型数据...`);
            
            // 显示加载状态
            channel.models_fetched = 'loading';
            this.updateChannelCard(channel);
            
            const models = await this.fetchChannelModelsWithRetry(channelId, 2);
            
            if (models && models.length > 0) {
                channel.models = models;
                channel.model_count = models.length;
                channel.models_fetched = true;
                channel.models_fetch_error = undefined;
                
                console.log(`✅ 渠道 ${channelId} 模型数据重新获取成功: ${models.length} 个模型`);
                this.showNotification(`渠道 ${channel.name} 模型数据更新成功`, 'success');
            } else {
                channel.models = [];
                channel.model_count = 0;
                channel.models_fetched = true;
                console.log(`⚠️ 渠道 ${channelId} 没有模型数据`);
            }
            
            this.updateChannelCard(channel);
            this.updateGlobalStatsAfterFetch();
            
        } catch (error) {
            console.warn(`❌ 重新获取渠道 ${channelId} 模型数据失败:`, error.message);
            
            channel.models_fetched = false;
            channel.models_fetch_error = error.message;
            
            this.updateChannelCard(channel);
            this.showNotification(`渠道 ${channel.name} 模型数据获取失败: ${error.message}`, 'error');
        }
    }
    
    calculateModelStats(channels, uniqueModels) {
        const totalModels = channels.reduce((sum, channel) => {
            return sum + (channel.model_count || channel.modelCount || 0);
        }, 0);
        
        const categories = this.categorizeModels(channels);
        const avgModelsPerChannel = channels.length > 0 ? Math.round(totalModels / channels.length) : 0;
        
        return {
            totalModels,
            uniqueModels: uniqueModels.size,
            categories: Object.keys(categories).length,
            avgModelsPerChannel
        };
    }
    
    getCategoryStats(models, channels) {
        const channelCount = channels.filter(channel => {
            if (channel.models && Array.isArray(channel.models)) {
                return channel.models.some(model => models.includes(model));
            }
            return false;
        }).length;
        
        const totalChannels = channels.length;
        const coverage = totalChannels > 0 ? Math.round((channelCount / totalChannels) * 100) : 0;
        const popularity = Math.round((models.length / Math.max(1, totalChannels)) * 100);
        
        return {
            channelCount,
            coverage,
            popularity
        };
    }
    
    getModelUsage(model, channels) {
        let channelCount = 0;
        let isPopular = false;
        
        channels.forEach(channel => {
            if (channel.models && Array.isArray(channel.models)) {
                if (channel.models.includes(model)) {
                    channelCount++;
                }
            }
        });
        
        // 如果模型在超过30%的渠道中出现，认为是热门模型
        isPopular = channelCount > channels.length * 0.3;
        
        const usageInfo = channelCount > 1 ? `${channelCount} 个渠道` : '1 个渠道';
        
        return {
            channelCount,
            isPopular,
            usageInfo
        };
    }
    
    getPopularModelsCount(modelCategories) {
        let popularCount = 0;
        Object.values(modelCategories).forEach(models => {
            models.forEach(model => {
                // 简单的热门模型判断逻辑
                if (model.includes('gpt-4') || model.includes('claude-3') || model.includes('gemini-pro')) {
                    popularCount++;
                }
            });
        });
        return popularCount;
    }
    
    categorizeModels(channels) {
        const categories = {
            'GPT系列': [],
            'Claude系列': [],
            'Gemini系列': [],
            'DeepSeek系列': [],
            'Qwen系列': [],
            '其他模型': []
        };
        
        channels.forEach(channel => {
            if (channel.models && Array.isArray(channel.models)) {
                channel.models.forEach(model => {
                    const category = this.getModelCategory(model);
                    if (!categories[category].includes(model)) {
                        categories[category].push(model);
                    }
                });
            }
        });
        
        // 过滤空分类
        Object.keys(categories).forEach(key => {
            if (categories[key].length === 0) {
                delete categories[key];
            }
        });
        
        return categories;
    }
    
    getModelCategory(modelName) {
        const name = modelName.toLowerCase();
        
        if (name.includes('gpt')) return 'GPT系列';
        if (name.includes('claude')) return 'Claude系列';
        if (name.includes('gemini')) return 'Gemini系列';
        if (name.includes('deepseek')) return 'DeepSeek系列';
        if (name.includes('qwen') || name.includes('通义')) return 'Qwen系列';
        
        return '其他模型';
    }
    
    filterChannels(channels, searchTerm) {
        if (!searchTerm) return channels;
        
        const term = searchTerm.toLowerCase();
        return channels.filter(channel => {
            const name = channel.name ? channel.name.toLowerCase() : '';
            const id = channel.id ? channel.id.toString() : '';
            const type = channel.type ? String(channel.type).toLowerCase() : '';
            
            return name.includes(term) || id.includes(term) || type.includes(term);
        });
    }
    
    getChannelModelCount(channel) {
        console.log('模型数量调试:', {
            channelId: channel.id,
            channelName: channel.name,
            hasModels: channel.models && Array.isArray(channel.models),
            modelsLength: channel.models ? channel.models.length : 0,
            models: channel.models,
            model_count: channel.model_count,
            modelCount: channel.modelCount
        });
        
        // 优先使用已计算的 model_count，这是从API直接获取的准确数量
        if (channel.model_count !== undefined && channel.model_count !== null) {
            console.log(`渠道 ${channel.id} 使用准确的 model_count: ${channel.model_count}`);
            return channel.model_count;
        }
        
        // 如果没有 model_count，但有模型数组，则计算去重后的数量
        if (channel.models && Array.isArray(channel.models)) {
            const uniqueModels = new Set(channel.models);
            console.log(`渠道 ${channel.id} 计算模型数量: ${uniqueModels.size}`);
            return uniqueModels.size;
        }
        
        // 最后尝试使用 modelCount (不同的属性名)
        if (channel.modelCount !== undefined) {
            console.log(`渠道 ${channel.id} 使用 modelCount: ${channel.modelCount}`);
            return channel.modelCount;
        }
        
        console.log(`渠道 ${channel.id} 无模型信息，返回0`);
        return 0;
    }
    
    highlightMatch(text, searchTerm) {
        if (!searchTerm) return text;
        const safeText = String(text || '');
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return safeText.replace(regex, '<mark>$1</mark>');
    }
    
    selectChannelModels(channelId) {
        const channel = this.channels.find(c => c.id == channelId);
        if (!channel) {
            console.error('未找到渠道:', channelId);
            return;
        }
        
        let models = [];
        if (channel.models && Array.isArray(channel.models)) {
            models = [...channel.models];
        }
        
        console.log(`选择渠道 ${channel.name} 的所有模型:`, models);
        
        if (models.length === 0) {
            this.showNotification(`渠道 "${channel.name}" 没有可用模型`, 'warning');
            return;
        }
        
        // 获取当前模型列表
        const modelsTextarea = this.elements.originalModels;
        const currentModels = modelsTextarea.value.split('\n').map(m => m.trim()).filter(m => m);
        
        // 筛选出新的模型
        const newModels = models.filter(model => !currentModels.includes(model));
        
        console.log(`从渠道 ${channel.name} 新增模型:`, newModels);
        
        if (newModels.length === 0) {
            this.showNotification(`渠道 "${channel.name}" 的所有模型都已在映射中`, 'info');
            return;
        }
        
        // 确认操作
        if (newModels.length > 10) {
            const confirmMsg = `即将添加 ${newModels.length} 个模型到映射配置，确认继续？\n\n前5个模型预览：\n${newModels.slice(0, 5).join('\n')}${newModels.length > 5 ? '\n...' : ''}`;
            if (!confirm(confirmMsg)) {
                return;
            }
        }
        
        // 记录所有模型的来源为渠道选择，传入渠道ID
        newModels.forEach(model => {
            this.recordModelSource(model, 'channel', channel.name, channel.id);
        });
        
        // 更新模型列表（通过程序控制，不是用户输入）
        const updatedModels = [...currentModels, ...newModels];
        modelsTextarea.value = updatedModels.join('\n');
        
        console.log('🔄 selectChannelModels: 已更新textarea值为:', modelsTextarea.value);
        
        // 自动匹配模型来源
        this.analyzeAndMatchModelSources();
        
        // 重新渲染模型列表UI (延迟一点执行，确保数据已更新)
        setTimeout(() => {
            console.log('🎨 selectChannelModels: 触发渲染...');
            this.renderModelsList();
        }, 100);
        
        // 更新预览
        this.updatePreview();
        
        this.showNotification(`已添加 ${newModels.length} 个模型到映射配置，来源已自动记录为: ${channel.name}`, 'success');
    }
    
    addModelToMapping(model) {
        const modelsTextarea = this.elements.originalModels;
        const currentModels = modelsTextarea.value.split('\n').map(m => m.trim()).filter(m => m);
        
        if (!currentModels.includes(model)) {
            // 通过程序控制添加到只读文本框（不是用户输入）
            currentModels.push(model);
            modelsTextarea.value = currentModels.join('\n');
            
            // 记录模型来源 - 通过单个添加通常来自渠道模态框
            const currentChannelId = this.currentModalChannelId;
            if (currentChannelId) {
                const channel = this.channels.find(c => c.id == currentChannelId);
                if (channel) {
                    this.recordModelSource(model, 'channel', channel.name, channel.id);
                }
            } else {
                // 如果无法确定渠道，这种情况不应该发生，因为现在不允许手动输入
                console.warn('无法确定模型来源渠道，这不应该发生');
                return;
            }
            
            // 自动匹配模型来源
            this.analyzeAndMatchModelSources();
            
            // 重新渲染模型列表UI
            this.renderModelsList();
            
            this.updatePreview();
            this.showNotification(`已添加模型: ${model}，来源已自动记录`, 'success');
        } else {
            this.showNotification('模型已在映射中', 'info');
        }
    }
    
    getChannelStatus(channel) {
        // 调试信息：记录渠道状态
        console.log('渠道状态调试:', {
            id: channel.id,
            name: channel.name,
            status: channel.status,
            enabled: channel.enabled,
            disabled: channel.disabled,
            model_count: channel.model_count || channel.modelCount,
            models_count: channel.models ? channel.models.length : 0,
            type: channel.type,
            // 显示所有字段以便调试
            allFields: Object.keys(channel),
            // 详细显示可能的类型相关字段
            channel_type: channel.channel_type,
            provider: channel.provider,
            base_url: channel.base_url,
            // 显示完整的渠道对象
            fullChannel: channel
        });
        
        // 尝试解释类型数字
        const typeName = this.getChannelTypeName(channel.type);
        console.log(`渠道 ${channel.id} 类型: ${channel.type} (${typeName})`);
        
        // 根据渠道信息判断状态
        // 检查禁用状态 - 支持多种可能的字段名和值
        const disabledStatuses = ['disabled', 'inactive', 'false', 0, false, '0'];
        const isDisabled = disabledStatuses.includes(channel.status) || 
                          disabledStatuses.includes(channel.enabled) ||
                          channel.disabled === true || 
                          channel.disabled === 1 ||
                          channel.enabled === false ||
                          channel.enabled === 0;
        
        if (isDisabled) {
            return {
                text: '已禁用',
                class: 'status-disabled',
                icon: '❌'
            };
        }
        
        // 检查启用状态 - 支持多种可能的字段名和值
        const activeStatuses = ['active', 'enabled', 'true', 1, true, '1', 'running', 'ok'];
        const isActive = activeStatuses.includes(channel.status) || 
                        activeStatuses.includes(channel.enabled) ||
                        channel.enabled === true || 
                        channel.enabled === 1;
        
        if (isActive) {
            return {
                text: '正常',
                class: 'status-active',
                icon: '✅'
            };
        }
        
        // 如果有模型但状态不明确，显示"有模型"
        if ((channel.models && Array.isArray(channel.models) && channel.models.length > 0) ||
            (channel.model_count > 0) || 
            (channel.modelCount > 0)) {
            return {
                text: '有模型',
                class: 'status-active',
                icon: '✅'
            };
        }
        
        // 检查其他可能的状态
        if (channel.status) {
            const statusText = String(channel.status).toLowerCase();
            if (statusText.includes('error') || statusText.includes('fail')) {
                return {
                    text: '错误',
                    class: 'status-error',
                    icon: '⚠️'
                };
            }
            if (statusText.includes('pending') || statusText.includes('wait')) {
                return {
                    text: '等待中',
                    class: 'status-pending',
                    icon: '⏳'
                };
            }
            if (statusText.includes('maintenance') || statusText.includes('maintain')) {
                return {
                    text: '维护中',
                    class: 'status-maintenance',
                    icon: '🔧'
                };
            }
        }
        
        // 如果没有任何状态信息，默认认为是禁用状态
        // 这是因为没有明确状态信息的渠道可能是无效的
        return {
            text: '已禁用',
            class: 'status-disabled',
            icon: '❌'
        };
    }
    
    getChannelTypeName(type) {
        // 根据NewAPI实际的类型映射
        const typeMap = {
            1: 'OpenAI',
            2: 'Midjourney Proxy',
            3: 'Azure OpenAI',
            4: 'Ollama',
            5: 'Midjourney Proxy Plus',
            8: '自定义渠道',
            11: 'Google PaLM2',
            14: 'Anthropic Claude',
            15: '百度文心千帆',
            16: '智谱 ChatGLM（已弃用）',
            17: '阿里通义千问',
            18: '讯飞星火认知',
            19: '360 智脑',
            20: 'OpenRouter',
            21: '知识库：AI Proxy',
            22: '知识库：FastGPT',
            23: '腾讯混元',
            24: 'Google Gemini',
            25: 'Moonshot',
            26: '智谱 GLM-4V',
            31: '零一万物',
            33: 'AWS Claude',
            34: 'Cohere',
            35: 'MiniMax',
            36: 'Suno API',
            37: 'Dify',
            38: 'Jina',
            39: 'Cloudflare',
            40: 'SiliconCloud',
            41: 'Vertex AI',
            42: 'Mistral AI',
            43: 'DeepSeek',
            44: '嵌入模型：MokaAI M3E',
            45: '字节火山方舟、豆包通用',
            46: '百度文心千帆V2',
            47: 'Xinference',
            48: 'xAI',
            49: 'Coze',
            50: '可灵',
            51: '即梦',
            52: 'Vidu'
        };
        
        return typeMap[type] || `未知类型 (${type})`;
    }
    
    getModelsPreview(channel) {
        if (channel.models && Array.isArray(channel.models) && channel.models.length > 0) {
            // 去重并限制显示数量
            const uniqueModels = [...new Set(channel.models)];
            const previewModels = uniqueModels.slice(0, 5); // 最多显示5个
            const result = previewModels.join(', ');
            return uniqueModels.length > 5 ? result + '...' : result;
        } else if (channel.model_count > 0) {
            return `${channel.model_count} 个模型可用`;
        } else {
            return '暂无模型信息';
        }
    }
    
    toggleChannelDetails(channelId, button) {
        const details = document.querySelector(`.channel-details[data-channel-id="${channelId}"]`);
        const icon = button.querySelector('i');
        
        if (details.style.display === 'none') {
            details.style.display = 'block';
            icon.className = 'fas fa-chevron-up';
        } else {
            details.style.display = 'none';
            icon.className = 'fas fa-chevron-down';
        }
    }

    renderChannels() {
        this.renderFilteredChannels(this.channels);
    }

    // 基础配置方法
    getConfig() {
        return {
            baseUrl: this.elements.baseUrl.value.trim(),
            token: this.elements.token.value.trim(),
            userId: this.elements.userId.value,
            authHeaderType: this.elements.authHeaderType.value,
            proxyMode: this.elements.proxyMode.value
        };
    }

    validateConfig(config) {
        if (!config.baseUrl) {
            throw new Error('请输入服务器地址');
        }
        if (!config.token) {
            throw new Error('请输入访问令牌');
        }
        if (!config.userId) {
            throw new Error('请输入用户ID');
        }
        
        // 验证URL格式
        try {
            new URL(config.baseUrl);
        } catch {
            throw new Error('服务器地址格式不正确');
        }
    }

    // 工具方法
    setLoading(button, loading) {
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || button.innerHTML;
        }
    }

    async fetchWithTimeout(url, options = {}, timeout = 30000, config = null) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const headers = {
                'Content-Type': 'application/json',
                ...(config ? this.getAuthHeaders(config) : {}),
                ...options.headers
            };

            console.log(`🚀 发起请求: ${options.method || 'GET'} ${url} (超时: ${timeout}ms)`);

            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log(`✅ 请求完成: ${response.status} ${url}`);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            let errorMessage = '网络请求失败';
            let errorSuggestions = [];

            if (error.name === 'AbortError') {
                errorMessage = `请求超时 (${timeout}ms)`;
                errorSuggestions = [
                    '检查网络连接是否稳定',
                    '等待网络状况改善后重试',
                    '尝试增加超时时间'
                ];
            } else if (error.code === 'ECONNREFUSED') {
                errorMessage = '连接被拒绝';
                errorSuggestions = [
                    '检查服务器是否正在运行',
                    '确认服务器地址和端口正确',
                    '检查防火墙设置'
                ];
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = '无法解析服务器地址';
                errorSuggestions = [
                    '检查服务器地址是否正确',
                    '检查DNS设置',
                    '确认网络连接正常'
                ];
            } else if (error.code === 'ECONNRESET') {
                errorMessage = '连接被重置';
                errorSuggestions = [
                    '网络连接不稳定，请重试',
                    '检查网络线路是否正常',
                    '稍后再次尝试连接'
                ];
            } else {
                errorMessage = error.message || error.name || '未知网络错误';
                errorSuggestions = [
                    '检查网络连接',
                    '刷新页面后重试',
                    '稍后再试'
                ];
            }

            console.error(`❌ 请求失败: ${errorMessage}`, {
                url: url,
                error: error.message,
                code: error.code,
                type: error.name
            });

            // 增强错误对象
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            enhancedError.suggestions = errorSuggestions;
            enhancedError.url = url;
            enhancedError.timeout = timeout;

            throw enhancedError;
        }
    }

    async retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxAttempts) {
                    throw error;
                }
                
                const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
                console.warn(`尝试 ${attempt}/${maxAttempts} 失败，${delay}ms 后重试: ${error.message}`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    }

    getAuthHeaders(config) {
        const cleanToken = config.token.replace(/[\n\r\t]/g, '').trim();
        const authHeaderType = config.authHeaderType || 'NEW_API';
        
        const headers = {
            'Authorization': `Bearer ${cleanToken}`,
            'Content-Type': 'application/json'
        };
        
        if (authHeaderType === 'NEW_API') {
            headers['New-Api-User'] = config.userId;
        } else if (authHeaderType === 'BEARER') {
            // Bearer token already in Authorization header
        }
        
        return headers;
    }

    showGlobalProgress(percentage) {
        // 简单的进度显示，可以根据需要扩展
        console.log(`进度: ${percentage}%`);
    }

    updateConnectionProgress(message, type, percentage) {
        try {
            if (this.elements.connectionStatus) {
                this.elements.connectionStatus.style.display = 'block';
                this.elements.connectionStatus.className = `connection-status ${type}`;
                this.elements.connectionStatus.innerHTML = `
                    <div class="progress-info">
                        <div class="progress-message">${message}</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
            } else {
                console.warn('connectionStatus element not found, skipping progress update');
            }
        } catch (error) {
            console.error('Error updating connection progress:', error);
        }
    }

    updateConnectionStatus(message, type) {
        try {
            if (this.elements.connectionStatus) {
                this.elements.connectionStatus.style.display = 'block';
                this.elements.connectionStatus.className = `connection-status ${type}`;
                this.elements.connectionStatus.textContent = message;
            } else {
                console.warn('connectionStatus element not found, skipping status update');
            }
        } catch (error) {
            console.error('Error updating connection status:', error);
        }
    }

    clearConnectionProgress() {
        if (this.elements.connectionStatus) {
            this.elements.connectionStatus.style.display = 'none';
        }
    }

    showNotification(message, type = 'info', suggestions = []) {
        // 确保通知容器存在
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        // 生成唯一ID用于管理
        const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        notification.dataset.notificationId = notificationId;

        // 处理多行消息
        const formattedMessage = message.replace(/\n/g, '<br>');

        // 构建建议HTML
        let suggestionsHtml = '';
        if (suggestions && suggestions.length > 0) {
            suggestionsHtml = `
                <div class="notification-suggestions">
                    <i class="fas fa-lightbulb"></i>
                    <div class="suggestions-list">
                        ${suggestions.map(suggestion => `<div class="suggestion-item">• ${suggestion}</div>`).join('')}
                    </div>
                </div>
            `;
        }

        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${formattedMessage}</span>
                <button class="notification-close" onclick="app.removeNotificationById('${notificationId}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${suggestionsHtml}
        `;

        // 添加到容器顶部（新的通知在最上面），实现一行一行显示
        container.insertBefore(notification, container.firstChild);

        // 添加显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // 自动移除 - 多行消息显示更长时间
        const lines = message.split('\n').length;
        const baseDuration = type === 'error' ? 8000 : type === 'warning' ? 6000 : 4000;
        const duration = baseDuration + (lines > 1 ? (lines - 1) * 1000 : 0);
        setTimeout(() => {
            this.removeNotificationById(notificationId);
        }, duration);

        // 限制同时显示的通知数量
        this.limitNotifications();
    }
    
    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                // 清理空容器
                this.cleanupNotificationContainer();
            }, 300);
        }
    }

    removeNotificationById(notificationId) {
        const notification = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (notification) {
            this.removeNotification(notification);
        }
    }

    limitNotifications(maxNotifications = 5) {
        const container = document.querySelector('.notification-container');
        if (!container) return;

        const notifications = container.querySelectorAll('.notification');
        if (notifications.length > maxNotifications) {
            // 移除最早的通知（从底部开始）
            const notificationsToRemove = Array.from(notifications).slice(0, notifications.length - maxNotifications);
            notificationsToRemove.forEach(notification => {
                this.removeNotification(notification);
            });
        }
    }

    cleanupNotificationContainer() {
        const container = document.querySelector('.notification-container');
        if (container && container.children.length === 0) {
            container.remove();
        }
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }
    
    showProgress(message, percentage = 0) {
        let progressContainer = document.getElementById('globalProgress');
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'globalProgress';
            progressContainer.className = 'global-progress';
            document.body.appendChild(progressContainer);
        }
        
        progressContainer.innerHTML = `
            <div class="progress-content">
                <div class="progress-message">${message}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="progress-percentage">${percentage}%</div>
            </div>
        `;
        
        progressContainer.style.display = 'block';
    }
    
    hideProgress() {
        const progressContainer = document.getElementById('globalProgress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }
    
    showErrorDialog(title, message, details = null, actions = []) {
        const dialog = document.createElement('div');
        dialog.className = 'error-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <div class="dialog-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>${title}</h3>
                </div>
                <div class="dialog-body">
                    <div class="error-message">${message}</div>
                    ${details ? `<div class="error-details">${details}</div>` : ''}
                </div>
                <div class="dialog-actions">
                    ${actions.map(action => `
                        <button class="btn btn-${action.type || 'secondary'}" onclick="${action.onclick}">
                            ${action.icon ? `<i class="fas fa-${action.icon}"></i> ` : ''}${action.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // 点击外部关闭
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this.removeErrorDialog(dialog);
            }
        });
        
        return dialog;
    }
    
    removeErrorDialog(dialog) {
        if (dialog && dialog.parentNode) {
            dialog.classList.add('hiding');
            setTimeout(() => {
                if (dialog.parentNode) {
                    dialog.parentNode.removeChild(dialog);
                }
            }, 300);
        }
    }

    startDemoMode() {
        // 演示模式数据
        const demoChannels = [
            { id: 1, name: '演示渠道1', type: 'OpenAI', models: ['gpt-4', 'gpt-3.5-turbo'], model_count: 2 },
            { id: 2, name: '演示渠道2', type: 'Claude', models: ['claude-3-opus', 'claude-3-sonnet'], model_count: 2 },
            { id: 3, name: '演示渠道3', type: 'Gemini', models: ['gemini-pro', 'gemini-pro-vision'], model_count: 2 }
        ];
        
        this.channels = demoChannels;
        this.renderChannels();
        this.elements.channelsCount.textContent = `共 ${this.channels.length} 个渠道`;
        this.elements.channelsSection.style.display = 'block';
        
        this.showNotification('已进入演示模式', 'info');
    }

    saveConfig() {
        const config = this.getConfig();
        try {
            this.validateConfig(config);
            localStorage.setItem('newapi-config', JSON.stringify(config));
            this.showNotification('配置已保存', 'success');
        } catch (error) {
            this.showNotification('配置保存失败: ' + error.message, 'error');
        }
    }

    toggleConfig() {
        const content = this.elements.configContent;
        const chevron = this.elements.configChevron;

        if (content && chevron) {
            const isCollapsed = content.classList.contains('collapsed');

            if (isCollapsed) {
                // 展开配置
                content.classList.remove('collapsed');
                chevron.classList.remove('collapsed');
                localStorage.setItem('configCollapsed', 'false');
            } else {
                // 折叠配置
                content.classList.add('collapsed');
                chevron.classList.add('collapsed');
                localStorage.setItem('configCollapsed', 'true');
            }
        }
    }

    toggleSection(sectionName) {
        const toggle = this.elements[`${sectionName}Toggle`];
        const content = this.elements[`${sectionName}Content`];

        if (!toggle || !content) {
            console.warn(`Section elements not found for: ${sectionName}`);
            return;
        }

        const isCollapsed = toggle.classList.contains('collapsed');

        if (isCollapsed) {
            // 展开区块
            toggle.classList.remove('collapsed');
            content.classList.add('expanded');
            localStorage.setItem(`${sectionName}Collapsed`, 'false');

            console.log(`展开 ${sectionName} 区块`);
        } else {
            // 折叠区块
            toggle.classList.add('collapsed');
            content.classList.remove('expanded');
            localStorage.setItem(`${sectionName}Collapsed`, 'true');

            console.log(`折叠 ${sectionName} 区块`);
        }
    }

    initConfigState() {
        // 从localStorage恢复配置的折叠状态
        const isCollapsed = localStorage.getItem('configCollapsed') === 'true';
        const content = this.elements.configContent;
        const chevron = this.elements.configChevron;

        if (isCollapsed && content && chevron) {
            content.classList.add('collapsed');
            chevron.classList.add('collapsed');
        }

        // 初始化区块折叠状态
        this.initSectionStates();
    }

    initSectionStates() {
        // 从localStorage恢复区块的折叠状态
        const sections = ['channels', 'mapping'];

        sections.forEach(sectionName => {
            const isCollapsed = localStorage.getItem(`${sectionName}Collapsed`) === 'true';
            const toggle = this.elements[`${sectionName}Toggle`];
            const content = this.elements[`${sectionName}Content`];

            if (toggle && content) {
                if (isCollapsed) {
                    toggle.classList.add('collapsed');
                    content.classList.remove('expanded');
                } else {
                    toggle.classList.remove('collapsed');
                    content.classList.add('expanded');
                }
            }
        });
    }

    // 渐进式显示窗口
    startProgressiveReveal() {
        // 标记页面为已连接状态
        document.body.classList.add('connected');

        // 添加连接成功指示器到配置区域
        const configCollapsible = document.querySelector('.config-collapsible');
        if (configCollapsible && !configCollapsible.querySelector('.connection-success-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'connection-success-indicator';
            configCollapsible.appendChild(indicator);
        }

        // 标记配置区域为已连接状态
        if (configCollapsible) {
            configCollapsible.classList.add('connected');
        }

        // 获取所有需要渐进显示的区域
        const sections = document.querySelectorAll('.progressive-section.hidden-section');

        // 按照data-section-order顺序显示窗口
        sections.forEach((section, index) => {
            const order = parseInt(section.dataset.sectionOrder) || index;

            // 延迟显示每个窗口
            setTimeout(() => {
                // 首先移除hidden-section类，添加revealing类
                section.classList.remove('hidden-section');
                section.classList.add('revealing');

                // 动画完成后，移除revealing类，添加visible类
                setTimeout(() => {
                    section.classList.remove('revealing');
                    section.classList.add('visible');

                    // 如果是渠道区域，显示渠道网格
                    if (section.id === 'channelsSection') {
                        this.channelsSectionRevealed();
                    }
                }, 800); // 动画持续时间

            }, order * 400); // 每个窗口间隔400ms
        });

        // 显示成功通知
        this.showNotification('🎉 连接成功！功能区域正在逐步展开', 'success');
    }

    // 渠道区域显示完成后的处理
    channelsSectionRevealed() {
        // 确保渠道列表可见
        if (this.elements.channelsSection) {
            this.elements.channelsSection.style.display = 'block';
        }

        // 如果渠道已加载，重新渲染以应用动画
        if (this.channels && this.channels.length > 0) {
            setTimeout(() => {
                this.renderChannels();
            }, 100);
        }
    }

    loadSavedConfig() {
        try {
            const saved = localStorage.getItem('newapi-config');
            if (saved) {
                const config = JSON.parse(saved);
                this.elements.baseUrl.value = config.baseUrl || '';
                this.elements.token.value = config.token || '';
                this.elements.userId.value = config.userId || '1';
                this.elements.authHeaderType.value = config.authHeaderType || 'NEW_API';
                this.elements.proxyMode.value = config.proxyMode || 'disabled';
            } else {
                // 如果没有保存的配置，则清空输入框
                this.elements.baseUrl.value = '';
                this.elements.token.value = '';
                this.elements.userId.value = '1'; // userId 可以保留默认值 '1'
                this.elements.authHeaderType.value = 'NEW_API';
                this.elements.proxyMode.value = 'disabled';
            }
        } catch (error) {
            console.warn('加载配置失败:', error);
            // 即使加载失败，也清空输入框以避免显示错误信息
            this.elements.baseUrl.value = '';
            this.elements.token.value = '';
            this.elements.userId.value = '1';
            this.elements.authHeaderType.value = 'NEW_API';
            this.elements.proxyMode.value = 'disabled';
        }
    }

    testConnection() {
        this.connectAndLoadChannels();
    }

    reloadChannels() {
        this.connectAndLoadChannels();
    }

    async startSync() {
        if (this.isSyncing) {
            this.showNotification('同步正在进行中，请勿重复操作', 'warning');
            return;
        }

        // 检查配置
        if (!this.config.baseUrl || !this.config.token || !this.config.userId) {
            this.showNotification('请先配置连接信息', 'error');
            return;
        }

        // 检查模型映射
        const modelMapping = this.modelMapping;
        if (Object.keys(modelMapping).length === 0) {
            this.showNotification('请先生成模型映射', 'warning');
            return;
        }

        // 获取模型更新模式
        const modelUpdateMode = document.querySelector('input[name="modelUpdateMode"]:checked')?.value || 'append';

        // 获取按渠道分组的模型映射
        const channelModelMapping = this.getModelMappingByChannels();
        const channelIds = Object.keys(channelModelMapping);

        if (channelIds.length === 0) {
            this.showNotification('没有找到可同步的渠道和模型', 'warning');
            return;
        }

        console.log('🚀 准备同步 (新版本: 按渠道分组)');
        console.log('📊 总映射数量:', Object.keys(modelMapping).length);
        console.log('🎯 涉及渠道数量:', channelIds.length);
        console.log('📋 渠道ID列表:', channelIds);

        // 显示每个渠道的模型数量
        channelIds.forEach(channelId => {
            const channelData = channelModelMapping[channelId];
            const modelCount = Object.keys(channelData.models).length;
            console.log(`📌 渠道 ${channelId} (${channelData.channelInfo.name}): ${modelCount} 个模型`);
        });

        this.isSyncing = true;
        this.updateSyncUI(true);

        try {
            // 逐个渠道执行同步
            const allResults = [];
            let totalSuccess = 0;
            let totalFailed = 0;

            for (const channelId of channelIds) {
                const channelData = channelModelMapping[channelId];
                const channelModels = channelData.models;

                console.log(`🔄 开始同步渠道 ${channelId} (${channelData.channelInfo.name})，包含 ${Object.keys(channelModels).length} 个模型`);

                try {
                    const response = await fetch('/api/sync-models', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            baseUrl: this.config.baseUrl,
                            token: this.config.token,
                            userId: this.config.userId,
                            authHeaderType: this.config.authHeaderType || 'NEW_API',
                            modelMapping: channelModels, // 只发送这个渠道的模型映射
                            modelUpdateMode: modelUpdateMode,
                            channelIds: [channelId] // 只同步这一个渠道
                        })
                    });

                    const result = await response.json();

                    if (result.success) {
                        console.log(`✅ 渠道 ${channelId} 同步成功`);
                        totalSuccess++;
                        allResults.push({
                            channelId,
                            channelName: channelData.channelInfo.name,
                            success: true,
                            stats: result.stats || {},
                            message: result.message || '同步成功'
                        });
                    } else {
                        console.error(`❌ 渠道 ${channelId} 同步失败:`, result.message);
                        totalFailed++;
                        allResults.push({
                            channelId,
                            channelName: channelData.channelInfo.name,
                            success: false,
                            error: result.message,
                            message: result.message || '同步失败'
                        });
                    }
                } catch (error) {
                    console.error(`❌ 渠道 ${channelId} 请求失败:`, error);
                    totalFailed++;
                    allResults.push({
                        channelId,
                        channelName: channelData.channelInfo.name,
                        success: false,
                        error: error.message,
                        message: `请求失败: ${error.message}`
                    });
                }
            }

            // 显示综合结果
            console.log(`🎉 所有渠道同步完成: 成功 ${totalSuccess} 个，失败 ${totalFailed} 个`);

            if (totalSuccess > 0) {
                this.showNotification(`同步完成！成功 ${totalSuccess} 个渠道${totalFailed > 0 ? `，失败 ${totalFailed} 个渠道` : ''}`, totalFailed > 0 ? 'warning' : 'success');
            } else {
                this.showNotification('同步失败，请检查日志', 'error');
            }

            // 显示详细结果
            this.showMultiChannelSyncResult(allResults);

        } catch (error) {
            console.error('同步过程中发生错误:', error);
            this.showNotification('同步过程中发生错误，请检查网络连接', 'error');
            this.showSyncError({ message: error.message });
        } finally {
            this.isSyncing = false;
            this.updateSyncUI(false);
        }
    }

    showMultiChannelSyncResult(allResults) {
        const syncLogs = this.elements.syncLogs;
        const progressFill = this.elements.progressFill;
        const progressText = this.elements.progressText;

        // 显示进度条
        this.elements.progressContainer.style.display = 'block';
        syncLogs.style.display = 'block';

        // 更新进度到100%
        progressFill.style.width = '100%';
        progressText.textContent = '同步完成';

        // 生成详细的同步结果日志
        let logHTML = '<div style="font-family: monospace; font-size: 12px; line-height: 1.4;">';
        logHTML += '<h4>📊 多渠道同步结果详情</h4>';

        const successCount = allResults.filter(r => r.success).length;
        const failCount = allResults.filter(r => !r.success).length;

        logHTML += `<div style="margin-bottom: 15px; padding: 10px; background: ${successCount > 0 ? '#d4edda' : '#f8d7da'}; border-radius: 5px;">`;
        logHTML += `<strong>总体结果:</strong> 成功 ${successCount} 个渠道，失败 ${failCount} 个渠道`;
        logHTML += '</div>';

        // 按渠道显示详细结果
        allResults.forEach((result, index) => {
            const status = result.success ? '✅ 成功' : '❌ 失败';
            const bgColor = result.success ? '#d4edda' : '#f8d7da';
            const textColor = result.success ? '#155724' : '#721c24';

            logHTML += `<div style="margin: 10px 0; padding: 10px; background: ${bgColor}; border-radius: 5px; color: ${textColor};">`;
            logHTML += `<div><strong>${status} - 渠道 ${result.channelId}: ${result.channelName}</strong></div>`;

            if (result.success && result.stats) {
                logHTML += `<div style="margin-left: 10px; font-size: 11px;">`;
                if (result.stats.total !== undefined) {
                    logHTML += `总计: ${result.stats.total} | `;
                }
                if (result.stats.success !== undefined) {
                    logHTML += `成功: ${result.stats.success} | `;
                }
                if (result.stats.failed !== undefined) {
                    logHTML += `失败: ${result.stats.failed}`;
                }
                logHTML += '</div>';
            }

            if (result.error) {
                logHTML += `<div style="margin-left: 10px; font-size: 11px; color: #721c24;">错误: ${result.error}</div>`;
            }

            logHTML += `<div style="margin-left: 10px; font-size: 11px; color: #666;">消息: ${result.message}</div>`;
            logHTML += '</div>';
        });

        logHTML += '</div>';
        syncLogs.innerHTML = logHTML;
    }

    showSyncResult(result) {
        const syncLogs = this.elements.syncLogs;
        const progressFill = this.elements.progressFill;
        const progressText = this.elements.progressText;

        // 显示进度条
        this.elements.progressContainer.style.display = 'block';
        syncLogs.style.display = 'block';

        // 更新进度到100%
        progressFill.style.width = '100%';
        progressText.textContent = '同步完成';

        // 显示日志
        syncLogs.innerHTML = '';
        result.logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            
            // 根据日志内容设置图标和颜色
            let icon = '📝';
            let className = '';
            
            if (log.includes('✅')) {
                icon = '✅';
                className = 'log-success';
            } else if (log.includes('❌')) {
                icon = '❌';
                className = 'log-error';
            } else if (log.includes('⏭️')) {
                icon = '⏭️';
                className = 'log-warning';
            } else if (log.includes('🔄')) {
                icon = '🔄';
                className = 'log-info';
            }
            
            logEntry.className = `log-entry ${className}`;
            logEntry.innerHTML = `<span class="log-icon">${icon}</span><span class="log-text">${log}</span>`;
            syncLogs.appendChild(logEntry);
        });
        
        // 滚动到底部
        syncLogs.scrollTop = syncLogs.scrollHeight;
        
        // 显示统计信息
        if (result.stats) {
            const stats = result.stats;
            const summaryHtml = `
                <div class="sync-summary">
                    <h4>📊 同步统计</h4>
                    <div class="stats-grid">
                        <div class="stat-item success">
                            <div class="stat-number">${stats.success}</div>
                            <div class="stat-label">成功</div>
                        </div>
                        <div class="stat-item error">
                            <div class="stat-number">${stats.failed}</div>
                            <div class="stat-label">失败</div>
                        </div>
                        <div class="stat-item warning">
                            <div class="stat-number">${stats.unchanged}</div>
                            <div class="stat-label">未变更</div>
                        </div>
                        <div class="stat-item info">
                            <div class="stat-number">${stats.duration}ms</div>
                            <div class="stat-label">耗时</div>
                        </div>
                    </div>
                </div>
            `;
            
            syncLogs.insertAdjacentHTML('afterbegin', summaryHtml);
        }
    }

    showSyncError(error) {
        const syncLogs = this.elements.syncLogs;
        const progressFill = this.elements.progressFill;
        const progressText = this.elements.progressText;
        
        // 显示进度条
        this.elements.progressContainer.style.display = 'block';
        syncLogs.style.display = 'block';
        
        // 设置错误状态
        progressFill.style.width = '0%';
        progressFill.style.backgroundColor = '#ef4444';
        progressText.textContent = '同步失败';
        
        // 显示错误信息
        syncLogs.innerHTML = `
            <div class="sync-summary error">
                <h4>❌ 同步失败</h4>
                <div class="error-details">
                    <p><strong>错误信息:</strong> ${error.message || '未知错误'}</p>
                    ${error.error ? `<p><strong>详细信息:</strong> ${error.error}</p>` : ''}
                    ${error.suggestions ? `
                        <div class="suggestions">
                            <p><strong>建议:</strong></p>
                            <ul>
                                ${error.suggestions.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    updateSyncUI(isSyncing) {
        const startBtns = [
            this.elements.startSyncBtn,
            this.elements.startSyncBtn2
        ];

        startBtns.forEach(btn => {
            if (btn) {
                btn.disabled = isSyncing;
                btn.innerHTML = isSyncing ? '<i class="fas fa-spinner fa-spin"></i> 同步中...' : btn.innerHTML.replace(/<i class="fas fa-spinner fa-spin"><\/i> 同步中\.\.\./, '<i class="fas fa-sync"></i> 开始同步');
            }
        });
    }

    viewModels() {
        this.openGlobalSearchModal();
    }

    // 选择式模型列表管理方法
    
    // 调试用：手动刷新模型列表渲染
    debugRefreshModelsList() {
        console.log('🔧 开始调试刷新模型列表...');
        
        const textarea = this.elements.originalModels;
        const modelsList = this.elements.originalModelsList;
        
        if (textarea) {
            console.log('📄 当前textarea状态:', {
                值: textarea.value,
                长度: textarea.value.length,
                显示状态: getComputedStyle(textarea).display,
                是否为空: textarea.value.trim() === ''
            });
            
            // 如果textarea为空，添加一些测试数据
            if (textarea.value.trim() === '') {
                console.log('📄 检测到空的textarea，准备添加测试数据...');
                const testModels = ['gpt-4', 'gpt-3.5-turbo', 'claude-3'];
                
                // 记录测试模型的来源
                testModels.forEach((model, index) => {
                    const channelId = index + 1;
                    const channelName = `测试渠道${channelId}`;
                    this.recordModelSource(model, 'channel', channelName, channelId);
                });
                
                // 更新textarea
                textarea.value = testModels.join('\n');
                console.log('✅ 测试数据已添加:', testModels);
            }
        }
        
        if (modelsList) {
            console.log('📋 模型列表元素状态:', {
                存在: true,
                innerHTML预览: modelsList.innerHTML.substring(0, 100) + '...',
                子元素数量: modelsList.children.length
            });
        } else {
            console.error('❌ 模型列表元素未找到');
        }
        
        console.log('📊 当前模型来源数据:', {
            tracker数量: this.modelSourceTracker.size,
            mapping数量: this.modelChannelMapping.size,
            tracker内容: Array.from(this.modelSourceTracker.entries()),
            mapping内容: Array.from(this.modelChannelMapping.entries())
        });
        
        // 强制重新渲染
        this.renderModelsList();
        
        console.log('🔧 调试刷新完成');
    }
    
    // 渲染模型列表UI
    renderModelsList() {
        console.log('🎨 开始渲染模型列表 - renderModelsList()');
        
        const modelsList = this.elements.originalModelsList;
        const modelsCount = this.elements.selectedModelsCount;
        
        console.log('🔍 DOM元素检查:', {
            modelsList存在: !!modelsList,
            modelsCount存在: !!modelsCount,
            modelsListId: modelsList?.id,
            modelsCountId: modelsCount?.id
        });
        
        if (!modelsList || !modelsCount) {
            console.error('❌ 关键DOM元素未找到:', { 
                modelsList: !!modelsList, 
                modelsCount: !!modelsCount 
            });
            return;
        }
        
        // 获取所有模型数据
        const modelsData = this.getModelsWithSources();
        console.log('🎨 渲染阶段 - 获取到的模型数据:', {
            数量: modelsData.length,
            数据: modelsData,
            调用时间: new Date().toLocaleTimeString()
        });
        
        // 更新计数
        modelsCount.textContent = `共 ${modelsData.length} 个模型`;
        console.log(`🔢 更新模型计数显示: ${modelsData.length}`);
        
        if (modelsData.length === 0) {
            console.log('📭 模型数量为0，显示空状态');
            modelsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list"></i>
                    <p>尚未添加任何模型</p>
                    <small>• 点击渠道卡片添加模型<br>• 使用全局搜索选择模型<br><br>🔧 调试提示：如果添加模型后仍显示此信息，<br>请按F12打开控制台，输入 <code>debugModelsList()</code> 并回车</small>
                </div>
            `;
            console.log('✅ 空状态HTML已设置');
            return;
        }
        
        console.log('📝 开始生成模型HTML列表...');
        let html = '';
        modelsData.forEach((modelData, index) => {
            const uniqueId = `model_${index}_${Date.now()}`;
            console.log(`📋 生成模型HTML - 索引${index}: ${modelData.name}`);
            
            html += `
                <div class="model-item-selectable" data-model="${modelData.name}" data-index="${index}">
                    <div class="model-checkbox">
                        <input type="checkbox" id="${uniqueId}" data-model="${modelData.name}" data-index="${index}">
                    </div>
                    <div class="model-info">
                        <div class="model-name">${modelData.name}</div>
                        <div class="model-source">${modelData.source}</div>
                    </div>
                    <div class="model-actions">
                        <button class="btn-icon-small" onclick="app.removeModelByIndex(${index})" title="删除此模型">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        console.log('📄 生成的HTML预览 (前200字符):', html.substring(0, 200) + '...');
        console.log('渲染完成，生成HTML长度:', html.length);
        
        modelsList.innerHTML = html;
        console.log('✅ HTML已设置到DOM元素');
        
        // 添加事件监听器
        console.log('🔗 重新绑定模型列表事件...');
        this.bindModelItemEvents();
        
        // 更新删除按钮状态
        this.updateDeleteButtonState();
        
        console.log('🎨 renderModelsList 完成，渲染时间:', new Date().toLocaleTimeString());

        // 自动触发预览更新（实现自动预览映射功能）
        setTimeout(() => {
            this.updatePreview();
        }, 100);

        // 最后验证渲染结果
        setTimeout(() => {
            const finalHTML = modelsList.innerHTML;
            console.log('🔍 渲染后验证:', {
                是否显示空状态: finalHTML.includes('尚未添加任何模型'),
                HTML长度: finalHTML.length,
                子元素数量: modelsList.children.length
            });
        }, 50);
    }
    
    // 获取模型及其来源数据
    getModelsWithSources() {
        console.log('🚀 开始获取模型数据 - getModelsWithSources()');
        
        const modelsTextarea = this.elements.originalModels;
        if (!modelsTextarea) {
            console.error('❌ 未找到原始模型文本框元素');
            return [];
        }
        
        console.log('🔍 文本框元素检查:', {
            id: modelsTextarea.id,
            存在: !!modelsTextarea,
            display: getComputedStyle(modelsTextarea).display,
            visibility: getComputedStyle(modelsTextarea).visibility
        });
        
        const textareaValue = modelsTextarea.value || '';
        console.log('📝 文本框内容详细检查:', {
            原始值: `"${textareaValue}"`,
            长度: textareaValue.length,
            是否空白: !textareaValue.trim(),
            元素引用: modelsTextarea,
            父元素: modelsTextarea.parentElement?.className,
            实际DOM值: modelsTextarea.getAttribute('value') || '无属性值'
        });
        
        // 额外检查：直接从DOM获取值
        const domValue = document.getElementById('originalModels')?.value;
        console.log('🔍 DOM直接获取值:', {
            通过ID获取值: `"${domValue}"`,
            与元素值相等: domValue === textareaValue
        });
        
        // 先过滤掉空行，然后处理有效的模型
        const modelLines = textareaValue.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
            
        console.log('🔍 模型行处理结果:', {
            原始行数: textareaValue.split('\n').length,
            过滤前的行: textareaValue.split('\n'),
            过滤后的行: modelLines,
            有效模型数: modelLines.length
        });
        
        if (modelLines.length === 0) {
            console.warn('⚠️ 没有找到任何有效的模型行');
            // 检查是否存在模型来源记录但文本框为空的情况
            console.log('🔍 模型来源记录检查:', {
                tracker记录数: this.modelSourceTracker.size,
                tracker内容: Array.from(this.modelSourceTracker.entries()),
                mapping记录数: this.modelChannelMapping.size,
                mapping内容: Array.from(this.modelChannelMapping.entries())
            });
        }
        
        const modelsData = [];
        const modelOccurrences = new Map();
        
        modelLines.forEach((modelName, index) => {
            const currentCount = modelOccurrences.get(modelName) || 0;
            modelOccurrences.set(modelName, currentCount + 1);
            
            const sourceDisplay = this.getModelSourceDisplay(modelName, currentCount);
            console.log(`📊 处理模型${index + 1}: "${modelName}" -> 来源显示: "${sourceDisplay}"`);
            
            modelsData.push({
                name: modelName,
                source: sourceDisplay,
                index: index
            });
        });
        
        console.log('✅ getModelsWithSources 最终结果:', {
            模型数量: modelsData.length,
            模型数据: modelsData,
            处理时间: new Date().toLocaleTimeString()
        });
        
        return modelsData;
    }
    
    // 绑定模型项事件
    bindModelItemEvents() {
        // 绑定复选框点击事件
        const checkboxes = this.elements.originalModelsList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const modelItem = checkbox.closest('.model-item-selectable');
                if (checkbox.checked) {
                    modelItem.classList.add('selected');
                } else {
                    modelItem.classList.remove('selected');
                }
                this.updateDeleteButtonState();
            });
        });
        
        // 绑定模型项点击事件（点击整行也可以选择）
        const modelItems = this.elements.originalModelsList.querySelectorAll('.model-item-selectable');
        modelItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // 如果点击的是删除按钮，不触发选择
                if (e.target.closest('.btn-icon-small')) return;
                
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        });
    }
    
    // 更新删除按钮状态
    updateDeleteButtonState() {
        const deleteBtn = this.elements.deleteSelectedModelsBtn;
        if (!deleteBtn) return;
        
        const checkedBoxes = this.elements.originalModelsList.querySelectorAll('input[type="checkbox"]:checked');
        deleteBtn.disabled = checkedBoxes.length === 0;
    }
    
    // 全选模型
    selectAllModels() {
        const checkboxes = this.elements.originalModelsList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    }
    
    // 取消全选
    deselectAllModels() {
        const checkboxes = this.elements.originalModelsList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkbox.checked = false;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    }
    
    // 删除选中的模型
    deleteSelectedModels() {
        const checkedBoxes = this.elements.originalModelsList.querySelectorAll('input[type="checkbox"]:checked');
        if (checkedBoxes.length === 0) {
            this.showNotification('请先选择要删除的模型', 'warning');
            return;
        }
        
        // 收集要删除的模型索引，按降序排列以避免删除时索引变化
        const indicesToDelete = Array.from(checkedBoxes)
            .map(checkbox => parseInt(checkbox.dataset.index))
            .sort((a, b) => b - a);
        
        // 获取当前模型列表
        const currentModels = this.elements.originalModels.value.split('\n').filter(m => m.trim());
        
        // 删除模型（从后往前删，避免索引变化）
        indicesToDelete.forEach(index => {
            if (index >= 0 && index < currentModels.length) {
                const modelName = currentModels[index];
                currentModels.splice(index, 1);
                
                // 移除对应的来源记录
                this.removeModelSourceRecord(modelName);
            }
        });
        
        // 更新隐藏的textarea
        this.elements.originalModels.value = currentModels.join('\n');
        
        // 重新分析和匹配模型来源
        this.analyzeAndMatchModelSources();
        
        // 重新渲染列表
        this.renderModelsList();
        
        // 更新预览
        this.updatePreview();
        
        this.showNotification(`已删除 ${indicesToDelete.length} 个模型`, 'success');
    }
    
    // 根据索引删除单个模型
    removeModelByIndex(index) {
        const currentModels = this.elements.originalModels.value.split('\n').filter(m => m.trim());
        
        if (index >= 0 && index < currentModels.length) {
            const modelName = currentModels[index];
            currentModels.splice(index, 1);
            
            // 移除对应的来源记录
            this.removeModelSourceRecord(modelName);
            
            // 更新隐藏的textarea
            this.elements.originalModels.value = currentModels.join('\n');
            
            // 重新分析和匹配模型来源
            this.analyzeAndMatchModelSources();
            
            // 重新渲染列表
            this.renderModelsList();
            
            // 更新预览
            this.updatePreview();
            
            this.showNotification(`已删除模型: ${modelName}`, 'success');
        }
    }
    
    // 移除模型来源记录
    removeModelSourceRecord(modelName) {
        // 移除modelSourceTracker中的记录
        const keysToRemove = [];
        this.modelSourceTracker.forEach((value, key) => {
            if (key.startsWith(`${modelName}#`)) {
                keysToRemove.push(key);
            }
        });
        
        keysToRemove.forEach(key => {
            this.modelSourceTracker.delete(key);
        });
        
        // 检查是否还有其他同名模型，如果没有则移除modelChannelMapping中的记录
        const hasOtherSameNameModels = Array.from(this.modelSourceTracker.keys())
            .some(key => key.startsWith(`${modelName}#`));
        
        if (!hasOtherSameNameModels) {
            this.modelChannelMapping.delete(modelName);
        }
        
        // 保存到localStorage
        this.saveModelSourceTracker();
    }

    clearMapping() {
        // 获取当前模型数量用于反馈
        const currentModels = this.elements.originalModels?.value.split('\n').filter(m => m.trim()) || [];
        const modelCount = currentModels.length;
        
        if (this.elements.originalModels) {
            this.elements.originalModels.value = '';
        }
        
        // 清空模型来源跟踪记录
        this.modelSourceTracker.clear();
        this.modelChannelMapping.clear();
        this.saveModelSourceTracker();
        
        // 清空预览
        this.updatePreview();
        
        // 重新渲染模型列表UI
        this.renderModelsList();
        
        // 清空已选择模型缓存
        this.currentSelectedModels = [];
        
        // 提供用户反馈
        if (modelCount > 0) {
            this.showNotification(`已清空映射配置，删除了 ${modelCount} 个模型及其来源记录`, 'success');
        } else {
            this.showNotification('映射配置已清空', 'info');
        }
        
        console.log(`清空映射配置完成 - 已删除 ${modelCount} 个模型的来源记录`);
    }

    loadMapping() {
        this.showNotification('导入功能正在开发中', 'info');
    }

    exportMapping() {
        this.showNotification('导出功能正在开发中', 'info');
    }

    openGlobalSearchModal() {
        if (this.elements.globalSearchModal) {
            this.elements.globalSearchModal.style.display = 'block';
            
            // 尝试恢复之前的搜索状态
            const restored = this.restoreGlobalSearchState();
            
            if (!restored) {
                // 如果没有缓存状态，清空搜索结果
                this.elements.globalSearchResults.innerHTML = '';
                this.elements.globalSearchInput.value = '';
                
                // 隐藏统计信息
                const statsElement = document.querySelector('.search-stats');
                if (statsElement) {
                    statsElement.style.display = 'none';
                }
                
                // 初始化搜索状态
                this.globalSearchResults = [];
                this.selectedGlobalResults = new Set();
            }
            
            // 焦点到搜索输入框
            this.elements.globalSearchInput.focus();
        }
    }

    closeGlobalSearchModal() {
        if (this.elements.globalSearchModal) {
            this.elements.globalSearchModal.style.display = 'none';
            
            // 清理搜索状态
            this.globalSearchResults = [];
            this.selectedGlobalResults = new Set();
        }
    }

    bindSearchKeyboardEvents() {
        // 为搜索输入框添加键盘事件
        this.elements.globalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+Enter 执行深度搜索
                    this.performDeepSearch();
                } else {
                    // Enter 执行普通搜索
                    this.performGlobalSearch();
                }
            } else if (e.key === 'Escape') {
                // Esc 关闭模态框
                this.closeGlobalSearchModal();
            }
        });
        
        // 全局键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl+K 打开搜索
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openGlobalSearchModal();
            }
            // F3 重复上次搜索
            else if (e.key === 'F3' && this.lastSearchTerm) {
                e.preventDefault();
                this.elements.globalSearchInput.value = this.lastSearchTerm;
                this.performGlobalSearch();
            }
        });
    }

    loadSearchHistory() {
        try {
            const history = localStorage.getItem('newapi-search-history');
            if (history) {
                this.searchHistory = JSON.parse(history);
                this.displaySearchSuggestions();
            }
        } catch (error) {
            console.warn('加载搜索历史失败:', error);
            this.searchHistory = [];
        }
    }

    saveSearchHistory(searchTerm) {
        if (!this.searchHistory) {
            this.searchHistory = [];
        }
        
        // 添加到历史记录，避免重复
        const index = this.searchHistory.indexOf(searchTerm);
        if (index > -1) {
            this.searchHistory.splice(index, 1);
        }
        this.searchHistory.unshift(searchTerm);
        
        // 限制历史记录数量
        if (this.searchHistory.length > 10) {
            this.searchHistory = this.searchHistory.slice(0, 10);
        }
        
        try {
            localStorage.setItem('newapi-search-history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('保存搜索历史失败:', error);
        }
    }

    displaySearchSuggestions() {
        if (!this.searchHistory || this.searchHistory.length === 0) return;
        
        let suggestionsContainer = document.getElementById('searchSuggestions');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'searchSuggestions';
            suggestionsContainer.className = 'search-suggestions';
            
            // 插入到搜索框下面
            this.elements.globalSearchInput.parentNode.appendChild(suggestionsContainer);
        }
        
        suggestionsContainer.innerHTML = `
            <div class="suggestions-header">
                <i class="fas fa-history"></i>
                <span>最近搜索</span>
                <button class="btn-icon clear-history" onclick="app.clearSearchHistory()" title="清除历史">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="suggestions-list">
                ${this.searchHistory.map(term => `
                    <button class="suggestion-item" onclick="app.useSearchSuggestion('${this.escapeJsString(term)}')" title="点击使用此搜索词">
                        <i class="fas fa-search"></i>
                        <span>${term}</span>
                    </button>
                `).join('')}
            </div>
        `;
        
        suggestionsContainer.style.display = 'block';
    }

    useSearchSuggestion(searchTerm) {
        this.elements.globalSearchInput.value = searchTerm;
        this.hideSuggestions();
        this.performGlobalSearch();
    }

    clearSearchHistory() {
        this.searchHistory = [];
        localStorage.removeItem('newapi-search-history');
        this.hideSuggestions();
        this.showNotification('搜索历史已清除', 'info');
    }

    hideSuggestions() {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    async performGlobalSearch() {
        const searchTerm = this.elements.globalSearchInput.value.trim();
        if (!searchTerm) {
            this.showNotification('请输入搜索关键词', 'warning');
            return;
        }
        
        // 隐藏建议
        this.hideSuggestions();
        
        // 保存搜索历史
        this.saveSearchHistory(searchTerm);
        this.lastSearchTerm = searchTerm;
        
        // 显示搜索进度
        this.showSearchProgress('正在全局搜索模型...', 0);
        this.setLoading(this.elements.performGlobalSearchBtn, true);
        
        try {
            // 默认搜索所有渠道
            const searchResults = await this.searchInAllChannels(searchTerm);
            
            this.globalSearchResults = searchResults;
            this.displayGlobalSearchResults(searchResults);
            
            const totalResults = searchResults.reduce((sum, channel) => sum + channel.models.length, 0);
            this.showNotification(`全局搜索完成，找到 ${totalResults} 个匹配的模型`, 'success');
            
        } catch (error) {
            console.error('全局搜索失败:', error);
            this.showNotification('搜索失败: ' + error.message, 'error');
            this.elements.globalSearchResults.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>搜索失败</div>
                    <div class="error-message">${error.message}</div>
                </div>
            `;
        } finally {
            this.setLoading(this.elements.performGlobalSearchBtn, false);
            this.hideSearchProgress();
        }
    }
    
    async searchInAllChannels(searchTerm) {
        console.log(`🔍 开始在所有渠道中搜索: "${searchTerm}"`);
        const results = [];
        const config = this.getConfig();
        const searchPattern = new RegExp(searchTerm.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        
        let processedCount = 0;
        const totalChannels = this.channels.length;
        
        // 限制并发数量，避免请求过多
        const batchSize = 3;
        for (let i = 0; i < totalChannels; i += batchSize) {
            const batch = this.channels.slice(i, i + batchSize);
            
            const promises = batch.map(async (channel) => {
                try {
                    console.log(`🔍 搜索渠道 ${channel.id} (${channel.name})...`);
                    
                    // 获取渠道的所有模型
                    const response = await this.fetchWithTimeout('/api/channel-models', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            ...config,
                            channelId: channel.id,
                            fetchAll: true,
                            includeDisabled: true
                        })
                    }, 15000);
                    
                    const result = await response.json();
                    const matchingModels = [];
                    
                    if (result.success && result.data && Array.isArray(result.data)) {
                        for (const model of result.data) {
                            if (searchPattern.test(model)) {
                                matchingModels.push({
                                    name: model,
                                    originalName: model,
                                    channelId: channel.id,
                                    channelName: channel.name
                                });
                            }
                        }
                        
                        console.log(`✅ 渠道 ${channel.id} 找到 ${matchingModels.length} 个匹配模型`);
                    } else {
                        console.log(`ℹ️ 渠道 ${channel.id} 获取模型失败或无模型`);
                    }
                    
                    return {
                        channel: {
                            id: channel.id,
                            name: channel.name,
                            type: channel.type
                        },
                        models: matchingModels
                    };
                    
                } catch (error) {
                    console.warn(`❌ 搜索渠道 ${channel.id} 失败:`, error.message);
                    return {
                        channel: {
                            id: channel.id,
                            name: channel.name,
                            type: channel.type
                        },
                        models: []
                    };
                }
            });
            
            const batchResults = await Promise.all(promises);
            
            // 只添加有匹配模型的结果
            batchResults.forEach(result => {
                if (result.models.length > 0) {
                    results.push(result);
                }
            });
            
            processedCount += batch.length;
            
            // 更新搜索进度
            const progress = Math.round((processedCount / totalChannels) * 100);
            this.showSearchProgress(`正在搜索... (${processedCount}/${totalChannels})`, progress);
            
            // 批次间稍作延迟
            if (i + batchSize < totalChannels) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        console.log(`🎉 搜索完成，在 ${results.length} 个渠道中找到匹配项`);
        return results;
    }

    async performDeepSearch() {
        const searchTerm = this.elements.globalSearchInput.value.trim();
        if (!searchTerm) {
            this.showNotification('请输入搜索关键词', 'warning');
            return;
        }
        
        // 显示搜索进度
        this.showSearchProgress('正在执行深度搜索...', 0);
        this.setLoading(this.elements.performDeepSearchBtn, true);
        
        try {
            let searchResults = [];
            
            // 深度搜索：使用更多搜索模式，默认搜索所有渠道
            const searchPatterns = this.generateSearchPatterns(searchTerm);
            console.log(`🔍 深度搜索使用 ${searchPatterns.length} 个搜索模式`);
            
            let processed = 0;
            const totalPatterns = searchPatterns.length;
            
            for (const pattern of searchPatterns) {
                try {
                    console.log(`🔍 搜索模式: "${pattern}"`);
                    
                    // 在所有渠道中搜索当前模式
                    const patternResults = await this.searchInAllChannels(pattern);
                    
                    // 合并结果，避免重复
                    patternResults.forEach(result => {
                        const existingChannel = searchResults.find(r => r.channel.id === result.channel.id);
                        if (existingChannel) {
                            // 合并模型，去重
                            const existingModelNames = existingChannel.models.map(m => m.name);
                            const newModels = result.models.filter(m => !existingModelNames.includes(m.name));
                            existingChannel.models.push(...newModels);
                        } else {
                            searchResults.push(result);
                        }
                    });
                    
                    processed++;
                    const progress = Math.round((processed / totalPatterns) * 100);
                    this.showSearchProgress(`深度搜索进行中... (${processed}/${totalPatterns})`, progress);
                    
                    // 批次间延迟
                    if (processed < totalPatterns) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error) {
                    console.error(`搜索模式 "${pattern}" 失败:`, error.message);
                }
            }
            
            // 对搜索结果按相关性排序
            searchResults = this.rankSearchResults(searchResults, searchTerm);
            
            this.globalSearchResults = searchResults;
            this.displayGlobalSearchResults(searchResults);
            
            const totalResults = searchResults.reduce((sum, channel) => sum + channel.models.length, 0);
            this.showNotification(`深度搜索完成，找到 ${totalResults} 个相关模型`, 'success');
            
        } catch (error) {
            console.error('深度搜索失败:', error);
            this.showNotification('深度搜索失败: ' + error.message, 'error');
            this.elements.globalSearchResults.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>深度搜索失败</div>
                    <div class="error-message">${error.message}</div>
                </div>
            `;
        } finally {
            this.setLoading(this.elements.performDeepSearchBtn, false);
            this.hideSearchProgress();
        }
    }

    generateSearchPatterns(searchTerm) {
        const patterns = new Set();
        const term = searchTerm.toLowerCase();
        
        // 1. 原始搜索词
        patterns.add(searchTerm);
        
        // 2. 不区分大小写
        patterns.add(term);
        
        // 3. 移除常见连字符和下划线
        patterns.add(term.replace(/[-_]/g, ''));
        patterns.add(term.replace(/[-_]/g, ' '));
        
        // 4. 模型名称变体
        if (term.includes('gpt')) {
            patterns.add(term.replace('gpt', 'gpt-'));
            patterns.add(term.replace('gpt-', 'gpt'));
            if (term.includes('4')) {
                patterns.add('gpt-4');
                patterns.add('gpt4');
            }
            if (term.includes('3.5') || term.includes('35')) {
                patterns.add('gpt-3.5-turbo');
                patterns.add('gpt35');
            }
        }
        
        if (term.includes('claude')) {
            patterns.add(term.replace('claude', 'claude-'));
            patterns.add(term.replace('claude-', 'claude'));
            if (term.includes('3')) {
                patterns.add('claude-3');
                patterns.add('claude3');
            }
        }
        
        if (term.includes('gemini')) {
            patterns.add('gemini-pro');
            patterns.add('gemini-1.5');
            patterns.add('gemini-flash');
        }
        
        if (term.includes('deepseek')) {
            patterns.add('deepseek-v3');
            patterns.add('deepseek-coder');
            patterns.add('deepseek-chat');
        }
        
        // 5. 部分匹配（如果搜索词长于3个字符）
        if (searchTerm.length > 3) {
            const parts = searchTerm.split(/[-_\s]/);
            parts.forEach(part => {
                if (part.length > 2) {
                    patterns.add(part);
                }
            });
        }
        
        // 6. 版本号变体
        const versionPatterns = term.match(/(\d+\.?\d*)/g);
        if (versionPatterns) {
            versionPatterns.forEach(version => {
                patterns.add(version);
                patterns.add(`v${version}`);
                patterns.add(`${version}.0`);
            });
        }
        
        console.log(`🔍 为 "${searchTerm}" 生成了 ${patterns.size} 个搜索模式`);
        return Array.from(patterns);
    }

    rankSearchResults(searchResults, originalTerm) {
        // 按相关性对搜索结果进行排序
        const term = originalTerm.toLowerCase();
        
        return searchResults.map(result => {
            // 计算渠道的相关性分数
            let channelScore = 0;
            
            // 渠道名称匹配
            if (result.channel.name && result.channel.name.toLowerCase().includes(term)) {
                channelScore += 10;
            }
            
            // 计算模型的相关性分数
            result.models = result.models.map(model => {
                let modelScore = 0;
                const modelName = model.name.toLowerCase();
                
                // 完全匹配
                if (modelName === term) {
                    modelScore += 100;
                }
                // 开头匹配
                else if (modelName.startsWith(term)) {
                    modelScore += 50;
                }
                // 包含匹配
                else if (modelName.includes(term)) {
                    modelScore += 25;
                }
                // 部分匹配
                else {
                    const termParts = term.split(/[-_\s]/);
                    termParts.forEach(part => {
                        if (modelName.includes(part)) {
                            modelScore += 10;
                        }
                    });
                }
                
                return { ...model, score: modelScore };
            }).sort((a, b) => b.score - a.score);
            
            return { ...result, score: channelScore + (result.models[0]?.score || 0) };
        }).sort((a, b) => b.score - a.score);
    }

    selectAllGlobalResults() {
        const checkboxes = this.elements.globalSearchResults.querySelectorAll('input[type="checkbox"]');
        
        if (checkboxes.length === 0) {
            this.showNotification('没有搜索结果可以选择', 'warning');
            return;
        }
        
        let selectedCount = 0;
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.checked = true;
                this.onSearchResultSelect(checkbox);
                selectedCount++;
            }
        });
        
        if (selectedCount > 0) {
            this.showNotification(`已选择 ${selectedCount} 个搜索结果`, 'success');
        } else {
            this.showNotification('所有搜索结果已选择', 'info');
        }
    }

    deselectAllGlobalResults() {
        const checkboxes = this.elements.globalSearchResults.querySelectorAll('input[type="checkbox"]');
        
        if (checkboxes.length === 0) {
            this.showNotification('没有搜索结果可以取消', 'warning');
            return;
        }
        
        let deselectedCount = 0;
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkbox.checked = false;
                this.onSearchResultSelect(checkbox);
                deselectedCount++;
            }
        });
        
        if (deselectedCount > 0) {
            this.showNotification(`已取消选择 ${deselectedCount} 个搜索结果`, 'info');
        } else {
            this.showNotification('没有已选择的搜索结果', 'info');
        }
    }

    applyGlobalSelection() {
        // 获取所有选中的模型
        const selectedModels = this.getSelectedGlobalModels();
        
        if (selectedModels.length === 0) {
            this.showNotification('请先选择要添加的模型', 'warning');
            return;
        }
        
        // 添加到映射配置
        const modelsTextarea = this.elements.originalModels;
        const currentModels = modelsTextarea.value.split('\n').map(m => m.trim()).filter(m => m);
        
        const newModelNames = [];
        const addedModelsInfo = [];
        
        selectedModels.forEach(model => {
            // 检查模型是否已存在
            if (!currentModels.includes(model.name)) {
                newModelNames.push(model.name);
                
                // 获取渠道信息并记录模型来源
                const channelInfo = this.channels.find(ch => ch.id.toString() === model.channelId);
                const channelName = channelInfo ? channelInfo.name : `渠道${model.channelId}`;
                
                // 记录模型来源为搜索选择，传入渠道ID
                this.recordModelSource(model.name, 'search', channelName, parseInt(model.channelId));
                
                addedModelsInfo.push(`${model.name} (来自: ${channelName})`);
            }
        });
        
        if (newModelNames.length === 0) {
            this.showNotification('所选模型已存在于映射配置中', 'info');
            return;
        }
        
        // 更新模型列表（通过程序控制，不是用户输入）
        const updatedModels = [...currentModels, ...newModelNames];
        modelsTextarea.value = updatedModels.join('\n');
        
        console.log('🔄 applyGlobalSelection: 已更新textarea值为:', modelsTextarea.value);
        
        // 自动匹配模型来源
        this.analyzeAndMatchModelSources();
        
        // 重新渲染模型列表UI (延迟一点执行，确保数据已更新)
        setTimeout(() => {
            console.log('🎨 applyGlobalSelection: 触发渲染...');
            this.renderModelsList();
        }, 100);
        
        // 更新预览
        this.updatePreview();
        
        // 关闭搜索模态框
        this.closeGlobalSearchModal();
        
        // 显示成功信息
        const message = `已添加 ${newModelNames.length} 个模型:\n${addedModelsInfo.join('\n')}\n\n💡 提示: 渠道来源已自动记录并显示在右侧`;
        this.showNotification(message, 'success');
    }

    // 旧的syncChannelSources方法已被analyzeAndMatchModelSources替代

    displayGlobalSearchResults(searchResults) {
        const resultsContainer = this.elements.globalSearchResults;
        
        if (!searchResults || searchResults.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <div>未找到匹配的模型</div>
                    <div class="search-help">尝试使用不同的关键词或启用"搜索所有渠道"</div>
                </div>
            `;
            return;
        }
        
        // 按渠道分类所有搜索结果
        const modelsByChannel = {};
        
        searchResults.forEach(channelResult => {
            // 使用渠道ID作为唯一键，确保不同渠道不会因为同名而合并
            const channelKey = `channel_${channelResult.channel.id}`;
            
            if (!modelsByChannel[channelKey]) {
                modelsByChannel[channelKey] = {
                    channel: channelResult.channel,
                    models: []
                };
            }
            
            channelResult.models.forEach(model => {
                modelsByChannel[channelKey].models.push({
                    ...model,
                    channelInfo: channelResult.channel
                });
            });
        });
        
        // 生成HTML
        let html = '';
        Object.entries(modelsByChannel).forEach(([channelKey, channelData]) => {
            const { channel, models } = channelData;
            const channelDisplayName = channel.name || `渠道 ${channel.id}`;
            const channelTypeName = this.getChannelTypeName(channel.type);
            const isCollapsed = this.getChannelCollapsedState(channel.id);
            
            html += `
                <div class="model-category ${isCollapsed ? 'collapsed' : ''}" data-channel="${channel.id}">
                    <div class="model-category-header" onclick="app.toggleChannelCollapse(${channel.id})">
                        <div class="model-category-title">
                            <i class="fas fa-server"></i>
                            <h6>${channelDisplayName}</h6>
                        </div>
                        <div class="channel-category-meta">
                            <span class="channel-type-badge">${channelTypeName}</span>
                            <span class="model-category-count">${models.length} 个模型</span>
                        </div>
                        <div class="category-actions" onclick="event.stopPropagation()">
                            <button class="btn-icon collapse-btn" onclick="app.toggleChannelCollapse(${channel.id})" title="${isCollapsed ? '展开' : '收起'}">
                                <i class="fas fa-chevron-${isCollapsed ? 'down' : 'up'}"></i>
                            </button>
                            <button class="btn-icon" onclick="app.selectAllInChannel('${channel.id}')" title="全选此渠道">
                                <i class="fas fa-check-square"></i>
                            </button>
                        </div>
                    </div>
                    <div class="model-category-content">
                        <div class="search-results-grid">
                            ${models.map(model => `
                                <div class="search-result-item" data-model="${model.name}" data-channel="${channel.id}">
                                    <div class="search-result-checkbox">
                                        <input type="checkbox" 
                                               id="search-${model.name.replace(/[^a-zA-Z0-9]/g, '-')}-${channel.id}" 
                                               data-model="${model.name}"
                                               data-channel-id="${channel.id}"
                                               onchange="app.onSearchResultSelect(this)">
                                        <label for="search-${model.name.replace(/[^a-zA-Z0-9]/g, '-')}-${channel.id}">
                                            ${model.name}
                                        </label>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        
        resultsContainer.innerHTML = html;
        
        // 显示和更新统计信息
        const totalModels = searchResults.reduce((sum, result) => sum + result.models.length, 0);
        const totalChannels = searchResults.length;
        
        const statsElement = document.querySelector('.search-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                找到 <strong>${totalModels}</strong> 个模型，来自 <strong>${totalChannels}</strong> 个渠道
            `;
            statsElement.style.display = 'block';
        }
        
        // 初始化选择统计
        this.updateSelectionStats();
    }

    getSelectedGlobalModels() {
        const selected = [];
        const selectedSet = new Set(); // 用于去重的Set
        const checkboxes = this.elements.globalSearchResults.querySelectorAll('input[type="checkbox"]:checked');
        
        checkboxes.forEach(checkbox => {
            const modelName = checkbox.dataset.model;
            const channelId = checkbox.dataset.channelId;
            
            if (modelName) {
                // 创建唯一标识符：模型名@渠道ID
                const uniqueKey = `${modelName}@${channelId}`;
                
                if (!selectedSet.has(uniqueKey)) {
                    selectedSet.add(uniqueKey);
                    selected.push({
                        name: modelName,
                        channelId: channelId,
                        uniqueKey: uniqueKey
                    });
                }
            }
        });
        
        return selected;
    }

    onSearchResultSelect(checkbox) {
        const resultItem = checkbox.closest('.search-result-item');
        if (checkbox.checked) {
            resultItem.classList.add('selected');
        } else {
            resultItem.classList.remove('selected');
        }
        
        // 更新选择统计
        this.updateSelectionStats();
        
        // 保存状态
        this.saveGlobalSearchState();
    }

    selectAllInChannel(channelId) {
        const channelElement = document.querySelector(`.model-category[data-channel="${channelId}"]`);
        if (!channelElement) {
            this.showNotification('渠道元素未找到', 'error');
            return;
        }
        
        const checkboxes = channelElement.querySelectorAll('input[type="checkbox"]');
        
        if (checkboxes.length === 0) {
            this.showNotification('该渠道没有可选择的模型', 'warning');
            return;
        }
        
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
            this.onSearchResultSelect(checkbox);
        });
        
        const channelNameElement = channelElement.querySelector('.model-category-title h6');
        const channelName = channelNameElement ? channelNameElement.textContent : `渠道 ${channelId}`;
        
        this.showNotification(
            allChecked ? `已取消选择 ${channelName} 的所有模型` : `已选择 ${channelName} 的所有模型`, 
            'success'
        );
    }

    // 渠道折叠状态管理
    getChannelCollapsedState(channelId) {
        const saved = localStorage.getItem(`channel-collapsed-${channelId}`);
        return saved === 'true';
    }

    setChannelCollapsedState(channelId, collapsed) {
        localStorage.setItem(`channel-collapsed-${channelId}`, collapsed.toString());
    }

    toggleChannelCollapse(channelId) {
        const channelElement = document.querySelector(`.model-category[data-channel="${channelId}"]`);
        if (!channelElement) {
            this.showNotification('渠道元素未找到', 'error');
            return;
        }

        const isCollapsed = channelElement.classList.contains('collapsed');
        const newState = !isCollapsed;

        // 更新DOM
        channelElement.classList.toggle('collapsed', newState);
        
        // 更新按钮图标和提示
        const collapseBtn = channelElement.querySelector('.collapse-btn');
        if (collapseBtn) {
            const icon = collapseBtn.querySelector('i');
            if (icon) {
                icon.className = `fas fa-chevron-${newState ? 'down' : 'up'}`;
            }
            collapseBtn.title = newState ? '展开' : '收起';
        }

        // 保存状态
        this.setChannelCollapsedState(channelId, newState);
        
        // 提供视觉反馈
        this.showNotification(newState ? '已收起渠道' : '已展开渠道', 'info');
    }

    // 全局搜索状态缓存
    saveGlobalSearchState() {
        const searchTerm = this.elements.globalSearchInput?.value || '';
        const selectedModels = this.getSelectedGlobalModels();
        
        const state = {
            searchTerm,
            selectedModels: selectedModels.map(model => model.uniqueKey), // 保存唯一标识符
            searchResults: this.globalSearchResults || [],
            timestamp: Date.now()
        };
        
        localStorage.setItem('global-search-state', JSON.stringify(state));
    }

    loadGlobalSearchState() {
        try {
            const saved = localStorage.getItem('global-search-state');
            if (!saved) return null;

            const state = JSON.parse(saved);
            // 缓存有效期24小时
            if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem('global-search-state');
                return null;
            }

            return state;
        } catch (e) {
            console.error('加载全局搜索状态失败:', e);
            return null;
        }
    }

    restoreGlobalSearchState() {
        const state = this.loadGlobalSearchState();
        if (!state) return false;

        // 恢复搜索词
        if (this.elements.globalSearchInput && state.searchTerm) {
            this.elements.globalSearchInput.value = state.searchTerm;
        }

        // 恢复搜索结果
        if (state.searchResults && state.searchResults.length > 0) {
            this.globalSearchResults = state.searchResults;
            this.displayGlobalSearchResults(state.searchResults);
            
            // 恢复选择状态
            setTimeout(() => {
                state.selectedModels.forEach(uniqueKey => {
                    // uniqueKey格式: "modelName@channelId"
                    const [modelName, channelId] = uniqueKey.split('@');
                    const checkbox = this.elements.globalSearchResults.querySelector(
                        `input[data-model="${modelName}"][data-channel-id="${channelId}"]`
                    );
                    if (checkbox) {
                        checkbox.checked = true;
                        this.onSearchResultSelect(checkbox);
                    }
                });
            }, 100);

            return true;
        }

        return false;
    }

    updateSelectionStats() {
        const selectedModels = this.getSelectedGlobalModels();
        const selectedCount = selectedModels.length;
        
        // 更新按钮状态
        const applyButton = this.elements.applyGlobalSelectionBtn;
        if (applyButton) {
            applyButton.disabled = selectedCount === 0;
            applyButton.innerHTML = `
                <i class="fas fa-check"></i>
                应用选择 ${selectedCount > 0 ? `(${selectedCount})` : ''}
            `;
        }
        
        // 更新全选/取消全选按钮
        const totalCheckboxes = this.elements.globalSearchResults.querySelectorAll('input[type="checkbox"]').length;
        const selectAllButton = this.elements.selectAllGlobalResultsBtn;
        const deselectAllButton = this.elements.deselectAllGlobalResultsBtn;
        
        if (selectAllButton && deselectAllButton) {
            selectAllButton.disabled = selectedCount === totalCheckboxes;
            deselectAllButton.disabled = selectedCount === 0;
        }
    }

    showSearchProgress(message, percentage) {
        let progressContainer = document.getElementById('globalSearchProgress');
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'globalSearchProgress';
            progressContainer.className = 'search-progress';
            
            // 插入到搜索结果前面
            this.elements.globalSearchResults.parentNode.insertBefore(
                progressContainer, 
                this.elements.globalSearchResults
            );
        }
        
        progressContainer.innerHTML = `
            <div class="progress-content">
                <div class="progress-message">${message}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="progress-percentage">${percentage}%</div>
            </div>
        `;
        
        progressContainer.style.display = 'block';
    }

    hideSearchProgress() {
        const progressContainer = document.getElementById('globalSearchProgress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    refreshModelCache() {
        // 显示确认对话框
        if (confirm('确定要重新获取所有渠道的模型数据吗？这将清除所有缓存数据并重新从API获取真实数据。')) {
            // 清空模型缓存
            this.clearModelCache();
            
            // 重置所有渠道的获取状态
            this.channels.forEach(channel => {
                channel.models_fetched = undefined;
                channel.models_fetch_error = undefined;
                channel.models = undefined;
                channel.model_count = undefined;
            });
            
            // 重新渲染界面
            this.renderChannels();
            
            // 重新获取模型数据
            setTimeout(() => {
                this.fetchModelsForAllChannels();
            }, 1000);
        }
    }

    // 统一的模型获取函数 - 正确使用API端点
    async fetchChannelModels(channelId, options = {}) {
        const { 
            forceRefresh = true, 
            showLoading = true, 
            includeSelected = true 
        } = options;
        
        const channel = this.channels.find(c => c.id == channelId);
        if (!channel) {
            throw new Error('渠道不存在');
        }
        
        const config = this.getConfig();
        console.log(`🔍 获取渠道 ${channelId} (${channel.name}) 的模型数据...`);
        
        try {
            // 并行获取所有模型和已选择的模型
            const [allModelsResponse, selectedModelsResponse] = await Promise.all([
                // 获取所有可用模型 - 使用 fetch_models 端点
                this.fetchWithTimeout(`/api/channel-models`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...config,
                        channelId: channelId,
                        fetchAll: true,
                        includeDisabled: true
                    })
                }, 30000),
                
                // 获取已选择的模型 - 使用 channel 端点
                includeSelected ? this.fetchWithTimeout(`/api/channel-models`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...config,
                        channelId: channelId,
                        fetchSelectedOnly: true
                    })
                }, 15000) : Promise.resolve({ json: () => ({ success: true, data: [] }) })
            ]);
            
            const allModelsResult = await allModelsResponse.json();
            const selectedModelsResult = await selectedModelsResponse.json();
            
            if (!allModelsResult.success || !allModelsResult.data) {
                throw new Error(allModelsResult.message || '获取所有模型失败');
            }
            
            // 处理所有模型数据 - 保持原始名称
            const allModels = Array.isArray(allModelsResult.data) ? allModelsResult.data : [];
            // 不再清理后缀，保持所有模型的原始名称
            
            // 处理已选择的模型数据 - 保持NewAPI内模型的原始名称
            let selectedModels = [];
            if (selectedModelsResult.success && selectedModelsResult.data) {
                const rawSelected = Array.isArray(selectedModelsResult.data) ? selectedModelsResult.data : 
                                  typeof selectedModelsResult.data === 'string' ? selectedModelsResult.data.split(',').map(s => s.trim()) : [];
                selectedModels = rawSelected; // 不清理后缀，保持原始名称
            }
            
            console.log(`✅ 渠道 ${channelId} 获取成功: ${allModels.length} 个所有模型, ${selectedModels.length} 个已选择模型`);
            
            // 更新渠道数据
            channel.models = allModels; // 保持原始名称
            channel.model_count = allModels.length;
            channel.models_fetched = true;
            channel.models_fetch_error = undefined;
            
            return {
                allModels: allModels, // 保持原始名称
                selectedModels: selectedModels
            };
            
        } catch (error) {
            console.error(`❌ 获取渠道 ${channelId} 模型失败:`, error.message);
            
            // 更新渠道错误状态
            channel.models_fetched = false;
            channel.models_fetch_error = error.message;
            
            throw error;
        }
    }

    clearChannelCache(channelId) {
        // 清除指定渠道的所有缓存数据
        const config = this.getConfig();
        const cacheKey = this.getCacheKey(channelId, config);
        
        // 从内存缓存中移除
        this.channelModelsCache.delete(cacheKey);
        
        // 清除渠道的获取状态，强制重新获取
        const channel = this.channels.find(c => c.id == channelId);
        if (channel) {
            channel.models_fetched = undefined;
            channel.models_fetch_error = undefined;
            channel.models = undefined;
            channel.model_count = undefined;
        }
        
        // 更新本地存储的缓存
        this.saveModelCache();
        
        console.log(`🔄 已清除渠道 ${channelId} 的缓存数据`);
        this.showNotification(`已清除渠道缓存，正在获取最新数据...`, 'info');
    }

    showChannelModelsModal(channelId) {
        const channel = this.channels.find(c => c.id == channelId);
        if (!channel) {
            this.showNotification('渠道不存在', 'error');
            return;
        }
        
        // 保存当前渠道ID，供其他函数使用
        this.currentModalChannelId = channelId;
        
        // 设置模态框标题
        this.elements.channelModelsTitle.textContent = `${channel.name} - 模型管理`;
        
        // 显示模态框
        this.elements.channelModelsModal.style.display = 'block';
        
        // 立即加载模型数据（统一入口）
        this.loadChannelModelsInModal(channelId);
    }
    
    async loadChannelModelsInModal(channelId) {
        // 显示加载状态
        this.elements.modelsList.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <div>正在获取模型数据...</div>
                <div class="loading-subtitle">获取所有模型和NewAPI内已选择状态...</div>
            </div>
        `;
        
        try {
            // 使用统一的获取函数，包含NewAPI内已选择模型
            const { allModels, selectedModels } = await this.fetchChannelModels(channelId, { 
                forceRefresh: true,
                includeSelected: true
            });
            
            // 保存NewAPI内的已选择模型（API获取的）
            this.currentChannelApiSelectedModels = selectedModels;
            
            // 初始化页面选择的模型为空（用户实时选择）
            this.currentChannelSelectedModels = [];
            
            // 显示模型列表，只标记NewAPI内已存在的模型为默认勾选
            this.displayModelsInModal(allModels, selectedModels);
            
            // 更新计数
            this.elements.modelsCount.textContent = `共 ${allModels.length} 个模型 (NewAPI内已选中 ${selectedModels.length} 个)`;
            
            // 显示当前页面选择的模型（初始为空）
            this.displayCurrentChannelSelectedModels([]);
            
            // 更新渠道卡片显示
            this.updateChannelCard(this.channels.find(c => c.id == channelId));
            
        } catch (error) {
            this.showModalError(error);
        }
    }
    
    displayModelsInModal(models, apiSelectedModels = []) {
        if (!models || models.length === 0) {
            this.elements.modelsList.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-inbox"></i>
                    <div>该渠道没有可用模型</div>
                </div>
            `;
            return;
        }
        
        // 将NewAPI内已选择模型转换为Set，用于快速查找匹配
        // 现在两边都是原始名称，直接匹配
        const apiSelectedSet = new Set(apiSelectedModels);
        
        // 按类型分类模型（使用原始名称）
        const categorizedModels = this.categorizeModelsArray(models);
        
        let html = '';
        Object.entries(categorizedModels).forEach(([category, categoryModels]) => {
            const apiSelectedInCategory = categoryModels.filter(model => apiSelectedSet.has(model));
            
            html += `
                <div class="model-category">
                    <div class="model-category-header">
                        <div class="model-category-title">
                            <i class="fas fa-cube"></i>
                            <h6>${category}</h6>
                        </div>
                        <span class="model-category-count">
                            ${categoryModels.length} 个模型
                            ${apiSelectedInCategory.length > 0 ? ` (NewAPI内已选中 ${apiSelectedInCategory.length} 个)` : ''}
                        </span>
                    </div>
                    <div class="model-category-content">
                        ${categoryModels.map(model => {
                            const isInNewAPI = apiSelectedSet.has(model);
                            return `
                                <div class="model-item">
                                    <div class="model-checkbox">
                                        <input type="checkbox" 
                                               id="model-${model.replace(/[^a-zA-Z0-9]/g, '-')}" 
                                               data-model="${model}">
                                        <label for="model-${model.replace(/[^a-zA-Z0-9]/g, '-')}">${model}</label>
                                        ${isInNewAPI ? '<span class="api-badge">NewAPI内已选中</span>' : ''}
                                    </div>
                                    <div class="model-actions">
                                        <button class="btn-icon btn-add" 
                                                onclick="app.quickAddModel('${model.replace(/'/g, "\\'")}')" 
                                                title="添加到映射">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                        <button class="btn-icon btn-copy" 
                                                onclick="app.copyModelName('${model.replace(/'/g, "\\'")}')" 
                                                title="复制">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });
        
        this.elements.modelsList.innerHTML = html;
        
        // 添加批量选择功能
        this.addBatchSelectListeners();
    }
    
    showModalError(error) {
        this.elements.modelsList.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <div>获取模型数据失败</div>
                <div class="error-message">${error.message}</div>
                <div class="error-actions">
                    <button class="btn btn-primary btn-sm" onclick="app.retryLoadModels()">
                        <i class="fas fa-redo"></i> 重试
                    </button>
                </div>
            </div>
        `;
    }
    
    retryLoadModels() {
        const channelId = this.getCurrentModalChannelId();
        if (channelId) {
            this.loadChannelModelsInModal(channelId);
        }
    }
    
    updateModalModelCount() {
        if (!this.currentChannelSelectedModels) return;
        
        const totalModels = document.querySelectorAll('.model-item').length;
        const selectedCount = this.currentChannelSelectedModels.length;
        
        if (this.elements.modelsCount) {
            this.elements.modelsCount.textContent = `共 ${totalModels} 个模型 (${selectedCount} 个已选择)`;
        }
    }

    addBatchSelectListeners() {
        // 为复选框添加事件监听器
        this.elements.modelsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const modelItem = e.target.closest('.model-item');
                const model = e.target.dataset.model;
                
                if (e.target.checked) {
                    // 选择模型
                    modelItem.classList.add('selected');
                    
                    // 添加到当前渠道已选择模型
                    if (!this.currentChannelSelectedModels) {
                        this.currentChannelSelectedModels = [];
                    }
                    if (!this.currentChannelSelectedModels.includes(model)) {
                        this.currentChannelSelectedModels.push(model);
                    }
                    
                    // 更新添加按钮状态
                    const addButton = modelItem.querySelector('.btn-add');
                    if (addButton) {
                        addButton.disabled = true;
                        addButton.innerHTML = '<i class="fas fa-check"></i>';
                    }
                    
                } else {
                    // 取消选择模型
                    modelItem.classList.remove('selected');
                    
                    // 从当前渠道已选择模型中移除
                    if (this.currentChannelSelectedModels) {
                        const index = this.currentChannelSelectedModels.indexOf(model);
                        if (index > -1) {
                            this.currentChannelSelectedModels.splice(index, 1);
                        }
                    }
                    
                    // 重新启用添加按钮
                    const addButton = modelItem.querySelector('.btn-add');
                    if (addButton) {
                        addButton.disabled = false;
                        addButton.innerHTML = '<i class="fas fa-plus"></i>';
                    }
                }
                
                // 更新已选择模型的显示
                this.displayCurrentChannelSelectedModels(this.currentChannelSelectedModels || []);
                
                // 更新计数
                this.updateModalModelCount();
            });
        });
    }

    getCurrentModalChannelId() {
        // 直接返回保存的当前渠道ID
        return this.currentModalChannelId || null;
    }
    displayCurrentChannelSelectedModels(selectedModels) {
        const modalSelectedModelsList = this.elements.modalSelectedModelsList;
        if (!modalSelectedModelsList) return;
        
        if (selectedModels.length === 0) {
            modalSelectedModelsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>当前渠道暂无已选择的模型</p>
                    <small>勾选左侧模型后，这里将显示已选择的模型</small>
                </div>
            `;
            return;
        }
        
        // 按类型分组显示当前渠道已选择的模型
        const categorizedModels = this.categorizeModelsArray(selectedModels);
        
        let html = '';
        Object.entries(categorizedModels).forEach(([category, models]) => {
            html += `
                <div class="model-category">
                    <div class="model-category-header">
                        <div class="model-category-title">
                            <i class="fas fa-cube"></i>
                            <h6>${category}</h6>
                        </div>
                        <span class="model-category-count">${models.length} 个</span>
                    </div>
                    <div class="model-category-content">
                        <div class="models-tags-container">
                            ${models.map(model => `
                                <span class="model-tag selected" title="${model}">
                                    ${model}
                                    <button class="btn-icon remove" onclick="app.removeSelectedModelFromChannel('${this.escapeJsString(model)}')" title="取消选择">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        
        modalSelectedModelsList.innerHTML = html;
    }
    
    // 从当前渠道取消选择模型（新增函数）
    removeSelectedModelFromChannel(model) {
        if (!this.currentChannelSelectedModels) return;
        
        // 从当前渠道已选择模型中移除
        const index = this.currentChannelSelectedModels.indexOf(model);
        if (index > -1) {
            this.currentChannelSelectedModels.splice(index, 1);
            
            // 更新显示
            this.displayCurrentChannelSelectedModels(this.currentChannelSelectedModels);
            
            // 取消对应的复选框
            const checkbox = document.querySelector(`input[data-model="${model}"]`);
            if (checkbox) {
                checkbox.checked = false;
                const modelItem = checkbox.closest('.model-item');
                if (modelItem) {
                    modelItem.classList.remove('selected');
                }
                
                // 重新启用添加按钮
                const addButton = modelItem.querySelector('.btn-add');
                if (addButton) {
                    addButton.disabled = false;
                    addButton.innerHTML = '<i class="fas fa-plus"></i>';
                }
            }
            
            // 更新计数
            this.updateModalModelCount();
            
            this.showNotification(`已取消选择: ${model}`, 'info');
        }
    }

    displaySelectedModelsInModal() {
        // 获取所有已选择的模型
        const selectedModels = this.getAllSelectedModels();
        
        const selectedModelsList = document.getElementById('selectedModelsList');
        if (!selectedModelsList) return;
        
        if (selectedModels.length === 0) {
            selectedModelsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>暂无已选择的模型</p>
                    <small>从模型映射配置中添加模型后，它们将显示在这里</small>
                </div>
            `;
            return;
        }
        
        // 按类型分组显示模型
        const categorizedModels = this.categorizeModelsArray(selectedModels);
        
        let html = '';
        Object.entries(categorizedModels).forEach(([category, models]) => {
            html += `
                <div class="model-category">
                    <div class="model-category-header">
                        <div class="model-category-title">
                            <i class="fas fa-cube"></i>
                            <h6>${category}</h6>
                        </div>
                        <span class="model-category-count">${models.length} 个</span>
                    </div>
                    <div class="model-category-content">
                        <div class="models-tags-container">
                            ${models.map(model => `
                                <span class="model-tag selected" title="${model}">
                                    ${model}
                                    <button class="btn-icon remove" onclick="app.removeSelectedModel('${this.escapeJsString(model)}')" title="移除">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        
        selectedModelsList.innerHTML = html;
    }
    
    closeChannelModelsModal() {
        this.elements.channelModelsModal.style.display = 'none';
        
        // 清空模型列表
        this.elements.modelsList.innerHTML = '';
        this.elements.modelsSearchInput.value = '';
        
        // 清理状态
        this.currentModalChannelId = null;
        this.currentChannelSelectedModels = null;
        
        // 清空模态框内的已选择模型显示（使用正确的元素）
        if (this.elements.modalSelectedModelsList) {
            this.elements.modalSelectedModelsList.innerHTML = '';
        }
    }

    // ==================== 一键更新模型功能 ====================

    /**
     * 打开一键更新模态框
     */
    openOneClickUpdateModal() {
        // 重置UI状态
        this.elements.oneClickUpdateProgress.style.display = 'none';
        this.elements.oneClickUpdateProgressFill.style.width = '0%';
        this.elements.oneClickUpdateProgressText.textContent = '';
        this.elements.oneClickUpdateResults.style.display = 'none';
        this.elements.oneClickUpdateLogs.innerHTML = '';

        // 重置统计数字
        this.elements.scannedChannelsCount.textContent = '0';
        this.elements.brokenMappingsCount.textContent = '0';
        this.elements.fixableMappingsCount.textContent = '0';

        // 清空列表
        this.elements.brokenMappingsList.innerHTML = '';
        this.elements.newMappingsList.innerHTML = '';

        // 重置按钮状态
        this.elements.previewOneClickUpdateBtn.disabled = false;
        this.elements.executeOneClickUpdateBtn.disabled = true;

        // 清除内部状态
        this.oneClickUpdatePreviewData = null;

        // 显示模态框
        this.elements.oneClickUpdateModal.style.display = 'block';
    }

    /**
     * 关闭一键更新模态框
     */
    closeOneClickUpdateModal() {
        this.elements.oneClickUpdateModal.style.display = 'none';

        // 清理状态
        this.oneClickUpdatePreviewData = null;
    }

    /**
     * 预览一键更新（干跑模式）
     */
    async previewOneClickUpdate() {
        const config = this.getConfig();

        if (!config.baseUrl || !config.token) {
            this.showNotification('请先配置API地址和令牌', 'error');
            return;
        }

        // 显示进度条
        this.elements.oneClickUpdateProgress.style.display = 'block';
        this.elements.oneClickUpdateProgressFill.style.width = '10%';
        this.elements.oneClickUpdateProgressText.textContent = '正在分析渠道模型映射...';
        this.elements.oneClickUpdateResults.style.display = 'none';
        this.elements.oneClickUpdateLogs.innerHTML = '';

        // 禁用按钮
        this.elements.previewOneClickUpdateBtn.disabled = true;
        this.elements.executeOneClickUpdateBtn.disabled = true;

        try {
            const response = await fetch('/api/preview-one-click-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    baseUrl: config.baseUrl,
                    token: config.token,
                    userId: config.userId,
                    authHeaderType: config.authHeaderType
                })
            });

            this.elements.oneClickUpdateProgressFill.style.width = '80%';
            this.elements.oneClickUpdateProgressText.textContent = '正在解析结果...';

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || '预览失败');
            }

            // 保存预览数据供执行时使用
            this.oneClickUpdatePreviewData = data;

            // 更新进度条
            this.elements.oneClickUpdateProgressFill.style.width = '100%';
            this.elements.oneClickUpdateProgressText.textContent = `分析完成，耗时 ${data.duration}`;

            // 显示结果
            this.displayOneClickUpdateResults(data.results, data.logs);

            // 如果有可修复的映射，启用执行按钮
            const hasFixable = data.results.newMappings && data.results.newMappings.length > 0;
            this.elements.executeOneClickUpdateBtn.disabled = !hasFixable;

            if (hasFixable) {
                this.showNotification(`发现 ${data.results.newMappings.length} 个可修复的映射`, 'success');
            } else if (data.results.brokenMappings && data.results.brokenMappings.length > 0) {
                this.showNotification(`发现 ${data.results.brokenMappings.length} 个断裂映射，但无法自动修复`, 'warning');
            } else {
                this.showNotification('所有映射正常，无需修复', 'success');
            }

        } catch (error) {
            console.error('预览一键更新失败:', error);
            this.elements.oneClickUpdateProgressFill.style.width = '100%';
            this.elements.oneClickUpdateProgressFill.style.backgroundColor = '#dc3545';
            this.elements.oneClickUpdateProgressText.textContent = '分析失败: ' + error.message;
            this.showNotification('预览失败: ' + error.message, 'error');
        } finally {
            this.elements.previewOneClickUpdateBtn.disabled = false;
        }
    }

    /**
     * 执行一键更新
     */
    async executeOneClickUpdate() {
        const config = this.getConfig();

        if (!config.baseUrl || !config.token) {
            this.showNotification('请先配置API地址和令牌', 'error');
            return;
        }

        if (!this.oneClickUpdatePreviewData) {
            this.showNotification('请先执行预览', 'warning');
            return;
        }

        // 确认执行
        const fixCount = this.oneClickUpdatePreviewData.results.newMappings?.length || 0;
        if (fixCount === 0) {
            this.showNotification('没有需要修复的映射', 'info');
            return;
        }

        if (!confirm(`确定要修复 ${fixCount} 个模型映射吗？\n此操作将更新渠道的模型映射配置。`)) {
            return;
        }

        // 更新进度条
        this.elements.oneClickUpdateProgressFill.style.width = '10%';
        this.elements.oneClickUpdateProgressFill.style.backgroundColor = '#4CAF50';
        this.elements.oneClickUpdateProgressText.textContent = '正在应用修复...';
        this.elements.oneClickUpdateLogs.innerHTML = '';

        // 禁用按钮
        this.elements.previewOneClickUpdateBtn.disabled = true;
        this.elements.executeOneClickUpdateBtn.disabled = true;

        try {
            const response = await fetch('/api/one-click-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    baseUrl: config.baseUrl,
                    token: config.token,
                    userId: config.userId,
                    authHeaderType: config.authHeaderType
                })
            });

            this.elements.oneClickUpdateProgressFill.style.width = '80%';
            this.elements.oneClickUpdateProgressText.textContent = '正在解析结果...';

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || '更新失败');
            }

            // 更新进度条
            this.elements.oneClickUpdateProgressFill.style.width = '100%';
            this.elements.oneClickUpdateProgressText.textContent = `更新完成，耗时 ${data.duration}`;

            // 显示结果
            this.displayOneClickUpdateResults(data.results, data.logs);

            // 清除预览数据
            this.oneClickUpdatePreviewData = null;

            // 显示成功消息
            const msg = `成功更新 ${data.results.updatedChannels} 个渠道，修复 ${data.results.fixedMappings} 个映射`;
            this.showNotification(msg, 'success');

            // 刷新渠道列表
            if (typeof this.refreshChannelList === 'function') {
                this.refreshChannelList();
            }

        } catch (error) {
            console.error('执行一键更新失败:', error);
            this.elements.oneClickUpdateProgressFill.style.width = '100%';
            this.elements.oneClickUpdateProgressFill.style.backgroundColor = '#dc3545';
            this.elements.oneClickUpdateProgressText.textContent = '更新失败: ' + error.message;
            this.showNotification('更新失败: ' + error.message, 'error');
        } finally {
            this.elements.previewOneClickUpdateBtn.disabled = false;
            // 执行后禁用执行按钮，需要重新预览
            this.elements.executeOneClickUpdateBtn.disabled = true;
        }
    }

    /**
     * 显示一键更新结果
     */
    displayOneClickUpdateResults(results, logs) {
        // 更新统计数字
        this.elements.scannedChannelsCount.textContent = results.scannedChannels || 0;
        this.elements.brokenMappingsCount.textContent = results.brokenMappings?.length || 0;
        this.elements.fixableMappingsCount.textContent = results.newMappings?.length || 0;

        // 显示断裂映射列表
        if (results.brokenMappings && results.brokenMappings.length > 0) {
            this.elements.brokenMappingsList.innerHTML = results.brokenMappings.map(item => `
                <div class="mapping-item broken">
                    <div class="mapping-header">
                        <span class="channel-name">${this.escapeHtml(item.channelName || '渠道 ' + item.channelId)}</span>
                        <span class="mapping-status">断裂</span>
                    </div>
                    <div class="mapping-detail">
                        <span class="original-model">${this.escapeHtml(item.originalModel)}</span>
                        <span class="arrow">→</span>
                        <span class="expected-model">${this.escapeHtml(item.expectedModel || '未知')}</span>
                    </div>
                    <div class="mapping-reason">${this.escapeHtml(item.reason || '')}</div>
                </div>
            `).join('');
        } else {
            this.elements.brokenMappingsList.innerHTML = '<div class="no-data">没有断裂的映射</div>';
        }

        // 显示可修复映射列表
        if (results.newMappings && results.newMappings.length > 0) {
            this.elements.newMappingsList.innerHTML = results.newMappings.map(item => `
                <div class="mapping-item fixable">
                    <div class="mapping-header">
                        <span class="channel-name">${this.escapeHtml(item.channelName || '渠道 ' + item.channelId)}</span>
                        <span class="mapping-status confidence-${this.getConfidenceClass(item.confidence)}">
                            ${item.method || '匹配'} (${Math.round((item.confidence || 0) * 100)}%)
                        </span>
                    </div>
                    <div class="mapping-detail">
                        <span class="original-model">${this.escapeHtml(item.standardName)}</span>
                        <span class="arrow">→</span>
                        <span class="new-model">${this.escapeHtml(item.actualName)}</span>
                    </div>
                </div>
            `).join('');
        } else {
            this.elements.newMappingsList.innerHTML = '<div class="no-data">没有可修复的映射</div>';
        }

        // 显示日志
        if (logs && logs.length > 0) {
            this.elements.oneClickUpdateLogs.innerHTML = logs.map(log => {
                const levelClass = log.level || 'info';
                return `<div class="log-entry log-${levelClass}">${this.escapeHtml(log.message)}</div>`;
            }).join('');
        }

        // 显示结果区域
        this.elements.oneClickUpdateResults.style.display = 'block';
    }

    /**
     * 获取置信度等级类名
     */
    getConfidenceClass(confidence) {
        if (confidence >= 0.9) return 'high';
        if (confidence >= 0.7) return 'medium';
        return 'low';
    }

    showApiError(error, channel) {
        const errorMessage = this.getErrorMessage(error);
        const errorDetails = this.getErrorDetails(error);
        
        this.elements.modelsList.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <div>获取真实模型数据失败</div>
                <div class="error-message">${errorMessage}</div>
                ${errorDetails ? `<div class="error-details">${errorDetails}</div>` : ''}
                <div class="error-help">
                    <p><strong>注意：</strong>本工具只显示真实的API数据，不使用缓存或演示数据。</p>
                    <p>请检查网络连接和API配置后重试。</p>
                </div>
                <div class="error-actions">
                    <button class="btn btn-primary btn-sm" onclick="app.retryLoadModels(${channel.id})">
                        <i class="fas fa-redo"></i> 重新获取
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.testConnection()">
                        <i class="fas fa-plug"></i> 测试连接
                    </button>
                </div>
            </div>
        `;
    }
    
    getErrorMessage(error) {
        if (error.message.includes('timeout')) {
            return '网络请求超时，请检查网络连接';
        }
        if (error.message.includes('401')) {
            return '认证失败，请检查访问令牌';
        }
        if (error.message.includes('404')) {
            return '渠道不存在或已被删除';
        }
        if (error.message.includes('500')) {
            return '服务器内部错误，请稍后重试';
        }
        return error.message || '未知错误';
    }
    
    getErrorDetails(error) {
        if (error.response) {
            return `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
        if (error.request) {
            return '网络请求失败，请检查网络连接';
        }
        return null;
    }
    
    retryLoadModels(channelId) {
        if (!channelId) {
            channelId = this.getCurrentModalChannelId();
        }
        
        if (channelId) {
            this.loadChannelModelsInModal(channelId);
        }
    }
    
    getDemoModelsForChannel(channel) {
        // 根据渠道类型返回更完整的演示模型列表
        const demoModelsMap = {
            1: [ // OpenAI
                'gpt-4', 'gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-4-0125-preview',
                'gpt-4-vision-preview', 'gpt-4-1106-preview', 'gpt-4-32k',
                'gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-instruct',
                'text-davinci-003', 'text-davinci-002', 'text-curie-001',
                'text-babbage-001', 'text-ada-001', 'text-embedding-ada-002'
            ],
            14: [ // Anthropic Claude
                'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307',
                'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku',
                'claude-2.1', 'claude-2.0', 'claude-instant-1.2',
                'claude-instant-1.1', 'claude-instant-1'
            ],
            24: [ // Google Gemini
                'gemini-2.5-flash-lite-preview-06-17', 'gemini-2.5-flash-preview-05-20',
                'gemini-2.0-flash-exp', 'gemini-2.0-flash-thinking-exp-01-21',
                'gemini-2.0-flash-thinking-exp-1219', 'gemini-2.0-flash-thinking-exp',
                'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest',
                'gemini-1.5-pro-001', 'gemini-1.5-flash-001',
                'gemini-1.5-pro-002', 'gemini-1.5-flash-002',
                'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro-exp-0801',
                'gemini-pro', 'gemini-pro-vision', 'gemini-1.0-pro',
                'gemini-1.0-pro-vision-latest', 'gemini-1.0-pro-vision-001'
            ],
            43: [ // DeepSeek
                'deepseek-v3-250324', 'deepseek-r1-250528', 'deepseek-r1',
                'deepseek-v3', 'deepseek-v2.5', 'deepseek-v2',
                'deepseek-coder-v2', 'deepseek-coder', 'deepseek-chat'
            ],
            25: [ // Moonshot
                'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'
            ],
            17: [ // 阿里通义千问
                'qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-max-longcontext',
                'qwen-1.8b-chat', 'qwen-7b-chat', 'qwen-14b-chat', 'qwen-72b-chat',
                'qwen-vl-plus', 'qwen-vl-max'
            ],
            15: [ // 百度文心千帆
                'ernie-bot', 'ernie-bot-turbo', 'ernie-bot-4',
                'ernie-bot-8k', 'ernie-bot-turbo-128k', 'ernie-speed-128k',
                'ernie-lite-8k', 'ernie-tiny-8k', 'ernie-character-8k',
                'ernie-text-embedding-v1'
            ],
            23: [ // 腾讯混元
                'hunyuan', 'hunyuan-lite', 'hunyuan-pro',
                'hunyuan-vision', 'hunyuan-code'
            ],
            18: [ // 讯飞星火
                'spark-v1.5', 'spark-v2.0', 'spark-v3.0', 'spark-v3.5',
                'spark-desk-v1', 'spark-desk-v2', 'spark-desk-v3',
                'spark-lite', 'spark-pro'
            ],
            '默认': [
                'model-1', 'model-2', 'model-3', 'model-4', 'model-5'
            ]
        };
        
        const type = channel.type || '默认';
        return demoModelsMap[type] || demoModelsMap['默认'];
    }
    
    async fetchAllChannelsSelectedModels() {
        console.log('🔍 开始获取所有渠道的已选择模型...');
        
        if (!this.channels || this.channels.length === 0) {
            console.log('没有渠道数据，跳过获取已选择模型');
            return;
        }
        
        const allSelectedModels = new Set();
        const config = this.getConfig();
        
        // 批量获取前几个渠道的已选择模型（避免请求过多）
        const channelsToCheck = this.channels.slice(0, 10); // 只检查前10个渠道
        
        for (const channel of channelsToCheck) {
            try {
                console.log(`🔍 获取渠道 ${channel.id} (${channel.name}) 的已选择模型...`);
                
                const response = await this.fetchWithTimeout('/api/channel-models', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...config,
                        channelId: channel.id,
                        fetchSelectedOnly: true
                    })
                }, 10000); // 10秒超时
                
                const result = await response.json();
                
                if (result.success && result.data && Array.isArray(result.data)) {
                    result.data.forEach(model => {
                        if (model && model.trim()) {
                            allSelectedModels.add(model);
                        }
                    });
                    console.log(`✅ 渠道 ${channel.id} 已选择 ${result.data.length} 个模型`);
                } else {
                    console.log(`ℹ️ 渠道 ${channel.id} 没有已选择的模型`);
                }
            } catch (error) {
                console.warn(`❌ 获取渠道 ${channel.id} 已选择模型失败:`, error.message);
            }
        }
        
        // 合并到全局已选择模型缓存
        this.currentSelectedModels = Array.from(allSelectedModels);
        console.log(`🎉 已获取所有渠道的已选择模型: ${this.currentSelectedModels.length} 个`);
        console.log('已选择的模型列表:', this.currentSelectedModels.slice(0, 10)); // 显示前10个
        
        // 移除自动同步到映射配置的功能，用户需要手动选择
        // 这样可以避免不期望的模型被自动添加到映射中
        /* 
        // 同步到映射配置文本框
        if (this.currentSelectedModels.length > 0) {
            const currentMappingModels = this.elements.originalModels.value.split('\n').map(m => m.trim()).filter(m => m);
            const newModels = this.currentSelectedModels.filter(model => !currentMappingModels.includes(model));
            
            if (newModels.length > 0) {
                const updatedModels = [...currentMappingModels, ...newModels];
                this.elements.originalModels.value = updatedModels.join('\n');
                console.log(`📝 已同步 ${newModels.length} 个新模型到映射配置`);
            }
        }
        */
        
        // 更新已选择模型区域显示
        
        // 不自动触发预览更新，让用户手动控制
        // this.updatePreview();
    }
    
    async fetchModelsForAllChannels() {
        console.log('🔍 开始异步获取所有渠道的真实模型数据...');
        
        // 使用自适应批量大小
        const batchSize = this.adaptiveBatchSize;
        const totalChannels = this.channels.length;
        let successCount = 0;
        let failCount = 0;
        
        // 显示总体进度
        this.showModelFetchProgress(0, totalChannels);
        
        // 首先设置所有渠道为等待获取状态
        this.channels.forEach(channel => {
            if (channel.models_fetched === undefined) {
                channel.models_fetched = 'pending';
            }
        });
        
        // 立即更新界面显示等待状态
        this.renderChannels();
        
        for (let i = 0; i < totalChannels; i += batchSize) {
            const batch = this.channels.slice(i, i + batchSize);
            
            const promises = batch.map(async (channel) => {
                try {
                    // 设置为加载状态
                    channel.models_fetched = 'loading';
                    this.updateChannelCard(channel);
                    
                    console.log(`🔍 获取渠道 ${channel.id} (${channel.name}) 的真实模型数据...`);
                    
                    // 直接从API获取，不使用缓存
                    const models = await this.fetchChannelModelsWithRetry(channel.id, 1); // 减少重试次数
                    
                    if (models && models.length > 0) {
                        // 更新渠道的模型数据
                        channel.models = models;
                        channel.model_count = models.length;
                        channel.models_fetched = true;
                        successCount++;
                        
                        console.log(`✅ 渠道 ${channel.id} 真实模型数据更新完成: ${models.length} 个模型`);
                        
                        // 立即更新该渠道的卡片
                        this.updateChannelCard(channel);

                        // 更新全局统计
                        this.updateGlobalStatsAfterFetch();
                    } else {
                        // 标记为已获取但没有模型
                        channel.models_fetched = true;
                        channel.models = [];
                        channel.model_count = 0;
                        console.log(`ℹ️ 渠道 ${channel.id} 没有可用模型`);
                        this.updateChannelCard(channel);
                    }
                } catch (error) {
                    failCount++;
                    console.error(`❌ 获取渠道 ${channel.id} 真实模型数据失败:`, error.message);
                    
                    // 标记为获取失败
                    channel.models_fetched = false;
                    channel.models_fetch_error = error.message;
                    this.updateChannelCard(channel);
                }
                
                // 更新进度
                this.showModelFetchProgress(successCount + failCount, totalChannels);
            });
            
            await Promise.all(promises);
            
            // 批次间稍作延迟，避免请求过于频繁
            if (i + batchSize < totalChannels) {
                await new Promise(resolve => setTimeout(resolve, 200)); // 减少延迟到200ms
            }
        }
        
        console.log(`🎉 所有渠道真实模型数据获取完成: 成功 ${successCount} 个，失败 ${failCount} 个`);
        
        // 隐藏进度显示
        this.hideModelFetchProgress();
        
        // 显示最终结果通知
        if (failCount === 0) {
            this.showNotification(`✅ 成功获取所有 ${successCount} 个渠道的真实模型数据`, 'success');
        } else if (successCount === 0) {
            this.showNotification(`❌ 所有渠道真实模型数据获取失败`, 'error');
        } else {
            this.showNotification(`⚠️ 真实模型数据获取完成: 成功 ${successCount} 个，失败 ${failCount} 个`, 'warning');
        }
        
        // 最终更新全局统计
        this.renderChannels();
    }
    
    async fetchChannelModelsWithRetry(channelId, maxRetries = 3) {
        let lastError;
        const baseTimeout = 30000; // 基础超时时间
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // 自适应超时：根据重试次数增加超时时间
                const timeout = baseTimeout * Math.pow(1.5, attempt - 1);
                console.log(`🔍 渠道 ${channelId} 第 ${attempt} 次尝试，超时时间: ${timeout}ms`);
                
                return await this.fetchChannelModelsData(channelId, timeout);
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // 指数退避重试，但最大不超过5秒
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                const jitter = Math.random() * 500; // 添加随机抖动避免请求风暴
                const totalDelay = delay + jitter;
                
                console.warn(`渠道 ${channelId} 获取模型数据失败，第 ${attempt} 次重试，${totalDelay.toFixed(0)}ms 后重试: ${error.message}`);
                
                await new Promise(resolve => setTimeout(resolve, totalDelay));
            }
        }
        
        throw lastError;
    }
    
    showModelFetchProgress(current, total) {
        let progressContainer = document.getElementById('modelFetchProgress');
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'modelFetchProgress';
            progressContainer.className = 'model-fetch-progress';
            document.body.appendChild(progressContainer);
        }
        
        const percentage = Math.round((current / total) * 100);
        const eta = this.calculateETA(current, total);
        
        progressContainer.innerHTML = `
            <div class="progress-content">
                <div class="progress-message">
                    正在获取模型数据 (${current}/${total})
                    ${eta ? `· 预计剩余: ${eta}` : ''}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="progress-percentage">${percentage}%</div>
            </div>
        `;
        
        progressContainer.style.display = 'block';
    }

    calculateETA(current, total) {
        if (current === 0) return null;
        
        const stats = this.getPerformanceStats();
        if (!stats || !stats.avgRequestTime) return null;
        
        const remaining = total - current;
        const batchSize = this.adaptiveBatchSize;
        const estimatedBatches = Math.ceil(remaining / batchSize);
        const estimatedTime = estimatedBatches * stats.avgRequestTime;
        
        if (estimatedTime < 1000) {
            return `${Math.round(estimatedTime)}ms`;
        } else if (estimatedTime < 60000) {
            return `${Math.round(estimatedTime / 1000)}秒`;
        } else {
            return `${Math.round(estimatedTime / 60000)}分钟`;
        }
    }

    enhanceChannelCardInteraction() {
        // 为渠道卡片添加更好的交互体验
        document.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            });
        });
    }

    addSmartTooltips() {
        // 为模型数量添加智能提示
        document.querySelectorAll('.model-count-tooltip').forEach(tooltip => {
            const channel = tooltip.dataset.channel;
            const metric = this.requestMetrics.get(parseInt(channel));
            
            if (metric) {
                tooltip.title = `请求时间: ${metric.requestTime}ms\n状态: ${metric.success ? '成功' : '失败'}\n模型数: ${metric.modelCount}`;
            }
        });
    }
    
    hideModelFetchProgress() {
        const progressContainer = document.getElementById('modelFetchProgress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }
    
    prefetchTopChannels() {
        // 立即获取前3个渠道的模型数据，提升用户体验
        const topChannels = this.channels.slice(0, 3);
        if (topChannels.length === 0) return;
        
        console.log('🚀 立即获取前几个渠道的模型数据...');
        
        topChannels.forEach(channel => {
            // 设置为加载状态
            channel.models_fetched = 'loading';
        });
        
        // 立即更新界面显示加载状态
        this.renderChannels();
        
        // 异步获取前几个渠道的数据
        setTimeout(async () => {
            for (const channel of topChannels) {
                try {
                    console.log(`🔍 快速获取渠道 ${channel.id} (${channel.name}) 的模型数据...`);
                    
                    const models = await this.fetchChannelModelsData(channel.id);
                    
                    if (models && models.length > 0) {
                        channel.models = models;
                        channel.model_count = models.length;
                        channel.models_fetched = true;
                        
                        console.log(`✅ 渠道 ${channel.id} 快速获取完成: ${models.length} 个模型`);
                    } else {
                        channel.models_fetched = true;
                        channel.models = [];
                        channel.model_count = 0;
                    }
                    
                    // 立即更新该渠道卡片
                    this.updateChannelCard(channel);
                    this.updateGlobalStatsAfterFetch();
                    
                } catch (error) {
                    console.error(`❌ 快速获取渠道 ${channel.id} 失败:`, error.message);
                    channel.models_fetched = false;
                    channel.models_fetch_error = error.message;
                    this.updateChannelCard(channel);
                }
            }
        }, 50); // 50ms后开始快速获取
    }
    
    updateGlobalStatsAfterFetch() {
        // 实时更新全局统计信息
        const totalChannels = this.channels.length;
        const totalModels = this.channels.reduce((sum, channel) => {
            return sum + (channel.model_count || 0);
        }, 0);
        
        const uniqueModels = new Set();
        const activeChannels = this.channels.filter(channel => {
            return channel.status !== 'disabled' && channel.status !== 0;
        }).length;
        
        this.channels.forEach(channel => {
            if (channel.models && Array.isArray(channel.models)) {
                channel.models.forEach(model => {
                    uniqueModels.add(model);
                });
            }
        });
        
        this.updateGlobalStats(totalChannels, totalModels, uniqueModels.size, activeChannels);
    }

    showPerformanceStats() {
        // 已禁用性能监控显示
    }

    updatePerformanceStats() {
        // 已禁用性能监控显示
    }
    
    async fetchChannelModelsData(channelId, timeout = 30000) {
        const config = this.getConfig();
        const startTime = Date.now();
        
        try {
            const response = await this.fetchWithTimeout('/api/channel-models', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...config,
                    channelId: channelId,
                    fetchAll: true,
                    includeDisabled: true
                })
            }, timeout); // 使用动态超时时间
            
            const result = await response.json();
            
            if (result.success && result.data) {
                // 记录性能指标
                const requestTime = Date.now() - startTime;
                this.recordPerformanceMetric(channelId, requestTime, result.data.length);
                
                console.log(`✅ 渠道 ${channelId} 获取成功: ${result.data.length} 个模型，耗时 ${requestTime}ms`);
                return result.data;
            } else {
                throw new Error(result.message || '获取模型失败');
            }
        } catch (error) {
            const requestTime = Date.now() - startTime;
            console.error(`❌ 渠道 ${channelId} 获取失败: ${error.message}，耗时 ${requestTime}ms`);
            
            // 记录失败指标
            this.recordPerformanceMetric(channelId, requestTime, 0, false);
            
            // 返回空数组，不使用缓存
            return [];
        }
    }
    
    updateChannelCard(channel) {
        const card = document.querySelector(`.channel-card[data-channel-id="${channel.id}"]`);
        if (!card) return;
        
        // 更新模型数量显示 - 使用统一的计数方法
        const modelCountElement = card.querySelector('.meta-value');
        if (modelCountElement && modelCountElement.textContent.includes('个')) {
            const modelCount = this.getChannelModelCount(channel);
            modelCountElement.textContent = `${modelCount} 个`;
        }
        
        // 更新状态显示
        const channelStatus = this.getChannelStatus(channel);
        const statusElement = card.querySelector('.channel-status');
        if (statusElement) {
            statusElement.className = `channel-status ${channelStatus.class}`;
            statusElement.textContent = `${channelStatus.icon} ${channelStatus.text}`;
        }
    }
    
    displayChannelModelsWithSelection(models, selectedModels, channel) {
        let modelArray = [];
        
        // 处理不同格式的模型数据
        if (Array.isArray(models)) {
            modelArray = models;
        } else if (typeof models === 'string') {
            modelArray = models.split(',').map(m => m.trim()).filter(m => m);
        } else {
            // 如果没有模型数据，尝试从其他地方获取
            modelArray = this.getModelsFromChannelData(channel);
        }
        
        // 去重和清理
        const uniqueModels = [...new Set(modelArray)];
        
        // 按类型排序
        const sortedModels = this.sortModelsByType(uniqueModels);
        
        this.currentChannelModels = sortedModels;
        this.currentRawChannelModels = models; // 保存原始数据
        this.currentSelectedModels = selectedModels || []; // 保存已选择的模型
        
        // 显示所有模型
        this.displayAllModels();
        
        // 更新模型数量显示
        this.elements.modelsCount.textContent = `共 ${sortedModels.length} 个模型`;
    }
    
    getModelsFromChannelData(channel) {
        // 尝试从渠道数据中获取模型信息
        const demoModels = this.getDemoModelsForChannel(channel);
        return demoModels;
    }
    
    sortModelsByType(models) {
        const modelOrder = {
            'gpt-4': 1, 'gpt-4-turbo': 2, 'gpt-4o': 3, 'gpt-4o-mini': 4,
            'gpt-3.5-turbo': 5, 'gpt-3.5-turbo-16k': 6,
            'claude-3-opus': 10, 'claude-3-sonnet': 11, 'claude-3-haiku': 12,
            'gemini-pro': 20, 'gemini-1.5-pro': 21, 'gemini-1.5-flash': 22,
            'deepseek-v3': 30, 'deepseek-coder': 31,
            'qwen-turbo': 40, 'qwen-plus': 41, 'qwen-max': 42
        };
        
        return models.sort((a, b) => {
            const aOrder = modelOrder[a.toLowerCase()] || 999;
            const bOrder = modelOrder[b.toLowerCase()] || 999;
            return aOrder - bOrder;
        });
    }
    
    displayAllModels() {
        if (!this.currentChannelModels) return;
        this.displayFilteredModels(this.currentChannelModels);
    }
    
    searchModels(searchTerm) {
        // 显示所有模型，但应用搜索过滤
        if (!this.currentChannelModels) return;
        
        let modelsToShow = this.currentChannelModels;
        if (searchTerm) {
            modelsToShow = modelsToShow.filter(model => 
                model.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        this.displayFilteredModels(modelsToShow, searchTerm);
    }
    
    displayFilteredModels(models, searchTerm = '') {
        if (models.length === 0) {
            this.elements.modelsList.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <div>未找到匹配的模型</div>
                    <div class="search-help">尝试使用不同的关键词</div>
                </div>
            `;
            this.elements.modelsCount.textContent = '共 0 个模型';
            return;
        }
        
        // 按类型分类模型
        const categorizedModels = this.categorizeModelsArray(models);
        
        const html = Object.entries(categorizedModels).map(([category, categoryModels]) => {
            const filteredCategoryModels = searchTerm ? 
                categoryModels.filter(model => model.toLowerCase().includes(searchTerm.toLowerCase())) : 
                categoryModels;
            
            if (filteredCategoryModels.length === 0) return '';
            
            return `
                <div class="model-category">
                    <div class="model-category-header">
                        <div class="model-category-title">
                            <i class="fas fa-cube"></i>
                            <h6>${category}</h6>
                        </div>
                        <span class="model-category-count">${filteredCategoryModels.length} 个</span>
                    </div>
                    <div class="model-category-content">
                        ${filteredCategoryModels.map(model => {
                            const highlightedModel = this.highlightSearchTerm(model, searchTerm);
                            const isSelected = this.isModelSelected(model);
                            
                            return `
                                <div class="model-item ${isSelected ? 'selected' : ''}">
                                    <div class="model-checkbox">
                                        <input type="checkbox" id="model-${model.replace(/[^a-zA-Z0-9]/g, '-')}" data-model="${model}" 
                                               ${isSelected ? 'checked' : ''}>
                                        <label for="model-${model.replace(/[^a-zA-Z0-9]/g, '-')}">${highlightedModel}</label>
                                    </div>
                                    <div class="model-actions">
                                        <button class="btn-icon btn-add" onclick="app.quickAddModel('${model.replace(/'/g, "\\'")}')"
                                                title="快速添加到映射" ${isSelected ? 'disabled' : ''}>
                                            <i class="fas fa-plus"></i>
                                        </button>
                                        <button class="btn-icon btn-copy" onclick="app.copyModelName('${model.replace(/'/g, "\\'")}')"
                                                title="复制模型名称">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                        <button class="btn-icon btn-info" onclick="app.showModelInfo('${model.replace(/'/g, "\\'")}')"
                                                title="查看模型信息">
                                            <i class="fas fa-info"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        this.elements.modelsList.innerHTML = html;
        this.elements.modelsCount.textContent = `共 ${models.length} 个模型${searchTerm ? ' (搜索结果)' : ''}`;
        
        // 添加复选框事件
        this.elements.modelsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const model = e.currentTarget.dataset.model;
                if (e.currentTarget.checked) {
                    this.selectModelForMapping(model);
                } else {
                    this.deselectModelForMapping(model);
                }
                
                // 更新选中状态样式
                const modelItem = e.currentTarget.closest('.model-item');
                if (e.currentTarget.checked) {
                    modelItem.classList.add('selected');
                } else {
                    modelItem.classList.remove('selected');
                }
            });
        });
    }
    
    categorizeModelsArray(models) {
        const categories = {
            'GPT系列': [],
            'Claude系列': [],
            'Gemini系列': [],
            'DeepSeek系列': [],
            'Qwen系列': [],
            '其他模型': []
        };
        
        models.forEach(model => {
            const category = this.getModelCategory(model);
            categories[category].push(model);
        });
        
        // 过滤空分类
        Object.keys(categories).forEach(key => {
            if (categories[key].length === 0) {
                delete categories[key];
            }
        });
        
        return categories;
    }
    
    showModelInfo(model) {
        const modelInfo = this.getModelDetailedInfo(model);
        
        this.showErrorDialog(
            `模型信息: ${model}`,
            modelInfo.description,
            modelInfo.details,
            [
                {
                    text: '复制模型名',
                    icon: 'copy',
                    type: 'secondary',
                    onclick: `app.copyModelName('${model.replace(/'/g, "\\'")}'); app.removeErrorDialog(this.closest('.error-dialog'));`
                },
                {
                    text: '添加到映射',
                    icon: 'plus',
                    type: 'primary',
                    onclick: `app.addModelToMapping('${model.replace(/'/g, "\\'")}'); app.removeErrorDialog(this.closest('.error-dialog'));`
                },
                {
                    text: '关闭',
                    icon: 'times',
                    type: 'secondary',
                    onclick: 'app.removeErrorDialog(this.closest(".error-dialog"));'
                }
            ]
        );
    }
    
    getModelDetailedInfo(modelName) {
        const name = modelName.toLowerCase();
        const info = {
            description: '',
            details: ''
        };
        
        if (name.includes('gpt-4')) {
            info.description = 'GPT-4 是 OpenAI 开发的大型语言模型';
            info.details = '特点：强大的推理能力、多模态支持、代码生成能力';
        } else if (name.includes('gpt-3.5')) {
            info.description = 'GPT-3.5 Turbo 是 OpenAI 的优化版本';
            info.details = '特点：快速响应、成本效益高、适合聊天应用';
        } else if (name.includes('claude')) {
            info.description = 'Claude 是 Anthropic 开发的AI助手';
            info.details = '特点：长上下文、安全性高、推理能力强';
        } else if (name.includes('gemini')) {
            info.description = 'Gemini 是 Google 开发的多模态AI模型';
            info.details = '特点：多模态理解、生成能力强、Google生态集成';
        } else if (name.includes('deepseek')) {
            info.description = 'DeepSeek 是中国开发的AI模型';
            info.details = '特点：中文理解强、代码能力优秀、性价比高';
        } else if (name.includes('qwen')) {
            info.description = 'Qwen 是阿里巴巴开发的AI模型';
            info.details = '特点：中文优化、多语言支持、阿里云集成';
        } else {
            info.description = '这是一个AI语言模型';
            info.details = '具体信息请参考相关文档';
        }
        
        return info;
    }
    
    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm) return text;
        const safeText = String(text || '');
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return safeText.replace(regex, '<mark>$1</mark>');
    }
    
    quickAddModel(model) {
        const modelsTextarea = this.elements.originalModels;
        const currentModels = modelsTextarea.value.split('\n').map(m => m.trim()).filter(m => m);

        if (currentModels.includes(model)) {
            this.showNotification('模型已在映射中', 'warning');
            return;
        }

        // 🔧 修复：在modal关闭前捕获渠道ID
        const currentChannelId = this.currentModalChannelId;
        const channelInfo = currentChannelId ? this.channels.find(c => c.id == currentChannelId) : null;

        console.log(`🔧 quickAddModel 记录来源: model=${model}, channelId=${currentChannelId}`);
        console.log(`🔧 捕获的渠道信息:`, channelInfo);

        // 添加到映射
        currentModels.push(model);
        modelsTextarea.value = currentModels.join('\n');

        // 🔧 修复：使用已捕获的渠道信息记录模型来源
        if (channelInfo) {
            console.log(`🔧 使用捕获的渠道信息: ${channelInfo.name} (ID: ${channelInfo.id})`);
            this.recordModelSource(model, 'channel', channelInfo.name, channelInfo.id);

            // 立即验证是否记录成功
            const verify = this.modelChannelMapping.get(model);
            console.log(`✅ quickAddModel 验证记录结果:`, verify);
        } else {
            console.error('❌ quickAddModel 无法获取渠道信息，currentChannelId:', currentChannelId);
        }

        // 自动匹配模型来源
        this.analyzeAndMatchModelSources();

        // 重新渲染模型列表UI
        this.renderModelsList();

        // 更新预览
        this.updatePreview();
        this.showNotification(`已添加模型: ${model}，来源已自动记录`, 'success');

        // 视觉反馈
        const addButton = event.target.closest('.btn-add');
        if (addButton) {
            const originalHTML = addButton.innerHTML;
            addButton.innerHTML = '<i class="fas fa-check"></i>';
            addButton.disabled = true;

            setTimeout(() => {
                addButton.innerHTML = originalHTML;
                addButton.disabled = false;
            }, 1000);
        }
    }
    
    copyModelName(model) {
        this.copyToClipboard(model).then(() => {
            this.showNotification(`已复制: ${model}`, 'success');
            
            // 视觉反馈
            const copyButton = event.currentTarget;
            const originalHTML = copyButton.innerHTML;
            copyButton.innerHTML = '<i class="fas fa-check"></i>';
            
            setTimeout(() => {
                copyButton.innerHTML = originalHTML;
            }, 1000);
        }).catch(() => {
            this.showNotification('复制失败，请手动复制', 'error');
        });
    }

    // 通用复制方法，支持多种fallback
    async copyToClipboard(text) {
        // 方法1: 现代浏览器 Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return Promise.resolve();
            } catch (err) {
                console.log('Clipboard API failed:', err);
                // 继续尝试fallback方法
            }
        }
        
        // 方法2: 传统的execCommand方法（fallback）
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            
            textArea.focus();
            textArea.select();
            
            const result = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (result) {
                return Promise.resolve();
            } else {
                throw new Error('execCommand copy failed');
            }
        } catch (err) {
            console.log('execCommand failed:', err);
            
            // 方法3: 创建选择区域让用户手动复制
            this.createManualCopyArea(text);
            return Promise.reject(new Error('All copy methods failed'));
        }
    }
    
    // 创建可选择的文本区域供用户手动复制
    createManualCopyArea(text) {
        // 移除之前的手动复制区域
        const existingArea = document.getElementById('manual-copy-area');
        if (existingArea) {
            existingArea.remove();
        }
        
        const copyArea = document.createElement('div');
        copyArea.id = 'manual-copy-area';
        
        copyArea.innerHTML = `
            <div>
                <h4>
                    <i class="fas fa-copy"></i> 手动复制
                </h4>
                <p>
                    自动复制失败，请手动选择以下内容并按 <kbd>Ctrl+C</kbd> 复制：
                </p>
            </div>
            <textarea readonly>${text}</textarea>
            <div class="manual-copy-actions">
                <div class="copy-hint">
                    <i class="fas fa-keyboard"></i>
                    <span>按 <kbd>Ctrl+A</kbd> 全选，<kbd>Ctrl+C</kbd> 复制</span>
                </div>
                <button onclick="this.closest('#manual-copy-area').remove()">
                    <i class="fas fa-times"></i> 关闭
                </button>
            </div>
        `;
        
        document.body.appendChild(copyArea);
        
        // 自动选择文本并添加复制成功检测
        const textarea = copyArea.querySelector('textarea');
        textarea.focus();
        textarea.select();
        
        // 添加键盘事件监听
        const copyListener = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                // 显示复制成功反馈
                const feedback = document.createElement('div');
                feedback.className = 'copy-success-feedback';
                feedback.innerHTML = '<i class="fas fa-check"></i> 已复制';
                copyArea.appendChild(feedback);
                
                // 2秒后关闭对话框
                setTimeout(() => {
                    if (copyArea.parentNode) {
                        copyArea.remove();
                    }
                }, 2000);
                
                // 移除事件监听
                document.removeEventListener('keydown', copyListener);
            }
        };
        
        document.addEventListener('keydown', copyListener);
        
        // 10秒后自动关闭
        setTimeout(() => {
            if (copyArea.parentNode) {
                copyArea.remove();
                document.removeEventListener('keydown', copyListener);
            }
        }, 10000);
        
        // 添加点击背景关闭功能
        copyArea.addEventListener('click', (e) => {
            if (e.target === copyArea) {
                copyArea.remove();
                document.removeEventListener('keydown', copyListener);
            }
        });
    }
    
    getCurrentlyCheckedModels() {
        const checkedModels = [];
        
        // 获取所有已勾选的复选框
        const checkedCheckboxes = this.elements.modelsList.querySelectorAll('input[type="checkbox"]:checked');
        
        checkedCheckboxes.forEach(checkbox => {
            const model = checkbox.dataset.model;
            if (model) {
                checkedModels.push(model);
            }
        });
        
        console.log('调试信息 - 找到的已勾选复选框数量:', checkedCheckboxes.length);
        console.log('调试信息 - 当前勾选的模型列表:', checkedModels);
        
        return checkedModels;
    }
    
    getAllSelectedModels() {
        const selectedModels = new Set();
        
        // 添加从API获取的已选择模型
        if (this.currentSelectedModels && Array.isArray(this.currentSelectedModels)) {
            console.log('调试信息 - 从API获取的已选择模型:', this.currentSelectedModels);
            this.currentSelectedModels.forEach(model => {
                selectedModels.add(model);
            });
        }
        
        // 添加本地映射配置中的模型
        const modelsTextarea = this.elements.originalModels;
        const localModels = modelsTextarea.value.split('\n').map(m => m.trim()).filter(m => m);
        console.log('调试信息 - 本地映射配置中的模型:', localModels);
        localModels.forEach(model => {
            selectedModels.add(model);
        });
        
        const result = Array.from(selectedModels);
        console.log('调试信息 - 合并后的已选择模型:', result);
        return result;
    }
    
    isModelSelected(model) {
        // 首先检查从API获取的已选择模型列表
        if (this.currentSelectedModels && Array.isArray(this.currentSelectedModels)) {
            if (this.currentSelectedModels.includes(model)) {
                return true;
            }
        }
        
        // 如果API中没有，检查本地映射配置
        const modelsTextarea = this.elements.originalModels;
        const currentModels = modelsTextarea.value.split('\n').map(m => m.trim()).filter(m => m);
        return currentModels.includes(model);
    }
    
    selectModelForMapping(model) {
        const modelsTextarea = this.elements.originalModels;
        const currentModels = modelsTextarea.value.split('\n').map(m => m.trim()).filter(m => m);
        
        if (!currentModels.includes(model)) {
            currentModels.push(model);
            modelsTextarea.value = currentModels.join('\n');
            this.showNotification(`已添加模型: ${model}`, 'success');
            
            // 更新当前已选择模型的缓存
            if (!this.currentSelectedModels) {
                this.currentSelectedModels = [];
            }
            if (!this.currentSelectedModels.includes(model)) {
                this.currentSelectedModels.push(model);
            }
            
            // 触发预览更新
            if (this.previewTimeout) {
                clearTimeout(this.previewTimeout);
            }
            this.previewTimeout = setTimeout(() => {
                this.updatePreview();
            }, 300);
            
            // 更新已选择的模型折叠框
            }
    }
    
    deselectModelForMapping(model) {
        const modelsTextarea = this.elements.originalModels;
        const currentModels = modelsTextarea.value.split('\n').map(m => m.trim()).filter(m => m);
        
        const index = currentModels.indexOf(model);
        if (index > -1) {
            currentModels.splice(index, 1);
            modelsTextarea.value = currentModels.join('\n');
            this.showNotification(`已移除模型: ${model}`, 'info');
            
            // 更新当前已选择模型的缓存
            if (this.currentSelectedModels && Array.isArray(this.currentSelectedModels)) {
                const cacheIndex = this.currentSelectedModels.indexOf(model);
                if (cacheIndex > -1) {
                    this.currentSelectedModels.splice(cacheIndex, 1);
                }
            }
            
            // 触发预览更新
            if (this.previewTimeout) {
                clearTimeout(this.previewTimeout);
            }
            this.previewTimeout = setTimeout(() => {
                this.updatePreview();
            }, 300);
            
            // 更新已选择的模型折叠框
            }
    }
    
    refreshChannelModels() {
        // 由于我们已经移除了模态框中的渠道ID显示，
        // 我们需要从当前打开的弹窗上下文中获取渠道ID
        // 刷新当前渠道的选择状态
        this.displayCurrentChannelSelectedModels(this.currentChannelSelectedModels || []);
        this.showNotification('已刷新模型列表', 'info');
    }
    
    copyModelsToClipboard() {
        if (!this.currentChannelModels) return;
        
        const modelsText = this.currentChannelModels.join('\n');
        this.copyToClipboard(modelsText).then(() => {
            this.showNotification('模型列表已复制到剪贴板', 'success');
        }).catch(() => {
            this.showNotification('复制失败，请从弹出的对话框手动复制', 'warning');
        });
    }
    
    exportModelsToFile() {
        if (!this.currentChannelModels) return;
        
        const modelsText = this.currentChannelModels.join('\n');
        const blob = new Blob([modelsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `channel_models.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('模型列表已导出', 'success');
    }
    
    getSelectedModelsFromModal() {
        // 获取模态框中所有被选中的模型复选框
        const checkboxes = this.elements.modelsList.querySelectorAll('input[type="checkbox"]:checked');
        const selectedModels = [];

        console.log(`🔍 模态框复选框调试信息:`);
        console.log(`- 总复选框数量: ${this.elements.modelsList.querySelectorAll('input[type="checkbox"]').length}`);
        console.log(`- 已勾选复选框数量: ${checkboxes.length}`);

        checkboxes.forEach((checkbox, index) => {
            const modelName = checkbox.getAttribute('data-model');
            console.log(`- 已勾选复选框 ${index + 1}: ${modelName} (ID: ${checkbox.id})`);
            if (modelName) {
                selectedModels.push(modelName);
            }
        });

        console.log(`📋 从模态框获取已选择模型: ${selectedModels.length} 个`, selectedModels);
        return selectedModels;
    }

    getSelectedModels() {
        // 获取当前选中的所有模型
        const selectedModels = [];

        // 从文本域获取手动添加的模型
        if (this.elements.originalModels && this.elements.originalModels.value) {
            const manualModels = this.elements.originalModels.value
                .split('\n')
                .map(m => m.trim())
                .filter(m => m.length > 0);
            selectedModels.push(...manualModels);
        }

        // 从缓存获取当前选择的模型
        if (this.currentSelectedModels && Array.isArray(this.currentSelectedModels)) {
            selectedModels.push(...this.currentSelectedModels);
        }

        // 去重并返回
        const uniqueModels = [...new Set(selectedModels)];
        console.log(`📝 获取到 ${uniqueModels.length} 个选中的模型:`, uniqueModels);

        return uniqueModels;
    }

  getSelectedChannelIds() {
        // 修复：从选中的模型自动提取对应的渠道ID，而不是使用手动选择的复选框
        const selectedModels = this.getSelectedModels();
        const channelIds = new Set();

        console.log(`🎯 从 ${selectedModels.length} 个选中模型中提取渠道ID`);

        for (const model of selectedModels) {
            // 通过 modelChannelMapping 找到模型对应的渠道
            const channels = this.modelChannelMapping.get(model);
            if (channels && Array.isArray(channels)) {
                channels.forEach(channelInfo => {
                    if (channelInfo && channelInfo.channelId) {
                        channelIds.add(channelInfo.channelId);
                        console.log(`📋 模型 "${model}" 来自渠道: [ID:${channelInfo.channelId}, ${channelInfo.info}]`);
                    }
                });
            } else {
                console.log(`⚠️ 模型 "${model}" 未找到对应的渠道信息`);
            }
        }

        const selectedChannelIds = Array.from(channelIds);
        console.log(`🎯 自动提取到 ${selectedChannelIds.length} 个渠道ID: [${selectedChannelIds.join(', ')}]`);

        return selectedChannelIds;
    }

    // 新增：按渠道分组模型映射
    getModelMappingByChannels() {
        const selectedModels = this.getSelectedModels();
        const channelModelMapping = new Map(); // channelId -> { modelName: mappedName }

        console.log(`🔄 开始按渠道分组模型映射，处理 ${selectedModels.length} 个选中模型`);

        for (const originalModelName of selectedModels) {
            // 修复：查找映射 - 现在键是修改后的模型名，值是原始模型名
            // 所以需要反向查找：找到以这个原始模型名为值的映射
            let mappedName = null;
            for (const [key, value] of Object.entries(this.modelMapping)) {
                if (value === originalModelName) {
                    mappedName = key;
                    break;
                }
            }

            if (!mappedName) {
                console.log(`⚠️ 模型 "${originalModelName}" 没有映射配置，跳过`);
                continue;
            }

            // 找到这个模型属于哪些渠道
            const channels = this.modelChannelMapping.get(originalModelName);
            if (!channels || !Array.isArray(channels)) {
                console.log(`⚠️ 模型 "${originalModelName}" 未找到渠道信息，跳过`);
                continue;
            }

            // 为每个包含此模型的渠道添加映射
            channels.forEach(channelInfo => {
                if (channelInfo && channelInfo.channelId) {
                    const channelId = channelInfo.channelId;

                    if (!channelModelMapping.has(channelId)) {
                        channelModelMapping.set(channelId, {});
                    }

                    const channelMapping = channelModelMapping.get(channelId);
                    // 修复：映射应该是 修改后模型 -> 原始模型
                    channelMapping[mappedName] = originalModelName;

                    console.log(`📌 渠道 ${channelId} (${channelInfo.info}) 添加模型映射: ${mappedName} -> ${originalModelName}`);
                }
            });
        }

        // 转换为普通对象并返回
        const result = {};
        channelModelMapping.forEach((mapping, channelId) => {
            result[channelId] = {
                models: mapping,
                channelInfo: this.getChannelInfo(channelId)
            };
        });

        console.log(`✅ 按渠道分组完成，涉及 ${Object.keys(result).length} 个渠道`);
        return result;
    }

    // 获取渠道信息
    getChannelInfo(channelId) {
        const channel = this.channels.find(ch => ch.id == channelId);
        return channel ? {
            id: channel.id,
            name: channel.name,
            type: channel.type
        } : { id: channelId, name: `未知渠道-${channelId}`, type: 'unknown' };
    }
    
    addSelectedModelsToMapping() {
        console.log(`🚀 开始执行 addSelectedModelsToMapping()`);
        console.log(`- 当前模态框渠道ID: ${this.currentModalChannelId}`);
        console.log(`- currentSelectedModels长度: ${this.currentSelectedModels ? this.currentSelectedModels.length : 'null'}`);
        console.log(`- currentChannelApiSelectedModels长度: ${this.currentChannelApiSelectedModels ? this.currentChannelApiSelectedModels.length : 'null'}`);
        
        // 获取当前渠道的用户选择模型（通过复选框选择的）
        const selectedModelsInModal = this.getSelectedModelsFromModal();
        
        // 如果用户没有在模态框中选择任何模型，使用当前渠道的API已选择模型
        let modelsToAdd = selectedModelsInModal;
        if (modelsToAdd.length === 0) {
            console.log(`⚠️ 用户未在模态框中选择模型，使用API已选择模型`);
            modelsToAdd = this.currentChannelApiSelectedModels || [];
        } else {
            console.log(`✅ 使用用户在模态框中选择的模型`);
        }
        
        console.log(`📝 最终要添加的模型列表 (${modelsToAdd.length} 个):`, modelsToAdd);
        
        if (modelsToAdd.length === 0) {
            this.showNotification('请先选择要添加的模型', 'warning');
            return;
        }
        
        // 获取当前的原始模型列表
        const modelsTextarea = this.elements.originalModels;
        const currentModels = modelsTextarea.value.split('\n').map(m => m.trim()).filter(m => m);
        
        // 添加已选择的模型（去重 - 考虑渠道信息）
        const newModels = [];
        const currentChannelId = this.currentModalChannelId;
        const currentChannel = this.channels.find(c => c.id == currentChannelId);
        const currentChannelName = currentChannel ? currentChannel.name : null;

        for (const model of modelsToAdd) {
            // 检查是否已经存在相同的模型名称
            const existsByName = currentModels.includes(model);

            if (!existsByName) {
                // 如果模型名称不存在，直接添加
                newModels.push(model);
            } else {
                // 如果模型名称已存在，检查是否来自相同渠道
                const existingModelSource = this.modelChannelMapping.get(model);

                if (!existingModelSource) {
                    // 如果没有来源记录，允许添加（可能是手动添加的模型）
                    newModels.push(model);
                    console.log(`🔧 模型 ${model} 无来源记录，允许添加`);
                } else {
                    // 检查是否已存在来自相同渠道的记录
                    const sameChannelExists = existingModelSource.some(source =>
                        source.type === 'channel' && source.channelId === currentChannelId
                    );

                    if (!sameChannelExists) {
                        // 如果没有来自当前渠道的记录，允许添加同名模型
                        // 这样可以实现同名模型来自多个渠道的需求
                        newModels.push(model);
                        console.log(`🔧 模型 ${model} 将添加新的渠道来源: ${currentChannelName} (ID: ${currentChannelId})`);
                        console.log(`🔧 现有来源:`, existingModelSource.map(s => `${s.info}(${s.channelId})`));
                    } else {
                        // 如果已经来自相同渠道，则跳过（真正的重复）
                        console.log(`🔧 模型 ${model} 已存在来自渠道 ${currentChannelName} 的记录，跳过添加`);
                    }
                }
            }
        }

        if (newModels.length === 0) {
            this.showNotification('所选模型已存在于映射列表中', 'info');
            return;
        }
  
        // 记录模型来源 - 来自渠道模态框
        let channelName = null;
        console.log('🔍 currentModalChannelId:', currentChannelId);
        console.log('🔍 channels:', this.channels);
        if (currentChannelId) {
            const channel = this.channels.find(c => c.id == currentChannelId);
            console.log('🔍 找到的渠道:', channel);
            if (channel) {
                channelName = channel.name;
                newModels.forEach(modelName => {
                    console.log(`📝 记录模型来源: ${modelName} -> ${channel.name} (ID: ${channel.id})`);

                    // 记录模型名称的来源信息
                    this.recordModelSource(modelName, 'channel', channel.name, channel.id);

                    // 立即验证是否记录成功
                    const verify = this.modelChannelMapping.get(modelName);
                    console.log(`✅ 验证记录结果:`, verify);
                });
            } else {
                console.error('❌ 未找到渠道信息');
            }
        } else {
            console.error('❌ currentModalChannelId 为空');
        }

        // 更新原始模型列表
        const updatedModels = [...currentModels, ...newModels];
        modelsTextarea.value = updatedModels.join('\n');

        // 自动匹配模型来源
        this.analyzeAndMatchModelSources();

        // 重新渲染模型列表UI
        this.renderModelsList();

        // 触发预览更新
        this.updatePreview();

        // 显示成功消息
        this.showNotification(`已添加 ${newModels.length} 个模型到映射列表，来源已自动记录`, 'success');

        console.log(`✅ 成功添加 ${newModels.length} 个模型到映射:`);
        console.log('添加的模型列表:', newModels);
        console.log('模型来源:', currentChannelId ? `渠道 ${channelName || currentChannelId}` : '未知');
        
        // 关闭模态框
        this.closeChannelModelsModal();
    }

    updatePreview() {
        const modelsTextarea = this.elements.originalModels;
        const currentModels = modelsTextarea.value.split('\n').map(m => m.trim()).filter(m => m);

        if (currentModels.length === 0) {
            // 清空映射表格和状态
            this.clearMappingTable();
            return;
        }

        // 首先构建实际的 modelMapping 对象（基于默认映射规则）
        // 确保数据对象在UI更新之前就准备好
        this.buildModelMapping(currentModels);

        // 然后基于最新的 modelMapping 对象填充表格UI
        // 这样可以保证UI和数据的一致性
        this.populateMappingTableFromMapping(currentModels);

        // 更新统计信息和可见性
        this.updateMappingTableVisibility();
    }

    // 清空映射表格
    clearMappingTable() {
        const tableBody = document.getElementById('mappingTableBody');
        const emptyState = document.getElementById('emptyMappingState');
        const mappingTable = document.getElementById('mappingTable');

        if (tableBody) {
            tableBody.innerHTML = '';
        }
        if (mappingTable) {
            mappingTable.style.display = 'none';
        }
        if (emptyState) {
            emptyState.style.display = 'block';
        }

        this.elements.previewStats.textContent = '共 0 个映射';
        this.modelMapping = {}; // 清空映射
        this.updatePreviewStatus();
    }

    // 解析预览编辑器内容并更新modelMapping
    parsePreviewEditor() {
        if (!this.elements.previewEditor) return;

        const content = this.elements.previewEditor.value;
        const lines = content.split('\n');
        const newMapping = {};

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return; // 跳过空行和注释

            // 解析映射格式：原始模型 -> 映射模型
            const arrowMatch = trimmed.match(/^(.+?)\s*->\s*(.+)$/);
            if (arrowMatch) {
                const [, originalModel, mappedModel] = arrowMatch;
                if (originalModel && mappedModel) {
                    // 修复：映射应该是 修改后模型 -> 原始模型
                    newMapping[mappedModel.trim()] = originalModel.trim();
                }
            } else {
                // 如果没有箭头，表示保持不变的模型
                newMapping[trimmed] = trimmed;
            }
        });

        this.modelMapping = newMapping;
        this.isUserEditedPreview = true;
    }

    // 更新预览统计信息
    updatePreviewStats() {
        if (this.elements.previewStats) {
            const count = Object.keys(this.modelMapping).length;
            this.elements.previewStats.textContent = `共 ${count} 个映射`;
        }
    }

    // 重置预览为自动生成的映射
    resetPreviewToAutoGenerated() {
        const modelsTextarea = this.elements.originalModels;
        const currentModels = modelsTextarea.value.split('\n').map(m => m.trim()).filter(m => m);

        if (currentModels.length === 0) {
            this.showNotification('请先输入原始模型列表', 'warning');
            return;
        }

        // 生成自动映射
        const previewMappings = this.generatePreviewMappings(currentModels);
        this.elements.previewEditor.value = previewMappings.join('\n');

        // 重新构建映射
        this.buildModelMapping(currentModels);
        this.updatePreviewStats();

        // 标记为非用户编辑
        this.isUserEditedPreview = false;

        this.showNotification('已重置为自动生成的映射', 'success');
    }

    // 格式化预览内容
    formatPreviewContent() {
        if (!this.elements.previewEditor) return;

        const content = this.elements.previewEditor.value;
        if (!content.trim()) {
            this.showNotification('预览内容为空', 'warning');
            return;
        }

        // 解析当前内容
        const lines = content.split('\n');
        const formattedLines = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
                formattedLines.push(''); // 保留空行
                return;
            }

            if (trimmed.startsWith('#')) {
                // 保留注释行
                formattedLines.push(trimmed);
                return;
            }

            // 解析并重新格式化映射行
            const arrowMatch = trimmed.match(/^(.+?)\s*->\s*(.+)$/);
            if (arrowMatch) {
                const [, originalModel, mappedModel] = arrowMatch;
                formattedLines.push(`${originalModel.trim()} -> ${mappedModel.trim()}`);
            } else if (trimmed) {
                // 对于无箭头的行，添加自映射
                formattedLines.push(`${trimmed} -> ${trimmed}`);
            }
        });

        // 移除多余的空行，保持单行间距
        const finalContent = formattedLines
            .filter((line, index) => line !== '' || (index > 0 && formattedLines[index - 1] !== ''))
            .join('\n');

        this.elements.previewEditor.value = finalContent;

        // 重新解析
        this.parsePreviewEditor();
        this.updatePreviewStats();

        this.showNotification('映射配置已格式化', 'success');
    }

    // 导入映射配置
    importPreviewConfiguration() {
        // 创建隐藏的文件输入
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.txt,.json';

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target.result;

                    if (file.name.endsWith('.json')) {
                        // JSON格式导入
                        const jsonData = JSON.parse(content);
                        const mappings = [];

                        for (const [original, mapped] of Object.entries(jsonData)) {
                            mappings.push(`${original} -> ${mapped}`);
                        }

                        this.elements.previewEditor.value = mappings.join('\n');
                    } else {
                        // 文本格式导入
                        this.elements.previewEditor.value = content;
                    }

                    // 解析导入的内容
                    this.parsePreviewEditor();
                    this.updatePreviewStats();

                    this.showNotification(`成功导入映射配置：${file.name}`, 'success');
                } catch (error) {
                    this.showNotification('导入失败：文件格式错误', 'error');
                    console.error('导入配置失败:', error);
                }
            };

            reader.readAsText(file);
        });

        fileInput.click();
    }

    // 导出映射配置
    exportPreviewConfiguration() {
        if (!this.modelMapping || Object.keys(this.modelMapping).length === 0) {
            this.showNotification('没有可导出的映射配置', 'warning');
            return;
        }

        // 创建下载内容
        const content = this.elements.previewEditor.value;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

        // 创建下载链接
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `model-mapping-${timestamp}.txt`;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        this.showNotification('映射配置已导出', 'success');
    }

    buildModelMapping(originalModels) {
        const smartNameMatching = this.elements.smartNameMatching.checked;
        const enableSmartMerge = this.elements.enableSmartMerge.checked;
        const autoChannelSuffix = this.elements.autoChannelSuffix.checked;

        const mapping = {};

        for (let i = 0; i < originalModels.length; i++) {
            const originalModel = originalModels[i];
            let mappedModel = originalModel;

            // 从modelChannelMapping获取该模型对应的渠道信息
            let channelName = null;
            const channelMappings = this.modelChannelMapping.get(originalModel);
            if (channelMappings && channelMappings.length > 0) {
                // 使用第一个渠道映射的渠道名称
                const firstChannelId = channelMappings[0].channelId;
                const channelInfo = this.channels.find(ch => ch.id === firstChannelId);
                if (channelInfo) {
                    channelName = channelInfo.name;
                }
            }

            // 首先应用智能处理（智能名称匹配、智能模型名合并、自动渠道后缀）
            // 传递渠道名称用于自动渠道后缀功能
            mappedModel = this.applySmartProcessing(mappedModel, channelName);

            // 修复：映射应该是 修改后模型 -> 原始模型
            mapping[mappedModel] = originalModel;
        }

        this.modelMapping = mapping;
        console.log('✅ 已构建模型映射:', this.modelMapping);
    }
    
    generatePreviewMappings(originalModels) {
        const smartNameMatching = this.elements.smartNameMatching.checked;
        const enableSmartMerge = this.elements.enableSmartMerge.checked;
        const autoChannelSuffix = this.elements.autoChannelSuffix.checked;
        
        const mappings = [];

        for (let i = 0; i < originalModels.length; i++) {
            let mappedModel = originalModels[i];
            const originalModel = originalModels[i];

            // 应用智能合并 - 先执行
            if (enableSmartMerge) {
                mappedModel = this.rulesManager ?
                    this.rulesManager.applyRules(mappedModel, 'modelMerge') :
                    this.applySmartMerge(mappedModel);
            }

            // 应用智能名称匹配 - 后执行
            if (smartNameMatching) {
                mappedModel = this.rulesManager ?
                    this.rulesManager.applyRules(mappedModel, 'nameMatching') :
                    this.applySmartNameMatching(mappedModel);
            }

            // 应用前缀
            
            // 应用后缀
            
            // 应用渠道后缀（如果启用）
            if (autoChannelSuffix) {
                const mappingList = this.modelChannelMapping.get(originalModel);
                console.log(`🔍 模型 "${originalModel}" 的来源信息:`, mappingList);
                if (mappingList && mappingList.length > 0) {
                    // 使用第一个渠道来源（优先使用最早添加的）
                    const sourceMapping = mappingList[0];
                    if (sourceMapping.info) {
                        mappedModel = mappedModel + '-' + sourceMapping.info;
                        console.log(`✅ 添加渠道后缀: ${mappedModel}`);
                    }
                } else {
                    console.warn(`⚠️ 模型 "${originalModel}" 没有渠道来源信息，无法添加后缀`);
                }
            }

            
            // 获取来源信息，如果有的话
            const sourceInfo = this.getModelSourceInfo(originalModel);
            const sourceDisplay = sourceInfo ? ` [来源: ${sourceInfo}]` : '';

            mappings.push(`${originalModel} -> ${mappedModel}${sourceDisplay}`);
        }

        return mappings;
    }
    
    getModelSourceInfo(modelName) {
        // 从模型源追踪器中获取来源信息
        const sourceData = this.modelSourceTracker.get(modelName);
        if (sourceData && sourceData.source) {
            return sourceData.source;
        }
        return null;
    }
    
    generatePreviewMappingsWithSources(originalModels, channelSources) {
        const smartNameMatching = this.elements.smartNameMatching.checked;
        const enableSmartMerge = this.elements.enableSmartMerge.checked;
        const autoChannelSuffix = this.elements.autoChannelSuffix.checked;

        const mappings = [];

        for (let i = 0; i < originalModels.length; i++) {
            const originalModel = originalModels[i];
            let mappedModel = originalModel;

            // 智能模型名合并
            if (enableSmartMerge) {
                mappedModel = this.applySmartMerge(mappedModel);
            }

            // 自动渠道后缀
            if (autoChannelSuffix) {
                mappedModel = this.applyChannelSuffix(mappedModel);
            }

            // 获取对应的渠道来源信息
            const channelSource = i < channelSources.length ? channelSources[i] : '未指定';
            const sourceInfo = channelSource.trim() ? ` [来源: ${channelSource.trim()}]` : '';

            mappings.push(`${originalModel} -> ${mappedModel}${sourceInfo}`);
        }

        return mappings;
    }
    
    generatePreviewMappings(originalModels) {
        const mappings = [];

        for (const originalModel of originalModels) {
            let mappedModel = originalModel;

            // 从modelChannelMapping获取该模型对应的渠道信息
            let channelName = null;
            const channelMappings = this.modelChannelMapping.get(originalModel);
            if (channelMappings && channelMappings.length > 0) {
                // 使用第一个渠道映射的渠道名称
                const firstChannelId = channelMappings[0].channelId;
                const channelInfo = this.channels.find(ch => ch.id === firstChannelId);
                if (channelInfo) {
                    channelName = channelInfo.name;
                }
            }

            // 首先应用智能处理（智能名称匹配、智能模型名合并、自动渠道后缀）
            // 传递渠道名称用于自动渠道后缀功能
            mappedModel = this.applySmartProcessing(mappedModel, channelName);

            // 获取模型来源信息
            const sourceInfo = this.getModelSourceInfo(originalModel);
            const sourceDisplay = sourceInfo ? ` [来源: ${sourceInfo}]` : '';

            mappings.push(`${originalModel} -> ${mappedModel}${sourceDisplay}`);
        }

        return mappings;
    }
    
    applySmartMerge(modelName) {
        // 智能合并相似的模型名称
        const mergeRules = [
            // GPT系列
            [/gpt-4-turbo-(\d+k)/, 'gpt-4-turbo'],
            [/gpt-4-(\d+k)/, 'gpt-4'],
            [/gpt-3\.5-turbo-(\d+k)/, 'gpt-3.5-turbo'],
            
            // Claude系列
            [/claude-3-(?:opus|sonnet|haiku)-\d+/, 'claude-3-$1'],
            [/claude-3-opus/, 'claude-3-opus'],
            [/claude-3-sonnet/, 'claude-3-sonnet'],
            [/claude-3-haiku/, 'claude-3-haiku'],
            
            // Gemini系列
            [/gemini-1\.5-(?:pro|flash)-\d+/, 'gemini-1.5-$1'],
            [/gemini-pro-vision/, 'gemini-pro'],
            
            // 其他
            [/deepseek-(?:coder|chat)-v\d+/, 'deepseek-v1'],
        ];
        
        let mergedModel = modelName;
        for (const [pattern, replacement] of mergeRules) {
            if (pattern.test(modelName)) {
                mergedModel = modelName.replace(pattern, replacement);
                break;
            }
        }
        
        return mergedModel;
    }

    applySmartNameMatching(modelName) {
        // 智能名称匹配：标准化模型名称格式，保留版本信息和具体日期
        const nameMatchingRules = [
            // GPT系列 - 标准化格式，保留日期
            [/^gpt-4-?0?(preview)?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, preview, date) => {
                let result = 'gpt-4';
                if (preview) result += '-preview';
                if (date) result += '-' + date;
                return result;
            }],
            [/^gpt-4-?turbo-?(\d{4}-\d{2}-\d{2})?$/gi, (match, date) => {
                let result = 'gpt-4-turbo';
                if (date) result += '-' + date;
                return result;
            }],
            [/^gpt-3\.5-?turbo-?(\d{4}-\d{2}-\d{2})?$/gi, (match, date) => {
                let result = 'gpt-3.5-turbo';
                if (date) result += '-' + date;
                return result;
            }],
            [/^gpt-4o-?(\d{4}-\d{2}-\d{2})?$/gi, (match, date) => {
                let result = 'gpt-4o';
                if (date) result += '-' + date;
                return result;
            }],
            [/^gpt-4o-?mini-?(\d{4}-\d{2}-\d{2})?$/gi, (match, date) => {
                let result = 'gpt-4o-mini';
                if (date) result += '-' + date;
                return result;
            }],

            // Claude系列 - 标准化格式，保留日期
            [/^claude-3-?(\w+)-?(\d{4}-\d{2}-\d{2})?$/gi, (match, model, date) => {
                let result = 'claude-3-' + model;
                if (date) result += '-' + date;
                return result;
            }],
            [/^claude-2-?(\d+)?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, version, date) => {
                let result = 'claude-2';
                if (version) result += '-' + version;
                if (date) result += '-' + date;
                return result;
            }],

            // Gemini系列 - 标准化格式，保留日期
            [/^gemini-1\.5-?(\w+)-?(\d{4}-\d{2}-\d{2})?$/gi, (match, variant, date) => {
                let result = 'gemini-1.5-' + variant;
                if (date) result += '-' + date;
                return result;
            }],
            [/^gemini-1\.0-?(\w+)?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, variant, date) => {
                let result = 'gemini-1.0-' + (variant || 'pro');
                if (date) result += '-' + date;
                return result;
            }],
            [/^gemini-?pro-?(\d{4}-\d{2}-\d{2})?$/gi, (match, date) => {
                let result = 'gemini-pro';
                if (date) result += '-' + date;
                return result;
            }],

            // DeepSeek系列 - 标准化格式，保留日期
            [/^deepseek-?(\w+)-?v?(\d+)?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, model, version, date) => {
                let result = 'deepseek-' + model;
                if (version) result += '-v' + version;
                if (date) result += '-' + date;
                return result;
            }],
            [/^deepseek-?(\w+)-?(\d{4}-\d{2}-\d{2})?$/gi, (match, model, date) => {
                let result = 'deepseek-' + model;
                if (date) result += '-' + date;
                return result;
            }],

            // 通义千问系列 - 标准化格式，保留日期
            [/^qwen-?(\d+\.\d+)(?:-?(\w+))?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, version, variant, date) => {
                let result = 'qwen-' + version;
                if (variant) result += '-' + variant;
                if (date) result += '-' + date;
                return result;
            }],
            [/^qwen-?(\d+)(?:-?(\w+))?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, version, variant, date) => {
                let result = 'qwen-' + version;
                if (variant) result += '-' + variant;
                if (date) result += '-' + date;
                return result;
            }],
            [/^tongyi-?(\w+)-?(\d+\.\d+)?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, model, version, date) => {
                let result = 'qwen-' + model;
                if (version) result += '-' + version;
                if (date) result += '-' + date;
                return result;
            }],

            // 智谱AI系列 - 标准化格式，保留日期
            [/^glm-?(\d+)(?:-?(\w+))?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, version, variant, date) => {
                let result = 'glm-' + version;
                if (variant) result += '-' + variant;
                if (date) result += '-' + date;
                return result;
            }],
            [/^chatglm-?(\d+)(?:-?(\w+))?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, version, variant, date) => {
                let result = 'chatglm-' + version;
                if (variant) result += '-' + variant;
                if (date) result += '-' + date;
                return result;
            }],

            // 百度文心系列 - 标准化格式，保留日期
            [/^ernie-?(\d+\.\d+)(?:-?(\w+))?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, version, variant, date) => {
                let result = 'ernie-' + version;
                if (variant) result += '-' + variant;
                if (date) result += '-' + date;
                return result;
            }],
            [/^wenxin-?(\w+)-?(\d+\.\d+)?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, model, version, date) => {
                let result = 'ernie-' + model;
                if (version) result += '-' + version;
                if (date) result += '-' + date;
                return result;
            }],

            // 阿里达摩院系列 - 标准化格式，保留日期
            [/^yi-?(\d+)(?:-?(\w+))?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, version, variant, date) => {
                let result = 'yi-' + version;
                if (variant) result += '-' + variant;
                if (date) result += '-' + date;
                return result;
            }],

            // Mistral系列 - 标准化格式，保留日期
            [/^mixtral-?(\d+x)?(\d+)(?:b)?-?(\w+)?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, multi, size, variant, date) => {
                let result = 'mixtral-';
                if (multi) result += multi;
                result += size;
                if (variant) result += '-' + variant;
                if (date) result += '-' + date;
                return result;
            }],
            [/^mistral-?(\d+x)?(\d+)(?:b)?-?(\w+)?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, multi, size, variant, date) => {
                let result = 'mistral-';
                if (multi) result += multi;
                result += size;
                if (variant) result += '-' + variant;
                if (date) result += '-' + date;
                return result;
            }],

            // Meta系列 - 标准化格式，保留日期
            [/^llama-?(\d+)(?:b)?-?(\w+)?-?(\d{4}-\d{2}-\d{2})?$/gi, (match, size, variant, date) => {
                let result = 'llama-' + size;
                if (variant) result += '-' + variant;
                if (date) result += '-' + date;
                return result;
            }],

            // 其他常见模型 - 标准化格式，保留日期
            [/^(\w+)-?v?(\d+\.\d+\.\d+)-?(\d{4}-\d{2}-\d{2})?$/gi, (match, base, version, date) => {
                let result = base + '-' + version;
                if (date) result += '-' + date;
                return result;
            }],
            [/^(\w+)-?v?(\d+)-?(\d{4}-\d{2}-\d{2})?$/gi, (match, base, version, date) => {
                let result = base + '-' + version;
                if (date) result += '-' + date;
                return result;
            }],
            [/^(\w+)-?(\d{4}-\d{2}-\d{2})$/gi, (match, base, date) => {
                let result = base;
                if (date) result += '-' + date;
                return result;
            }],

            // 移除常见的后缀标识符，但保留日期
            [/^(\w+(?:-\d{4}-\d{2}-\d{2})?)-?(?:chat|instruct|base|latest|final)$/gi, '$1'],
            [/^(\w+(?:-\d{4}-\d{2}-\d{2})?)-?(?:api|online|free|pro|plus|premium)$/gi, '$1'],
        ];

        let matchedModel = modelName;
        for (const [pattern, replacement] of nameMatchingRules) {
            if (pattern.test(modelName)) {
                matchedModel = modelName.replace(pattern, replacement);
                // 清理可能产生的多余连字符和空格
                matchedModel = matchedModel.replace(/-+/g, '-').replace(/^-|-$/g, '');
                break;
            }
        }

        return matchedModel;
    }

    applyChannelSuffix(modelName) {
        // 根据模型类型添加渠道后缀
        const channelSuffixes = {
            'gpt': '-openai',
            'claude': '-anthropic',
            'gemini': '-google',
            'deepseek': '-deepseek',
            'qwen': '-alibaba',
            'yi': '-01-ai',
            'mixtral': '-mistral',
            'llama': '-meta',
        };
        
        for (const [prefix, suffix] of Object.entries(channelSuffixes)) {
            if (modelName.toLowerCase().includes(prefix)) {
                return modelName + suffix;
            }
        }
        
        return modelName;
    }

    initModelSourceTracking() {
        // 初始化模型来源跟踪系统
        console.log('初始化模型来源跟踪系统');
        
        // 从localStorage加载已保存的模型来源映射
        try {
            const savedTracker = localStorage.getItem('model-source-tracker');
            const savedMapping = localStorage.getItem('model-channel-mapping');
            
            if (savedTracker) {
                const trackerData = JSON.parse(savedTracker);
                this.modelSourceTracker = new Map(Object.entries(trackerData));
                console.log(`已加载 ${this.modelSourceTracker.size} 个模型的来源记录`);
            }
            
            if (savedMapping) {
                const mappingData = JSON.parse(savedMapping);
                this.modelChannelMapping = new Map(Object.entries(mappingData));
                console.log(`已加载 ${this.modelChannelMapping.size} 个模型的渠道映射`);
            }
        } catch (error) {
            console.warn('加载模型来源记录失败:', error);
            this.modelSourceTracker = new Map();
            this.modelChannelMapping = new Map();
        }
        
        // 如果页面已有模型配置，立即分析并匹配来源
        setTimeout(() => {
            if (this.elements.originalModels && this.elements.originalModels.value.trim()) {
                console.log('检测到已有模型配置，正在分析来源...');
                this.analyzeAndMatchModelSources();
            }
            // 渲染初始的模型列表UI
            this.renderModelsList();
        }, 100);
    }
    
    // 保存模型来源跟踪数据
    saveModelSourceTracker() {
        try {
            const trackerData = Object.fromEntries(this.modelSourceTracker);
            const mappingData = Object.fromEntries(this.modelChannelMapping);
            
            localStorage.setItem('model-source-tracker', JSON.stringify(trackerData));
            localStorage.setItem('model-channel-mapping', JSON.stringify(mappingData));
        } catch (error) {
            console.warn('保存模型来源记录失败:', error);
        }
    }
    
    // 记录模型来源 - 支持同名模型来自不同渠道
    recordModelSource(modelName, sourceType, sourceInfo, channelId = null) {
        const timestamp = Date.now();
        
        // 为同名模型生成唯一的序列号
        const existingEntries = Array.from(this.modelSourceTracker.entries())
            .filter(([key]) => key.startsWith(`${modelName}#`));
        
        let sequenceNumber = 1;
        let uniqueKey = `${modelName}#${sequenceNumber}`;
        
        // 如果是从特定渠道选择，尝试找到现有的相同渠道记录
        if (channelId && sourceType !== 'manual') {
            const existingChannelEntry = existingEntries.find(([key, data]) => 
                data.channelId === channelId && data.type === sourceType
            );
            
            if (existingChannelEntry) {
                // 更新现有记录的时间戳
                uniqueKey = existingChannelEntry[0];
                const existingData = existingChannelEntry[1];
                existingData.timestamp = timestamp;
                this.modelSourceTracker.set(uniqueKey, existingData);
            } else {
                // 创建新的唯一键
                while (this.modelSourceTracker.has(uniqueKey)) {
                    sequenceNumber++;
                    uniqueKey = `${modelName}#${sequenceNumber}`;
                }
            }
        } else {
            // 手动输入或其他情况，创建新的唯一键
            while (this.modelSourceTracker.has(uniqueKey)) {
                sequenceNumber++;
                uniqueKey = `${modelName}#${sequenceNumber}`;
            }
        }
        
        const sourceData = {
            type: sourceType, // 'channel' | 'search' | 'manual'
            info: sourceInfo, // 渠道名称或其他信息
            channelId: channelId, // 渠道ID
            timestamp: timestamp,
            modelName: modelName // 原始模型名
        };
        
        this.modelSourceTracker.set(uniqueKey, sourceData);
        
        // 同时维护简化的映射关系，用于快速查找
        if (!this.modelChannelMapping.has(modelName)) {
            this.modelChannelMapping.set(modelName, []);
        }
        
        const mappingList = this.modelChannelMapping.get(modelName);
        const existingMapping = mappingList.find(item => 
            item.channelId === channelId && item.type === sourceType
        );
        
        if (!existingMapping) {
            mappingList.push({
                uniqueKey: uniqueKey,
                type: sourceType,
                info: sourceInfo,
                channelId: channelId,
                timestamp: timestamp
            });
        }
        
        this.saveModelSourceTracker();
        
        console.log(`记录模型来源: ${uniqueKey} -> ${sourceType} (${sourceInfo}, 渠道:${channelId})`);
    }
    
    // 获取模型来源显示文本 - 智能处理同名模型
    getModelSourceDisplay(modelName, lineIndex = 0) {
        const mappingList = this.modelChannelMapping.get(modelName);

        // 调试日志
        console.log(`🔍 getModelSourceDisplay 调试: ${modelName}, 索引: ${lineIndex}`);
        console.log(`  - mappingList 原始数据:`, mappingList);

        if (!mappingList || mappingList.length === 0) {
            console.log(`  - 结果: 来源异常 (无映射数据)`);
            return '来源异常'; // 不支持手动输入，如果没有记录则为异常
        }

        // 如果只有一个来源，直接返回
        if (mappingList.length === 1) {
            const mapping = mappingList[0];
            const result = mapping.type === 'manual' ? '来源异常' : mapping.info;
            console.log(`  - 单个来源结果: ${result}`);
            return result;
        }

        // 如果有多个来源，按时间戳倒序排列（最新的在前），优先显示最新来源
        const sortedMappings = mappingList.sort((a, b) => b.timestamp - a.timestamp);
        console.log(`  - 按时间戳倒序排序后:`, sortedMappings.map(m => `${m.info}(${m.timestamp})`));

        const selectedMapping = sortedMappings[lineIndex % sortedMappings.length];
        console.log(`  - 选择的映射 (索引 ${lineIndex % sortedMappings.length}):`, selectedMapping);

        if (!selectedMapping) {
            console.log(`  - 结果: 来源异常 (选中映射不存在)`);
            return '来源异常';
        }

        const result = selectedMapping.type === 'manual' ? '来源异常' : selectedMapping.info;
        console.log(`  - 最终结果: ${result}`);
        return result;
    }
    
    // 智能分析模型列表，自动匹配来源 - 简化版（不支持手动输入）
    analyzeAndMatchModelSources() {
        const modelsTextarea = this.elements.originalModels;
        
        if (!modelsTextarea) return;
        
        const modelLines = modelsTextarea.value.split('\n');
        
        // 为每个模型名称验证来源记录
        const modelOccurrences = new Map();
        
        for (let i = 0; i < modelLines.length; i++) {
            const modelName = modelLines[i].trim();
            
            if (modelName) {
                // 记录该模型名称出现的次数
                const currentCount = modelOccurrences.get(modelName) || 0;
                modelOccurrences.set(modelName, currentCount + 1);
                
                // 验证该模型是否有来源记录
                if (!this.modelChannelMapping.has(modelName)) {
                    console.warn(`发现未记录来源的模型: ${modelName}，可能是数据异常`);
                }
            }
        }
        
        console.log('已验证所有模型的来源信息（仅支持渠道/搜索选择）');
    }

    initTheme() {
        // 主题初始化
        console.log('主题初始化');
    }

    // 新增：页面导航初始化
    initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const pages = document.querySelectorAll('.page');
        const pageTitle = document.getElementById('pageTitle');
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.querySelector('.sidebar');
        const quickConnectBtn = document.getElementById('quickConnectBtn');

        // 页面标题映射
        const pageTitles = {
            'dashboard': '仪表盘',
            'channels': '渠道管理',
            'mapping': '模型映射',
            'sync': '同步操作',
            'settings': '系统设置'
        };

        // 导航点击事件
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPage = item.dataset.page;

                // 更新导航状态
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // 切换页面
                pages.forEach(page => {
                    page.classList.remove('active');
                    if (page.id === `page-${targetPage}`) {
                        page.classList.add('active');
                    }
                });

                // 更新标题
                if (pageTitle) {
                    pageTitle.textContent = pageTitles[targetPage] || targetPage;
                }

                // 移动端关闭侧边栏
                if (window.innerWidth <= 768 && sidebar) {
                    sidebar.classList.remove('open');
                }
            });
        });

        // 移动端菜单切换
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // 快速连接按钮 - 跳转到设置页面
        if (quickConnectBtn) {
            quickConnectBtn.addEventListener('click', () => {
                const settingsNav = document.querySelector('[data-page="settings"]');
                if (settingsNav) settingsNav.click();
            });
        }

        // 快速操作卡片事件
        const actionCards = document.querySelectorAll('.action-card');
        actionCards.forEach(card => {
            card.addEventListener('click', () => {
                const action = card.dataset.action;
                switch(action) {
                    case 'refresh-channels':
                        const channelsNav = document.querySelector('[data-page="channels"]');
                        if (channelsNav) channelsNav.click();
                        setTimeout(() => this.loadChannels(), 100);
                        break;
                    case 'global-search':
                        this.showGlobalSearchModal();
                        break;
                    case 'one-click-update':
                        this.showOneClickUpdateModal();
                        break;
                    case 'start-sync':
                        const syncNav = document.querySelector('[data-page="sync"]');
                        if (syncNav) syncNav.click();
                        break;
                }
            });
        });

        console.log('页面导航初始化完成');
    }

    initKeyboardShortcuts() {
        // 键盘快捷键初始化
        console.log('键盘快捷键初始化');
    }

    initVisualEnhancements() {
        // 视觉增强初始化
        console.log('视觉增强初始化');
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'system';
        const sunIcon = this.elements.themeToggle.querySelector('.fa-sun');
        const moonIcon = this.elements.themeToggle.querySelector('.fa-moon');

        const applyTheme = (theme) => {
            if (theme === 'dark') {
                document.body.setAttribute('data-theme', 'dark');
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'inline-block';
            } else {
                document.body.removeAttribute('data-theme');
                sunIcon.style.display = 'inline-block';
                moonIcon.style.display = 'none';
            }
        };

        if (savedTheme === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(systemPrefersDark ? 'dark' : 'light');
        } else {
            applyTheme(savedTheme);
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (localStorage.getItem('theme') === 'system') {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        localStorage.setItem('theme', newTheme);
        this.initTheme();
    }

    initProgressTracking() {
        // 进度跟踪初始化
        console.log('进度跟踪初始化');
    }

    initModelCache() {
        // 模型缓存初始化
        console.log('模型缓存初始化');
        
        // 从localStorage加载缓存
        try {
            const cached = localStorage.getItem('newapi-models-cache');
            if (cached) {
                const cacheData = JSON.parse(cached);
                const now = Date.now();
                
                // 清理过期缓存
                Object.keys(cacheData).forEach(key => {
                    if (now - cacheData[key].timestamp > this.cacheExpiry) {
                        delete cacheData[key];
                    }
                });
                
                this.channelModelsCache = new Map(Object.entries(cacheData));
                console.log(`加载了 ${this.channelModelsCache.size} 个缓存的模型数据`);
            }
        } catch (error) {
            console.warn('加载模型缓存失败:', error);
        }
    }

    saveModelCache() {
        // 保存缓存到localStorage
        try {
            const cacheData = Object.fromEntries(this.channelModelsCache);
            localStorage.setItem('newapi-models-cache', JSON.stringify(cacheData));
        } catch (error) {
            console.warn('保存模型缓存失败:', error);
        }
    }

    getCacheKey(channelId, config) {
        // 生成缓存键
        return `${channelId}_${config.baseUrl}_${config.token}_${config.userId}`;
    }

    getCachedModels(channelId, config) {
        // 获取缓存的模型数据
        const cacheKey = this.getCacheKey(channelId, config);
        const cached = this.channelModelsCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            // 检查这个渠道的成功率
            const channelMetric = this.requestMetrics.get(channelId);
            if (channelMetric && channelMetric.success) {
                console.log(`🎯 渠道 ${channelId} 使用缓存数据 (${cached.models.length} 个模型) - 基于高成功率`);
                return cached.models;
            } else {
                console.log(`🔄 渠道 ${channelId} 跳过缓存 - 基于性能指标或失败记录`);
                return null;
            }
        }
        
        return null;
    }

    setCachedModels(channelId, config, models) {
        // 设置模型数据缓存
        const cacheKey = this.getCacheKey(channelId, config);
        
        // 只缓存成功的请求
        const channelMetric = this.requestMetrics.get(channelId);
        if (channelMetric && channelMetric.success && models.length > 0) {
            this.channelModelsCache.set(cacheKey, {
                models: models,
                timestamp: Date.now(),
                successRate: channelMetric.success ? 1 : 0
            });
            
            console.log(`💾 渠道 ${channelId} 缓存已保存 (${models.length} 个模型)`);
            
            // 限制缓存大小
            if (this.channelModelsCache.size > 100) {
                // 删除最旧的缓存项
                const oldestKey = this.channelModelsCache.keys().next().value;
                this.channelModelsCache.delete(oldestKey);
            }
            
            this.saveModelCache();
        } else {
            console.log(`🚫 渠道 ${channelId} 跳过缓存 - 请求失败或无模型`);
        }
    }

    getOptimalCacheExpiry() {
        // 根据整体性能调整缓存过期时间
        const stats = this.getPerformanceStats();
        if (!stats) return this.cacheExpiry;
        
        // 基于成功率动态调整缓存时间
        if (stats.successRate > 90) {
            return Math.min(this.cacheExpiry * 1.5, 10 * 60 * 1000); // 最长10分钟
        } else if (stats.successRate < 50) {
            return Math.max(this.cacheExpiry * 0.5, 2 * 60 * 1000); // 最短2分钟
        }
        
        return this.cacheExpiry;
    }

    clearModelCache() {
        // 清空模型缓存（只清除缓存，不影响真实数据）
        this.channelModelsCache.clear();
        localStorage.removeItem('newapi-models-cache');
        console.log('模型缓存已清空，所有数据将从API重新获取');
        this.showNotification('缓存已清空，将重新获取真实数据', 'info');
    }

    loadChannelSelectionsFromStorage() {
        // 加载渠道选择
        console.log('加载渠道选择');
    }

    preloadModelCache() {
        // 预加载模型缓存
        console.log('预加载模型缓存');
    }

    showSuggestions(suggestions) {
        // 显示建议
        console.log('显示建议:', suggestions);
    }

    // 新增性能指标记录函数
    recordPerformanceMetric(channelId, requestTime, modelCount, success = true) {
        const metric = {
            channelId,
            requestTime,
            modelCount,
            success,
            timestamp: Date.now()
        };
        
        this.requestMetrics.set(channelId, metric);
        
        // 动态调整批量大小
        this.adaptiveBatchSize = this.calculateOptimalBatchSize();
        
        // 清理旧的数据（保留最近100条）
        if (this.requestMetrics.size > 100) {
            const oldestKey = this.requestMetrics.keys().next().value;
            this.requestMetrics.delete(oldestKey);
        }
    }

    calculateOptimalBatchSize() {
        if (this.requestMetrics.size < 5) return 5; // 数据不足时使用默认值
        
        // 计算平均请求时间和成功率
        let totalTime = 0;
        let successCount = 0;
        let totalRequests = 0;
        
        this.requestMetrics.forEach(metric => {
            if (Date.now() - metric.timestamp < 5 * 60 * 1000) { // 只考虑最近5分钟的数据
                totalTime += metric.requestTime;
                if (metric.success) successCount++;
                totalRequests++;
            }
        });
        
        if (totalRequests === 0) return 5;
        
        const avgTime = totalTime / totalRequests;
        const successRate = successCount / totalRequests;
        
        // 根据性能动态调整批量大小
        if (successRate > 0.8 && avgTime < 5000) {
            return Math.min(8, this.adaptiveBatchSize + 1); // 性能好时增加并发
        } else if (successRate < 0.5 || avgTime > 15000) {
            return Math.max(2, this.adaptiveBatchSize - 1); // 性能差时减少并发
        }
        
        return this.adaptiveBatchSize;
    }

    getPerformanceStats() {
        if (this.requestMetrics.size === 0) return null;
        
        let totalTime = 0;
        let successCount = 0;
        let totalModels = 0;
        let totalRequests = 0;
        
        this.requestMetrics.forEach(metric => {
            totalTime += metric.requestTime;
            if (metric.success) {
                successCount++;
                totalModels += metric.modelCount;
            }
            totalRequests++;
        });
        
        return {
            avgRequestTime: Math.round(totalTime / totalRequests),
            successRate: Math.round((successCount / totalRequests) * 100),
            totalModels: totalModels,
            totalRequests: totalRequests,
            currentBatchSize: this.adaptiveBatchSize
        };
    }

    // ... other functions from the original app.js file

    // 新增：已选择的模型折叠框功能
    updateSelectedModelsSection() {
        // 获取所有已选择的模型
        const selectedModels = this.getAllSelectedModels();
        
        // 更新计数
        if (this.elements.selectedModelsCount) {
            this.elements.selectedModelsCount.textContent = `${selectedModels.length} 个已选择`;
        }
        
        // 更新信息文本
        if (this.elements.selectedModelsInfo) {
            if (selectedModels.length === 0) {
                this.elements.selectedModelsInfo.textContent = '暂无已选择的模型';
            } else {
                this.elements.selectedModelsInfo.textContent = `已选择 ${selectedModels.length} 个模型`;
            }
        }
        
        // 更新模型列表
        this.renderSelectedModelsList(selectedModels);
    }
    
    renderSelectedModelsList(selectedModels) {
        if (!this.elements.selectedModelsList) return;
        
        if (selectedModels.length === 0) {
            this.elements.selectedModelsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cube"></i>
                    <p>暂无已选择的模型</p>
                    <small>点击"查看模型"按钮，然后在弹窗中选择模型</small>
                </div>
            `;
            return;
        }
        
        // 按类型分组显示模型，使用与弹窗相同的气泡样式
        const categorizedModels = this.categorizeModelsArray(selectedModels);
        
        let html = '';
        Object.entries(categorizedModels).forEach(([category, models]) => {
            html += `
                <div class="model-category">
                    <div class="model-category-header">
                        <div class="model-category-title">
                            <i class="fas fa-cube"></i>
                            <h6>${category}</h6>
                        </div>
                        <span class="model-category-count">${models.length} 个</span>
                    </div>
                    <div class="model-category-content">
                        <div class="models-tags-container">
                            ${models.map(model => `
                                <span class="model-tag selected" title="${model}">
                                    ${model}
                                    <button class="btn-icon remove" onclick="app.removeSelectedModel('${this.escapeJsString(model)}')" title="移除">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        
        this.elements.selectedModelsList.innerHTML = html;
    }
    
    clearSelectedModels() {
        if (confirm('确定要清空所有已选择的模型吗？')) {
            // 清空文本域
            if (this.elements.originalModels) {
                this.elements.originalModels.value = '';
            }
            
            // 清空当前已选择模型缓存
            this.currentSelectedModels = [];
            
            // 更新显示
                this.updatePreview();
            
            // 如果弹窗是打开的，也更新弹窗中的显示
            if (this.elements.channelModelsModal.style.display === 'block') {
                // 如果模态框打开，更新当前渠道的选择显示
                this.displayCurrentChannelSelectedModels(this.currentChannelSelectedModels || []);
            }
            
            this.showNotification('已清空所有选择的模型', 'success');
        }
    }
    
    copySelectedModels() {
        const selectedModels = this.getAllSelectedModels();
        
        if (selectedModels.length === 0) {
            this.showNotification('没有已选择的模型可以复制', 'warning');
            return;
        }
        
        const modelsText = selectedModels.join('\n');
        this.copyToClipboard(modelsText).then(() => {
            this.showNotification(`已复制 ${selectedModels.length} 个模型到剪贴板`, 'success');
        }).catch(() => {
            this.showNotification('复制失败，请从弹出的对话框手动复制', 'warning');
        });
    }
    
    removeSelectedModel(model) {
        // 从文本域中移除
        if (this.elements.originalModels) {
            const currentModels = this.elements.originalModels.value.split('\n').map(m => m.trim()).filter(m => m);
            const index = currentModels.indexOf(model);
            if (index > -1) {
                currentModels.splice(index, 1);
                this.elements.originalModels.value = currentModels.join('\n');
            }
        }
        
        // 从缓存中移除
        if (this.currentSelectedModels && Array.isArray(this.currentSelectedModels)) {
            const cacheIndex = this.currentSelectedModels.indexOf(model);
            if (cacheIndex > -1) {
                this.currentSelectedModels.splice(cacheIndex, 1);
            }
        }
        
        // 更新显示
        this.updatePreview();
        
        // 如果弹窗是打开的，也更新弹窗中的显示
        if (this.elements.channelModelsModal.style.display === 'block') {
            // 更新当前渠道的选择显示
            this.displayCurrentChannelSelectedModels(this.currentChannelSelectedModels || []);
        }
        
        this.showNotification(`已移除模型: ${model}`, 'info');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    escapeJsString(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    }
    
    // NewAPI内模型相关功能
    showNewAPIModelsModal() {
        if (!this.currentChannelApiSelectedModels || !this.currentModalChannelId) {
            this.showNotification('请先打开一个渠道的模型管理', 'warning');
            return;
        }
        
        const channel = this.channels.find(c => c.id == this.currentModalChannelId);
        const channelName = channel ? channel.name : '未知渠道';
        
        // 设置模态框标题
        this.elements.newAPIModelsTitle.innerHTML = `<i class="fas fa-server"></i> ${channelName} - NewAPI内模型状态`;
        
        // 显示模态框
        this.elements.newAPIModelsModal.style.display = 'block';
        
        // 显示NewAPI内模型数据
        this.displayNewAPIModels();
    }
    
    closeNewAPIModelsModal() {
        this.elements.newAPIModelsModal.style.display = 'none';
        this.elements.newAPIModelsList.innerHTML = '';
    }
    
    displayNewAPIModels() {
        const apiModels = this.currentChannelApiSelectedModels || []; // NewAPI内模型（原始名称）
        const currentAllModels = this.getCurrentAllModels(); // 当前渠道的所有模型（现在也是原始名称）
        
        if (apiModels.length === 0) {
            this.elements.newAPIModelsList.innerHTML = `
                <div class="empty-state-newapi">
                    <div class="empty-icon">
                        <i class="fas fa-database"></i>
                    </div>
                    <div class="empty-content">
                        <h3>该渠道在NewAPI内暂无已选择的模型</h3>
                        <p>这通常表示该渠道尚未在NewAPI中配置任何模型</p>
                    </div>
                </div>
            `;
            this.elements.newAPIModelsCount.innerHTML = `
                <div class="stats-overview">
                    <div class="stat-item total">
                        <div class="stat-number">0</div>
                        <div class="stat-label">总计</div>
                    </div>
                </div>
            `;
            return;
        }
        
        // 按类型分组显示NewAPI内模型（使用原始名称）
        const categorizedModels = this.categorizeModelsArray(apiModels);
        
        let html = '';
        Object.entries(categorizedModels).forEach(([category, models]) => {
            html += `
                <div class="model-category">
                    <div class="model-category-header">
                        <div class="model-category-title">
                            <i class="fas fa-cube"></i>
                            <h6>${category}</h6>
                        </div>
                        <span class="model-category-count">${models.length} 个</span>
                    </div>
                    <div class="model-category-content">
                        <div class="newapi-models-grid">
                            ${models.map(model => {
                                // 现在直接匹配原始名称
                                const isMatched = currentAllModels.includes(model);
                                const statusClass = isMatched ? 'matched' : 'unmatched';
                                const statusText = isMatched ? '已匹配' : '未匹配';
                                const statusIcon = isMatched ? 'fa-check-circle' : 'fa-question-circle';

                                // 为未匹配的模型添加重定向检查按钮
                                const redirectButton = !isMatched ? `
                                    <button class="btn-icon btn-redirect"
                                            onclick="app.checkModelRedirect('${model.replace(/'/g, "\\'")}', ${this.currentModalChannelId})"
                                            title="检查重定向源头">
                                        <i class="fas fa-route"></i>
                                    </button>
                                ` : '';

                                return `
                                    <div class="newapi-model-item ${statusClass}" data-model="${model.replace(/'/g, "\\'")}">
                                        <div class="model-info">
                                            <div class="model-name" title="${model}">${model}</div>
                                            <div class="model-status">
                                                <i class="fas ${statusIcon}"></i>
                                                <span>${statusText}</span>
                                            </div>
                                        </div>
                                        <div class="model-actions">
                                            <button class="btn-icon btn-copy"
                                                    onclick="app.copyModelName('${model.replace(/'/g, "\\'")}')"
                                                    title="复制模型名称">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                            ${redirectButton}
                                        </div>
                                        <div class="redirect-info" id="redirect-info-${model.replace(/[^a-zA-Z0-9]/g, '-')}" style="display: none;">
                                            <!-- 重定向信息将在这里显示 -->
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        
        this.elements.newAPIModelsList.innerHTML = html;
        
        // 统计匹配状态
        const totalCount = apiModels.length;
        const matchedCount = apiModels.filter(model => currentAllModels.includes(model)).length;
        const unmatchedCount = totalCount - matchedCount;
        
        // 更新统计显示，使用更美观的格式
        const statsHtml = `
            <div class="stats-overview">
                <div class="stat-item total">
                    <div class="stat-number">${totalCount}</div>
                    <div class="stat-label">总计</div>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item matched">
                    <div class="stat-number">${matchedCount}</div>
                    <div class="stat-label">已匹配</div>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item unmatched">
                    <div class="stat-number">${unmatchedCount}</div>
                    <div class="stat-label">未匹配</div>
                </div>
            </div>
        `;
        
        this.elements.newAPIModelsCount.innerHTML = statsHtml;
    }
    
    getCurrentAllModels() {
        // 获取当前渠道的所有可用模型
        if (!this.currentModalChannelId) return [];
        
        const channel = this.channels.find(c => c.id == this.currentModalChannelId);
        return channel && channel.models ? channel.models : [];
    }
    
    refreshNewAPIModels() {
        if (!this.currentModalChannelId) return;
        
        this.showNotification('正在刷新NewAPI内模型数据...', 'info');
        
        // 重新获取当前渠道的数据
        this.loadChannelModelsInModal(this.currentModalChannelId).then(() => {
            this.displayNewAPIModels();
            this.showNotification('NewAPI内模型数据已刷新', 'success');
        }).catch(error => {
            this.showNotification('刷新失败: ' + error.message, 'error');
        });
    }
    
    copyNewAPIModels() {
        const apiModels = this.currentChannelApiSelectedModels || [];

        if (apiModels.length === 0) {
            this.showNotification('没有NewAPI内模型可复制', 'warning');
            return;
        }

        const modelsText = apiModels.join('\n');

        this.copyToClipboard(modelsText).then(() => {
            this.showNotification(`已复制 ${apiModels.length} 个NewAPI内模型到剪贴板`, 'success');
        }).catch(() => {
            this.showNotification('复制失败，请从弹出的对话框手动复制', 'warning');
        });
    }

    // 检查模型重定向源头
    async checkModelRedirect(modelName, channelId) {
        const infoElement = document.getElementById(`redirect-info-${modelName.replace(/[^a-zA-Z0-9]/g, '-')}`);

        if (!infoElement) {
            console.error('未找到重定向信息容器元素');
            return;
        }

        // 显示加载状态
        infoElement.innerHTML = `
            <div class="redirect-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>正在检查重定向源头...</span>
            </div>
        `;
        infoElement.style.display = 'block';

        try {
            // 获取当前配置
            const config = this.getConfig();
            if (!config.baseUrl) {
                throw new Error('请先配置服务器地址');
            }

            // 使用现有的 /api/channel-models 端点获取渠道详细配置
            const response = await this.fetchWithTimeout('/api/channel-models', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...config,
                    channelId: channelId,
                    fetchChannelConfig: true  // 特殊参数用于获取渠道配置
                })
            }, 30000);

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }

            const channelData = await response.json();

            // 分析重定向映射
            const redirectInfo = this.analyzeModelRedirect(modelName, channelData, channelId);

            // 显示重定向信息
            this.displayRedirectInfo(infoElement, modelName, redirectInfo);

        } catch (error) {
            console.error('检查重定向失败:', error);
            infoElement.innerHTML = `
                <div class="redirect-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>检查失败: ${error.message}</span>
                </div>
            `;
        }
    }

    // 分析模型重定向映射
    analyzeModelRedirect(modelName, channelData, channelId) {
        const redirectInfo = {
            hasRedirect: false,
            sourceModels: [],
            channelInfo: channelData.name || `渠道 ${channelId}`,
            modelName: modelName,
            modelMapping: null
        };

        // 检查渠道的model_mapping配置
        if (channelData.model_mapping && typeof channelData.model_mapping === 'object') {
            // 查找所有指向该模型的映射
            Object.entries(channelData.model_mapping).forEach(([sourceModel, targetModel]) => {
                if (targetModel === modelName) {
                    redirectInfo.hasRedirect = true;
                    redirectInfo.sourceModels.push({
                        name: sourceModel,
                        target: targetModel,
                        channel: channelData.name || `渠道 ${channelId}`
                    });
                }
            });
        }

        // 如果在当前渠道没找到映射，检查全局映射
        if (!redirectInfo.hasRedirect && channelData.model_mapping) {
            redirectInfo.modelMapping = channelData.model_mapping;
        }

        return redirectInfo;
    }

    // 显示重定向信息
    displayRedirectInfo(infoElement, modelName, redirectInfo) {
        if (redirectInfo.hasRedirect && redirectInfo.sourceModels.length > 0) {
            // 找到了重定向映射
            const sourceModelsHtml = redirectInfo.sourceModels.map(source => `
                <div class="redirect-source-item">
                    <div class="source-model">
                        <i class="fas fa-arrow-right"></i>
                        <span class="model-name">${source.name}</span>
                        <span class="arrow">→</span>
                        <span class="target-model">${source.target}</span>
                    </div>
                    <div class="source-channel">
                        <i class="fas fa-server"></i>
                        <span>${source.channel}</span>
                    </div>
                </div>
            `).join('');

            infoElement.innerHTML = `
                <div class="redirect-success">
                    <div class="redirect-header">
                        <i class="fas fa-route"></i>
                        <span>发现重定向映射</span>
                    </div>
                    <div class="redirect-content">
                        <p class="redirect-description">
                            模型 <strong>${modelName}</strong> 是以下模型的重定向目标：
                        </p>
                        <div class="source-models-list">
                            ${sourceModelsHtml}
                        </div>
                        <div class="redirect-tips">
                            <i class="fas fa-lightbulb"></i>
                            <span>您可以尝试直接添加源头模型到映射中</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // 没有找到重定向映射
            infoElement.innerHTML = `
                <div class="redirect-no-result">
                    <div class="redirect-header">
                        <i class="fas fa-info-circle"></i>
                        <span>无重定向映射</span>
                    </div>
                    <div class="redirect-content">
                        <p class="redirect-description">
                            模型 <strong>${modelName}</strong> 没有找到重定向源头映射。
                        </p>
                        <div class="redirect-tips">
                            <i class="fas fa-question-circle"></i>
                            <span>这可能是NewAPI中的独立模型或手动添加的模型</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new NewAPISyncToolV3();
    
    // 添加调试函数到全局作用域
    window.debugModelsList = function() {
        console.log('🔧 手动调试模型列表...');
        if (app && app.debugRefreshModelsList) {
            app.debugRefreshModelsList();
        } else {
            console.error('❌ App对象或调试方法不存在');
        }
    };
    
    window.checkTextarea = function() {
        const textarea = document.getElementById('originalModels');
        if (textarea) {
            console.log('📝 当前textarea状态:', {
                存在: true,
                值: `"${textarea.value}"`,
                长度: textarea.value.length,
                行数: textarea.value.split('\n').length,
                DOM位置: textarea.getBoundingClientRect(),
                显示状态: getComputedStyle(textarea).display
            });
        } else {
            console.error('❌ textarea元素未找到');
        }
        
        return textarea;
    };
    
    window.forceRender = function() {
        console.log('🎨 强制重新渲染模型列表...');
        if (app) {
            // 先检查基础状态
            const textarea = document.getElementById('originalModels');
            if (textarea) {
                console.log('🔍 渲染前检查:', {
                    textareaValue: `"${textarea.value}"`,
                    isEmpty: textarea.value.trim() === '',
                    lines: textarea.value.split('\n').filter(l => l.trim())
                });
            }
            
            app.renderModelsList();
            
            // 渲染后再次检查
            setTimeout(() => {
                const modelsList = document.getElementById('originalModelsList');
                console.log('🔍 渲染后检查:', {
                    modelsListExists: !!modelsList,
                    innerHTML: modelsList ? modelsList.innerHTML.substring(0, 200) : 'null',
                    childrenCount: modelsList ? modelsList.children.length : 0
                });
            }, 100);
        } else {
            console.error('App对象不存在');
        }
    };
});

// 测试添加模型的函数
window.addTestModels = function() {
    const app = window.app;
    if (!app) {
        console.error('❌ App对象不存在');
        return;
    }
    
    const testModels = [
        'gpt-3.5-turbo',
        'gpt-4', 
        'gpt-4-turbo',
        'claude-3-opus',
        'claude-3-sonnet'
    ];
    
    if (app.elements.originalModels) {
        app.elements.originalModels.value = testModels.join('\n');
        app.renderModelsList();
        console.log('✅ 已添加测试模型:', testModels);
    }
};


// ================================
// 规则管理系统
// ================================

class RulesManager {
    constructor() {
        this.rules = {
            nameMatching: [],
            modelMerge: []
        };
        this.currentRuleType = 'nameMatching';
        this.loadDefaultRules();
        this.loadRulesFromStorage();
    }

    // 加载默认规则
    loadDefaultRules() {
        // 智能名称匹配规则（格式标准化）
        this.rules.nameMatching = [
            {
                id: 'claude-format',
                name: 'Claude 系列格式标准化',
                description: '统一 Claude 模型名称格式',
                pattern: 'claude-([0-9]+)-?(sonnet|opus|haiku)',
                replacement: 'claude-$1-$2',
                enabled: true
            },
            {
                id: 'gpt-format',
                name: 'GPT 系列格式标准化',
                description: '统一 GPT 模型名称格式',
                pattern: 'gpt-?([0-9.]+)-?(turbo|mini|nano)',
                replacement: 'gpt-$1-$2',
                enabled: true
            },
            {
                id: 'deepseek-format',
                name: 'DeepSeek 系列格式标准化',
                description: '简化 DeepSeek 模型名称',
                pattern: 'deepseek-ai/(DeepSeek-.*)',
                replacement: 'deepseek-$1',
                enabled: true
            },
            {
                id: 'claude-date-format',
                name: 'Claude 日期格式标准化',
                description: '标准化 Claude 模型日期格式 (YYYYMMDD → YYYY-MM-DD)',
                pattern: 'claude-([^-]+)-(\\d{4})(\\d{2})(\\d{2})',
                replacement: 'claude-$1-$2-$3-$4',
                enabled: true
            },
            {
                id: 'gemini-format',
                name: 'Gemini 系列格式标准化',
                description: '统一 Gemini 模型名称格式',
                pattern: 'gemini-([^-]+)-?(pro|flash|ultra|nano)',
                replacement: 'gemini-$1-$2',
                enabled: true
            },
            {
                id: 'qwen-format',
                name: 'Qwen 系列格式标准化',
                description: '统一 Qwen 模型名称格式',
                pattern: 'qwen-?([^-]+)-?(instruct|chat|base)',
                replacement: 'qwen-$1-$2',
                enabled: true
            },
            {
                id: 'llama-format',
                name: 'Llama 系列格式标准化',
                description: '统一 Llama 模型名称格式',
                pattern: 'llama-?([^-]+)-?(instruct|chat)',
                replacement: 'llama-$1-$2',
                enabled: true
            },
            {
                id: 'mistral-format',
                name: 'Mistral 系列格式标准化',
                description: '统一 Mistral 模型名称格式',
                pattern: 'mistral-?([^-]+)-?(instruct|base)',
                replacement: 'mistral-$1-$2',
                enabled: true
            },
            {
                id: 'clean-version-suffixes',
                name: '清理版本后缀',
                description: '移除多余的版本后缀和修饰符',
                pattern: '(.+?)(-latest|-final|-stable|-official|-v\\d+)?$',
                replacement: '$1',
                enabled: true
            },
            {
                id: 'remove-brackets',
                name: '移除括号内容',
                description: '移除模型名称中的括号和方括号内容',
                pattern: '([^\\[\\(]+)(?:\\[[^\\]]*\\]|\\([^)]*\\))',
                replacement: '$1',
                enabled: false
            },
            {
                id: 'standardize-separators',
                name: '标准化分隔符',
                description: '统一使用连字符作为分隔符',
                pattern: '[-_\\s]+',
                replacement: '-',
                enabled: true
            }
        ];

        // 智能模型名合并规则（基础化简化）
        this.rules.modelMerge = [
            {
                id: 'gpt-merge',
                name: 'GPT 系列合并',
                description: '将 GPT 变体合并为基础版本',
                pattern: 'gpt-([0-9.]+)(-turbo|-mini|-nano)?',
                replacement: 'gpt-$1',
                enabled: true
            },
            {
                id: 'claude-merge',
                name: 'Claude 系列合并',
                description: '将 Claude 变体合并为基础版本',
                pattern: 'claude-([0-9]+)(-sonnet|-opus|-haiku)?',
                replacement: 'claude-$1',
                enabled: true
            },
            {
                id: 'claude-opus-merge',
                name: 'Claude Opus 合并',
                description: '将所有 Claude Opus 变体合并为 claude-opus',
                pattern: 'claude-(?:3-)?(opus)(?:-.*)?',
                replacement: 'claude-opus',
                enabled: true
            },
            {
                id: 'claude-sonnet-merge',
                name: 'Claude Sonnet 合并',
                description: '将所有 Claude Sonnet 变体合并为 claude-sonnet',
                pattern: 'claude-(?:3-)?(sonnet)(?:-.*)?',
                replacement: 'claude-sonnet',
                enabled: true
            },
            {
                id: 'claude-haiku-merge',
                name: 'Claude Haiku 合并',
                description: '将所有 Claude Haiku 变体合并为 claude-haiku',
                pattern: 'claude-(?:3-)?(haiku)(?:-.*)?',
                replacement: 'claude-haiku',
                enabled: true
            },
            {
                id: 'gemini-merge',
                name: 'Gemini 系列合并',
                description: '将 Gemini 变体合并为基础版本',
                pattern: 'gemini-(?:1\\.5-)?(pro|flash|ultra)(?:-.*)?',
                replacement: 'gemini-$1',
                enabled: true
            },
            {
                id: 'deepseek-merge',
                name: 'DeepSeek 系列合并',
                description: '将 DeepSeek 变体合并为基础版本',
                pattern: 'deepseek-(v?)[0-9.]+(?:-.*)?',
                replacement: 'deepseek',
                enabled: false
            },
            {
                id: 'qwen-merge',
                name: 'Qwen 系列合并',
                description: '将 Qwen 变体合并为基础版本',
                pattern: 'qwen-([0-9.]+)(?:-(?:instruct|chat|base))?',
                replacement: 'qwen-$1',
                enabled: false
            },
            {
                id: 'llama-merge',
                name: 'Llama 系列合并',
                description: '将 Llama 变体合并为基础版本',
                pattern: 'llama-([0-9.]+)(?:-(?:instruct|chat))?',
                replacement: 'llama-$1',
                enabled: false
            },
            {
                id: 'remove-all-suffixes',
                name: '移除所有后缀',
                description: '移除模型名称中的所有后缀，只保留基础名称',
                pattern: '([^\\[\\(]+)(?:\\[[^\\]]*\\]|\\([^)]*\\)|-[^-]+)*$',
                replacement: '$1',
                enabled: false
            },
            {
                id: 'merge-version-variants',
                name: '合并版本变体',
                description: '将同一模型的不同版本变体合并',
                pattern: '([^-]+)-\\d+(?:\\.\\d+)*',
                replacement: '$1',
                enabled: false
            },
            {
                id: 'merge-capability-suffixes',
                name: '合并能力后缀',
                description: '合并聊天、指令、基础等能力变体',
                pattern: '([^-]+)-(?:chat|instruct|base|completion)',
                replacement: '$1',
                enabled: false
            }
        ];
    }

    
    // 从本地存储加载规则
    loadRulesFromStorage() {
        try {
            const stored = localStorage.getItem('rulesManagement');
            if (stored) {
                const data = JSON.parse(stored);
                this.rules = { ...this.rules, ...data.rules };
                this.currentRuleType = data.currentRuleType || 'nameMatching';
            }
        } catch (error) {
            console.error('加载规则失败:', error);
        }
    }

    // 保存规则到本地存储
    saveRulesToStorage() {
        try {
            const data = {
                rules: this.rules,
                currentRuleType: this.currentRuleType,
                timestamp: Date.now()
            };
            localStorage.setItem('rulesManagement', JSON.stringify(data));
        } catch (error) {
            console.error('保存规则失败:', error);
        }
    }

    // 添加规则
    addRule(type, rule) {
        if (!this.rules[type]) {
            this.rules[type] = [];
        }
        
        rule.id = rule.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        rule.enabled = rule.enabled !== false;
        
        this.rules[type].push(rule);
        this.saveRulesToStorage();
        return rule.id;
    }

    // 更新规则
    updateRule(type, id, updatedRule) {
        const rules = this.rules[type];
        const index = rules.findIndex(r => r.id === id);
        if (index !== -1) {
            rules[index] = { ...rules[index], ...updatedRule };
            this.saveRulesToStorage();
            return true;
        }
        return false;
    }

    // 删除规则
    deleteRule(type, id) {
        const rules = this.rules[type];
        const index = rules.findIndex(r => r.id === id);
        if (index !== -1) {
            rules.splice(index, 1);
            this.saveRulesToStorage();
            return true;
        }
        return false;
    }

    // 切换规则状态
    toggleRule(type, id) {
        const rules = this.rules[type];
        const rule = rules.find(r => r.id === id);
        if (rule) {
            const wasEnabled = rule.enabled;
            rule.enabled = !rule.enabled;
            this.saveRulesToStorage();
            console.log(`✅ 规则 ${id} 状态已更改: ${wasEnabled} → ${rule.enabled}`);
            return rule.enabled;
        }
        console.log(`❌ 未找到规则 ${id}`);
        return false;
    }

    // 获取所有规则
    getAllRules(type) {
        return this.rules[type] || [];
    }

    // 获取启用的规则
    getEnabledRules(type) {
        return (this.rules[type] || []).filter(rule => rule.enabled);
    }

    // 应用规则到模型名称
    applyRules(modelName, type) {
        const rules = this.getEnabledRules(type);
        let result = modelName;

        for (const rule of rules) {
            try {
                const regex = new RegExp(rule.pattern, 'gi');
                if (regex.test(result)) {
                    result = result.replace(regex, rule.replacement);
                    break; // 只应用第一个匹配的规则
                }
            } catch (error) {
                console.error(`规则 ${rule.name} 执行失败:`, error);
            }
        }

        return result;
    }

    // 测试规则
    testRule(modelName, rule) {
        try {
            const regex = new RegExp(rule.pattern, 'gi');
            if (regex.test(modelName)) {
                return {
                    match: true,
                    result: modelName.replace(regex, rule.replacement)
                };
            }
            return {
                match: false,
                result: modelName
            };
        } catch (error) {
            return {
                match: false,
                result: modelName,
                error: error.message
            };
        }
    }

    // 导出规则
    exportRules() {
        return {
            version: '1.0',
            timestamp: Date.now(),
            rules: this.rules
        };
    }

    // 导入规则
    importRules(data) {
        try {
            if (data.rules) {
                this.rules = { ...this.rules, ...data.rules };
                this.saveRulesToStorage();
                return true;
            }
            return false;
        } catch (error) {
            console.error('导入规则失败:', error);
            return false;
        }
    }

    // 重置为默认规则
    resetToDefault() {
        this.loadDefaultRules();
        this.saveRulesToStorage();
    }

    // 获取规则统计
    getStats() {
        const nameMatchingCount = this.rules.nameMatching.length;
        const modelMergeCount = this.rules.modelMerge.length;

        return {
            total: nameMatchingCount + modelMergeCount,
            nameMatching: nameMatchingCount,
            modelMerge: modelMergeCount,
            enabled: {
                nameMatching: this.getEnabledRules('nameMatching').length,
                modelMerge: this.getEnabledRules('modelMerge').length
            }
        };
    }
}

// 在NewAPISyncToolV3类中添加规则管理方法
NewAPISyncToolV3.prototype.initRulesManagement = function() {
    // 初始化标签页切换
    this.initRuleTypeTabs();
    
    // 渲染规则列表
    this.renderRulesLists();
    
    // 更新规则计数
    this.updateRulesCount();
};

NewAPISyncToolV3.prototype.bindRulesManagementEvents = function() {
    // 标签页切换事件
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const ruleType = e.target.dataset.ruleType;
            if (ruleType) {
                this.switchRuleType(ruleType);
            }
        });
    });

    // 添加规则按钮事件
    if (this.elements.addNameMatchingRule) {
        this.elements.addNameMatchingRule.addEventListener('click', () => this.showAddRuleDialog('nameMatching'));
    }
    if (this.elements.addModelMergeRule) {
        this.elements.addModelMergeRule.addEventListener('click', () => this.showAddRuleDialog('modelMerge'));
    }
  
    // 规则管理操作按钮事件
    if (this.elements.resetRulesBtn) {
        this.elements.resetRulesBtn.addEventListener('click', () => this.resetRules());
    }
    if (this.elements.importRulesBtn) {
        this.elements.importRulesBtn.addEventListener('click', () => this.importRules());
    }
    if (this.elements.exportRulesBtn) {
        this.elements.exportRulesBtn.addEventListener('click', () => this.exportRules());
    }
    if (this.elements.saveRulesBtn) {
        this.elements.saveRulesBtn.addEventListener('click', () => this.saveRules());
    }

    // 规则测试事件
    if (this.elements.testRulesBtn) {
        this.elements.testRulesBtn.addEventListener('click', () => this.testRules());
    }
    if (this.elements.ruleTestInput) {
        this.elements.ruleTestInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.testRules();
            }
        });
    }

  };

// 初始化规则类型标签页
NewAPISyncToolV3.prototype.initRuleTypeTabs = function() {
    document.querySelectorAll('.tab-button').forEach(button => {
        const ruleType = button.dataset.ruleType;
        if (ruleType === this.rulesManager.currentRuleType) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    this.switchRuleType(this.rulesManager.currentRuleType);
};

// 切换规则类型
NewAPISyncToolV3.prototype.switchRuleType = function(ruleType) {
    // 更新标签页状态
    document.querySelectorAll('.tab-button').forEach(button => {
        if (button.dataset.ruleType === ruleType) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    // 切换面板显示
    document.querySelectorAll('.rule-type-panel').forEach(panel => {
        if (panel.id === `${ruleType}Rules`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    this.rulesManager.currentRuleType = ruleType;
    this.rulesManager.saveRulesToStorage();

    // 如果切换到自定义规则选项卡，渲染自定义规则列表
    if (ruleType === 'custom') {
        this.renderCustomRulesList();
    }
};

// 渲染规则列表
NewAPISyncToolV3.prototype.renderRulesLists = function() {
    this.renderRulesList('nameMatching');
    this.renderRulesList('modelMerge');
};

// 渲染单个规则列表
NewAPISyncToolV3.prototype.renderRulesList = function(type) {
    const container = this.elements[`${type}RulesList`];
    if (!container) return;

    const rules = this.rulesManager.getAllRules(type);

    console.log(`🎨 渲染规则列表 ${type}, 共 ${rules.length} 个规则`);
    rules.forEach(rule => {
        console.log(`  - ${rule.name}: enabled = ${rule.enabled}`);
    });

    if (rules.length === 0) {
        container.innerHTML = `
            <div class="rules-empty">
                <i class="fas fa-list-ul"></i>
                <h4>暂无规则</h4>
                <p>点击"添加规则"按钮创建新的转换规则</p>
            </div>
        `;
        return;
    }

    container.innerHTML = rules.map(rule => this.createRuleItemHTML(rule, type)).join('');

    // 绑定规则项事件
    this.bindRuleItemEvents(container, type);
};

// 创建规则项HTML
NewAPISyncToolV3.prototype.createRuleItemHTML = function(rule, type) {
    console.log(`🏗️ 创建规则HTML: ${rule.name}, enabled = ${rule.enabled}, toggle class = "rule-toggle ${rule.enabled ? 'active' : ''}"`);

    return `
        <div class="rule-item ${rule.enabled ? '' : 'disabled'}" data-rule-id="${rule.id}">
            <div class="rule-header">
                <div class="rule-info">
                    <div class="rule-name">${rule.name}</div>
                    <div class="rule-description">${rule.description}</div>
                </div>
                <div class="rule-controls">
                    <div class="rule-toggle ${rule.enabled ? 'active' : ''}" data-action="toggle"></div>
                    <button class="rule-btn rule-btn-edit" data-action="edit">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="rule-btn rule-btn-test" data-action="test">
                        <i class="fas fa-vial"></i> 测试
                    </button>
                    <button class="rule-btn rule-btn-delete" data-action="delete">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
            <div class="rule-details">
                <div class="rule-field">
                    <label>正则模式</label>
                    <input type="text" value="${rule.pattern}" readonly>
                </div>
                <div class="rule-field">
                    <label>替换内容</label>
                    <input type="text" value="${rule.replacement}" readonly>
                </div>
            </div>
        </div>
    `;
};

// 绑定规则项事件
NewAPISyncToolV3.prototype.bindRuleItemEvents = function(container, type) {
    container.addEventListener('click', (e) => {
        const ruleItem = e.target.closest('.rule-item');
        if (!ruleItem) return;

        const ruleId = ruleItem.dataset.ruleId;
        const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;

        console.log(`🖱️ 点击事件: ruleId=${ruleId}, action=${action}, target=${e.target.className}`);

        switch (action) {
            case 'toggle':
                console.log('🔄 触发toggle操作');
                this.toggleRule(type, ruleId);
                break;
            case 'edit':
                this.editRule(type, ruleId);
                break;
            case 'test':
                this.testSingleRule(type, ruleId);
                break;
            case 'delete':
                this.deleteRule(type, ruleId);
                break;
        }
    });
};

// 切换规则状态
NewAPISyncToolV3.prototype.toggleRule = function(type, ruleId) {
    // 获取当前状态用于调试
    const rules = this.rulesManager.getAllRules(type);
    const rule = rules.find(r => r.id === ruleId);
    const wasEnabled = rule ? rule.enabled : false;

    console.log(`🔄 切换规则 ${ruleId} 从 ${wasEnabled} 到 ${!wasEnabled}`);

    const enabled = this.rulesManager.toggleRule(type, ruleId);
    this.renderRulesList(type);
    this.updateRulesCount();
    this.showNotification(`规则已${enabled ? '启用' : '禁用'}`, 'success');
};

// 编辑规则
NewAPISyncToolV3.prototype.editRule = function(type, ruleId) {
    const rules = this.rulesManager.getAllRules(type);
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
        this.showEditRuleDialog(type, rule);
    }
};

// 删除规则
NewAPISyncToolV3.prototype.deleteRule = function(type, ruleId) {
    if (confirm('确定要删除这个规则吗？')) {
        this.rulesManager.deleteRule(type, ruleId);
        this.renderRulesList(type);
        this.updateRulesCount();
        this.showNotification('规则已删除', 'success');
    }
};

// 显示添加规则对话框
NewAPISyncToolV3.prototype.showAddRuleDialog = function(type) {
    const typeNames = {
        nameMatching: '智能名称匹配',
        modelMerge: '智能模型名合并'
    };

    const dialog = this.createRuleDialog(`添加${typeNames[type]}规则`, {
        name: '',
        description: '',
        pattern: '',
        replacement: '',
        enabled: true
    }, (rule) => {
        this.rulesManager.addRule(type, rule);
        this.renderRulesList(type);
        this.updateRulesCount();
        this.showNotification('规则已添加', 'success');
    });

    document.body.appendChild(dialog);
};

// 显示编辑规则对话框
NewAPISyncToolV3.prototype.showEditRuleDialog = function(type, rule) {
    const dialog = this.createRuleDialog('编辑规则', rule, (updatedRule) => {
        this.rulesManager.updateRule(type, rule.id, updatedRule);
        this.renderRulesList(type);
        this.updateRulesCount();
        this.showNotification('规则已更新', 'success');
    });

    document.body.appendChild(dialog);
};

// 创建规则对话框
NewAPISyncToolV3.prototype.createRuleDialog = function(title, rule, onSave) {
    const dialog = document.createElement('div');
    dialog.className = 'modal show';
    dialog.innerHTML = `
        <div class="modal-container">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">${title}</div>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">规则名称</label>
                        <input type="text" class="form-input" id="ruleName" value="${rule.name}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">规则描述</label>
                        <input type="text" class="form-input" id="ruleDescription" value="${rule.description}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">正则模式</label>
                        <input type="text" class="form-input" id="rulePattern" value="${rule.pattern}" placeholder="如: gpt-([0-9.]+)(-turbo)?">
                    </div>
                    <div class="form-group">
                        <label class="form-label">替换内容</label>
                        <input type="text" class="form-input" id="ruleReplacement" value="${rule.replacement}" placeholder="如: gpt-$1">
                    </div>
                    <div class="form-group">
                        <label class="option-label">
                            <input type="checkbox" id="ruleEnabled" ${rule.enabled ? 'checked' : ''}>
                            <span>启用规则</span>
                        </label>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-secondary" id="cancelBtn">取消</button>
                        <button class="btn btn-primary" id="saveBtn">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 绑定事件
    const closeBtn = dialog.querySelector('.modal-close');
    const cancelBtn = dialog.querySelector('#cancelBtn');
    const saveBtn = dialog.querySelector('#saveBtn');

    const closeDialog = () => {
        document.body.removeChild(dialog);
    };

    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    
    saveBtn.addEventListener('click', () => {
        const updatedRule = {
            name: dialog.querySelector('#ruleName').value.trim(),
            description: dialog.querySelector('#ruleDescription').value.trim(),
            pattern: dialog.querySelector('#rulePattern').value.trim(),
            replacement: dialog.querySelector('#ruleReplacement').value.trim(),
            enabled: dialog.querySelector('#ruleEnabled').checked
        };

        if (!updatedRule.name || !updatedRule.pattern || !updatedRule.replacement) {
            alert('请填写所有必填字段');
            return;
        }

        try {
            new RegExp(updatedRule.pattern);
            onSave(updatedRule);
            closeDialog();
        } catch (error) {
            alert('正则表达式格式错误: ' + error.message);
        }
    });

    // 点击外部关闭
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            closeDialog();
        }
    });

    return dialog;
};

// 测试规则
NewAPISyncToolV3.prototype.testRules = function() {
    const input = this.elements.ruleTestInput.value.trim();
    if (!input) {
        this.showNotification('请输入要测试的模型名称', 'warning');
        return;
    }

    const results = this.elements.ruleTestResults;
    const currentType = this.rulesManager.currentRuleType;
    const rules = this.rulesManager.getEnabledRules(currentType);

    let html = `
        <div class="test-result-item original">
            <strong>原始:</strong> ${input}
        </div>
    `;

    let hasMatch = false;
    for (const rule of rules) {
        const testResult = this.rulesManager.testRule(input, rule);
        if (testResult.match) {
            html += `
                <div class="test-result-item result">
                    <strong>匹配规则:</strong> ${rule.name} → ${testResult.result}
                </div>
            `;
            hasMatch = true;
            break;
        }
    }

    if (!hasMatch) {
        html += `
            <div class="test-result-item no-match">
                <strong>结果:</strong> 无匹配规则
            </div>
        `;
    }

    results.innerHTML = html;
    results.style.display = 'block';
};

// 测试单个规则
NewAPISyncToolV3.prototype.testSingleRule = function(type, ruleId) {
    const rule = this.rulesManager.getAllRules(type).find(r => r.id === ruleId);
    if (!rule) return;

    const testModel = prompt('请输入要测试的模型名称:', 'gpt-4-turbo');
    if (!testModel) return;

    const result = this.rulesManager.testRule(testModel, rule);
    
    if (result.match) {
        alert(`测试结果:\n原始: ${testModel}\n结果: ${result.result}`);
    } else {
        alert(`测试结果: 不匹配\n${result.error ? '错误: ' + result.error : ''}`);
    }
};

// 更新规则计数
NewAPISyncToolV3.prototype.updateRulesCount = function() {
    const stats = this.rulesManager.getStats();
    if (this.elements.rulesCount) {
        this.elements.rulesCount.textContent = stats.total;
    }
};

// 重置规则
NewAPISyncToolV3.prototype.resetRules = function() {
    if (confirm('确定要重置为默认规则吗？这将删除所有自定义规则。')) {
        this.rulesManager.resetToDefault();
        this.renderRulesLists();
        this.updateRulesCount();
        this.showNotification('规则已重置为默认设置', 'success');
    }
};

// 导入规则
NewAPISyncToolV3.prototype.importRules = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (this.rulesManager.importRules(data)) {
                    this.renderRulesLists();
                    this.updateRulesCount();
                    this.showNotification('规则导入成功', 'success');
                } else {
                    this.showNotification('规则导入失败：格式不正确', 'error');
                }
            } catch (error) {
                this.showNotification('规则导入失败：' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    };

    input.click();
};

// 导出规则
NewAPISyncToolV3.prototype.exportRules = function() {
    const data = this.rulesManager.exportRules();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `rules-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showNotification('规则导出成功', 'success');
};

// 保存规则
NewAPISyncToolV3.prototype.saveRules = function() {
    this.rulesManager.saveRulesToStorage();
    this.showNotification('规则已保存', 'success');
};

// 在现有的智能功能处理中集成规则管理系统
NewAPISyncToolV3.prototype.applySmartProcessing = function(originalModelName, channelName = null) {
    let processedName = originalModelName;

    const smartNameMatching = this.elements.smartNameMatching.checked;
    const enableSmartMerge = this.elements.enableSmartMerge.checked;
    const autoChannelSuffix = this.elements.autoChannelSuffix.checked;

    // 应用智能模型名合并（基础化简化）- 先执行
    if (enableSmartMerge) {
        processedName = this.rulesManager.applyRules(processedName, 'modelMerge');
    }

    // 应用智能名称匹配（格式标准化）- 后执行
    if (smartNameMatching) {
        processedName = this.rulesManager.applyRules(processedName, 'nameMatching');
    }

    // 应用自动渠道后缀 - 使用真实渠道名称（完整的API返回值）
    if (autoChannelSuffix && channelName) {
        processedName = processedName + '-' + channelName;
    }

    return processedName;
};

// 测试添加模型的函数
window.addTestModels = function() {
    const app = window.app;
    if (!app) {
        console.error('❌ App对象不存在');
        return;
    }
    
    const testModels = [
        'gpt-3.5-turbo',
        'gpt-4', 
        'gpt-4-turbo',
        'claude-3-opus',
        'claude-3-sonnet'
    ];
    
    if (app.elements.originalModels) {
        app.elements.originalModels.value = testModels.join('\n');
        app.renderModelsList();
        console.log('✅ 已添加测试模型:', testModels);
    }
};

// 预设规则集事件处理
NewAPISyncToolV3.prototype.bindPresetRulesEvents = function() {
    // 预设规则集卡片点击事件
    document.querySelectorAll('.preset-apply-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const presetId = e.target.closest('.preset-card').dataset.preset;
            this.applyPresetRuleSet(presetId);
        });
    });

    // 预设规则集卡片点击事件（点击卡片本身也触发）
    document.querySelectorAll('.preset-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('preset-apply-btn')) {
                const presetId = card.dataset.preset;
                this.applyPresetRuleSet(presetId);
            }
        });
    });
};

// 应用预设规则集
NewAPISyncToolV3.prototype.applyPresetRuleSet = function(presetId) {
    const card = document.querySelector(`.preset-card[data-preset="${presetId}"]`);

    if (!card) {
        this.showNotification('预设规则集不存在', 'error');
        return;
    }

    // 添加加载状态
    card.classList.add('loading');

    // 应用预设规则集
    const success = this.rulesManager.applyPresetRuleSet(presetId);

    if (success) {
        // 更新UI
        this.renderRulesLists();
        this.updateRulesCount();

        // 更新激活状态
        document.querySelectorAll('.preset-card').forEach(c => {
            c.classList.remove('active');
        });
        card.classList.add('active');

        // 获取预设信息
        const presets = this.rulesManager.getPresetRuleSets();
        const preset = presets[presetId];

        this.showNotification(`已应用预设规则集: ${preset.name}`, 'success');

        // 触发预览更新
        this.generatePreview();

    } else {
        this.showNotification('应用预设规则集失败', 'error');
    }

    // 移除加载状态
    setTimeout(() => {
        card.classList.remove('loading');
    }, 500);
}

// 自定义规则管理类
class CustomRulesManager {
    constructor() {
        this.rules = [];
        this.loadRulesFromStorage();
    }

    loadRulesFromStorage() {
        try {
            const saved = localStorage.getItem('custom-rules');
            if (saved) {
                this.rules = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('加载自定义规则失败:', error);
            this.rules = this.getDefaultRules();
        }
    }

    saveRulesToStorage() {
        try {
            localStorage.setItem('custom-rules', JSON.stringify(this.rules));
        } catch (error) {
            console.error('保存自定义规则失败:', error);
        }
    }

    getDefaultRules() {
        return [
            {
                id: this.generateId(),
                name: '去除版本号后缀',
                type: 'regex',
                pattern: /-\d+\.\d+(-[a-z]+)?$/g,
                replacement: '',
                priority: 100,
                condition: 'all',
                conditionValue: '',
                enabled: true,
                channelScope: 'all',
                channelIds: []
            },
            {
                id: this.generateId(),
                name: '标准化模型名称',
                type: 'regex',
                pattern: /[.\-_]+/g,
                replacement: '-',
                priority: 200,
                condition: 'all',
                conditionValue: '',
                enabled: true,
                channelScope: 'all',
                channelIds: []
            },
            {
                id: this.generateId(),
                name: '小写转大写',
                type: 'case',
                pattern: 'lower',
                replacement: '',
                priority: 300,
                condition: 'all',
                conditionValue: '',
                enabled: false,
                channelScope: 'all',
                channelIds: []
            }
        ];
    }

    generateId() {
        return 'custom-rule-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    addRule(rule) {
        rule.id = this.generateId();
        rule.enabled = rule.enabled !== false;
        this.rules.push(rule);
        this.sortRules();
        this.saveRulesToStorage();
        return rule;
    }

    updateRule(ruleId, updates) {
        const index = this.rules.findIndex(rule => rule.id === ruleId);
        if (index !== -1) {
            this.rules[index] = { ...this.rules[index], ...updates };
            this.sortRules();
            this.saveRulesToStorage();
            return true;
        }
        return false;
    }

    deleteRule(ruleId) {
        const index = this.rules.findIndex(rule => rule.id === ruleId);
        if (index !== -1) {
            this.rules.splice(index, 1);
            this.saveRulesToStorage();
            return true;
        }
        return false;
    }

    getRule(ruleId) {
        return this.rules.find(rule => rule.id === ruleId);
    }

    getEnabledRules() {
        return this.rules.filter(rule => rule.enabled);
    }

    sortRules() {
        this.rules.sort((a, b) => a.priority - b.priority);
    }

    applyRule(modelName, rule, channelId = null) {
        if (!rule.enabled) return modelName;

        // 检查作用范围
        if (rule.channelScope === 'specific' && !rule.channelIds.includes(channelId)) {
            return modelName;
        }

        // 检查应用条件
        if (rule.condition !== 'all') {
            let conditionMet = false;
            const conditionValue = rule.conditionValue || '';

            switch (rule.condition) {
                case 'startswith':
                    conditionMet = modelName.startsWith(conditionValue);
                    break;
                case 'endswith':
                    conditionMet = modelName.endsWith(conditionValue);
                    break;
                case 'contains':
                    conditionMet = modelName.includes(conditionValue);
                    break;
                case 'regex':
                    try {
                        const regex = new RegExp(conditionValue, 'i');
                        conditionMet = regex.test(modelName);
                    } catch (e) {
                        console.warn('无效的正则表达式:', conditionValue);
                    }
                    break;
            }

            if (!conditionMet) return modelName;
        }

        // 应用规则
        let result = modelName;

        try {
            switch (rule.type) {
                case 'regex':
                    if (rule.pattern instanceof RegExp) {
                        result = modelName.replace(rule.pattern, rule.replacement);
                    } else if (typeof rule.pattern === 'string') {
                        const regex = new RegExp(rule.pattern, 'g');
                        result = modelName.replace(regex, rule.replacement);
                    }
                    break;

                case 'string':
                    result = modelName.split(rule.pattern).join(rule.replacement);
                    break;

                case 'prefix':
                    if (modelName.startsWith(rule.pattern)) {
                        result = rule.replacement + modelName.substring(rule.pattern.length);
                    }
                    break;

                case 'suffix':
                    if (modelName.endsWith(rule.pattern)) {
                        result = modelName.substring(0, modelName.length - rule.pattern.length) + rule.replacement;
                    }
                    break;

                case 'case':
                    switch (rule.pattern) {
                        case 'upper':
                            result = modelName.toUpperCase();
                            break;
                        case 'lower':
                            result = modelName.toLowerCase();
                            break;
                        case 'capitalize':
                            result = modelName.charAt(0).toUpperCase() + modelName.slice(1).toLowerCase();
                            break;
                    }
                    break;
            }
        } catch (error) {
            console.warn('应用自定义规则失败:', error, rule);
        }

        return result;
    }

    applyRules(modelName, channelId = null) {
        const enabledRules = this.getEnabledRules();
        let result = modelName;

        for (const rule of enabledRules) {
            result = this.applyRule(result, rule, channelId);
        }

        return result;
    }
}

// 自定义规则管理方法
NewAPISyncToolV3.prototype.initCustomRulesManagement = function() {
    this.loadCustomRules();
    this.bindCustomRulesEvents();
    this.updateCustomRulesPreview();
};

NewAPISyncToolV3.prototype.loadCustomRules = function() {
    this.customRules = this.customRulesManager.getEnabledRules();
};

NewAPISyncToolV3.prototype.bindCustomRulesEvents = function() {
    // 自定义规则复选框事件
    if (this.elements.enableCustomRules) {
        this.elements.enableCustomRules.addEventListener('change', (e) => {
            this.toggleCustomRules(e.target.checked);
        });
    }

    // 添加自定义规则按钮
    if (this.elements.addCustomRuleBtn) {
        this.elements.addCustomRuleBtn.addEventListener('click', () => {
            this.showCustomRuleModal();
        });
    }

    // 自定义规则模态框事件
    if (this.elements.closeCustomRuleModalBtn) {
        this.elements.closeCustomRuleModalBtn.addEventListener('click', () => {
            this.closeCustomRuleModal();
        });
    }

    if (this.elements.cancelCustomRuleBtn) {
        this.elements.cancelCustomRuleBtn.addEventListener('click', () => {
            this.closeCustomRuleModal();
        });
    }

    if (this.elements.saveCustomRuleBtn) {
        this.elements.saveCustomRuleBtn.addEventListener('click', () => {
            this.saveCustomRule();
        });
    }

    // 规则类型变化事件
    if (this.elements.customRuleType) {
        this.elements.customRuleType.addEventListener('change', (e) => {
            this.updateCustomRuleForm(e.target.value);
        });
    }

    // 应用条件变化事件
    if (this.elements.customRuleCondition) {
        this.elements.customRuleCondition.addEventListener('change', (e) => {
            this.updateConditionVisibility(e.target.value);
        });
    }

    // 作用范围变化事件
    document.querySelectorAll('input[name="channelScope"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            this.updateChannelScopeVisibility(e.target.value);
        });
    });

    // 测试规则按钮
    if (this.elements.testCustomRuleBtn) {
        this.elements.testCustomRuleBtn.addEventListener('click', () => {
            this.testCustomRule();
        });
    }

    // 导入导出清空按钮
    if (this.elements.importCustomRulesBtn) {
        this.elements.importCustomRulesBtn.addEventListener('click', () => {
            this.importCustomRules();
        });
    }

    if (this.elements.exportCustomRulesBtn) {
        this.elements.exportCustomRulesBtn.addEventListener('click', () => {
            this.exportCustomRules();
        });
    }

    if (this.elements.clearCustomRulesBtn) {
        this.elements.clearCustomRulesBtn.addEventListener('click', () => {
            this.clearCustomRules();
        });
    }
};

NewAPISyncToolV3.prototype.toggleCustomRules = function(enabled) {
    if (enabled) {
        this.customRules = this.customRulesManager.getEnabledRules();
        this.updateCustomRulesPreview();
        this.showNotification('自定义规则已启用', 'success');
    } else {
        this.customRules = [];
        this.updateCustomRulesPreview();
        this.showNotification('自定义规则已禁用', 'info');
    }
};

NewAPISyncToolV3.prototype.updateCustomRulesPreview = function() {
    if (this.elements.customRulesPreview && this.elements.customRulesCount) {
        const count = this.customRules.length;
        if (count > 0) {
            this.elements.customRulesPreview.style.display = 'block';
            this.elements.customRulesCount.textContent = count;
        } else {
            this.elements.customRulesPreview.style.display = 'none';
        }
    }
};

NewAPISyncToolV3.prototype.showCustomRuleModal = function(ruleId = null) {
    const modal = this.elements.customRuleModal;
    if (!modal) return;

    if (ruleId) {
        const rule = this.customRulesManager.getRule(ruleId);
        if (rule) {
            this.populateCustomRuleForm(rule);
            modal.dataset.editingRuleId = ruleId;
            document.getElementById('customRuleModalTitle').textContent = '编辑自定义规则';
        }
    } else {
        this.clearCustomRuleForm();
        delete modal.dataset.editingRuleId;
        document.getElementById('customRuleModalTitle').textContent = '添加自定义规则';
    }

    modal.style.display = 'flex';
    this.updateCustomRuleForm(this.elements.customRuleType.value);
    this.updateConditionVisibility(this.elements.customRuleCondition.value);
    this.updateChannelScopeVisibility('all');

    // 加载渠道列表
    this.loadChannelScopeCheckboxes();
};

NewAPISyncToolV3.prototype.closeCustomRuleModal = function() {
    const modal = this.elements.customRuleModal;
    if (modal) {
        modal.style.display = 'none';
        delete modal.dataset.editingRuleId;
    }
};

NewAPISyncToolV3.prototype.populateCustomRuleForm = function(rule) {
    if (this.elements.customRuleName) this.elements.customRuleName.value = rule.name || '';
    if (this.elements.customRuleType) this.elements.customRuleType.value = rule.type || 'regex';
    if (this.elements.customRulePattern) this.elements.customRulePattern.value = rule.pattern || '';
    if (this.elements.customRuleReplacement) this.elements.customRuleReplacement.value = rule.replacement || '';
    if (this.elements.customRulePriority) this.elements.customRulePriority.value = rule.priority || 100;
    if (this.elements.customRuleCondition) this.elements.customRuleCondition.value = rule.condition || 'all';
    if (this.elements.customRuleConditionValue) this.elements.customRuleConditionValue.value = rule.conditionValue || '';
};

NewAPISyncToolV3.prototype.clearCustomRuleForm = function() {
    if (this.elements.customRuleName) this.elements.customRuleName.value = '';
    if (this.elements.customRuleType) this.elements.customRuleType.value = 'regex';
    if (this.elements.customRulePattern) this.elements.customRulePattern.value = '';
    if (this.customRuleReplacement) this.elements.customRuleReplacement.value = '';
    if (this.elements.customRulePriority) this.customRulePriority.value = 100;
    if (this.elements.customRuleCondition) this.elements.customRuleCondition.value = 'all';
    if (this.elements.customRuleConditionValue) this.elements.customRuleConditionValue.value = '';
};

NewAPISyncToolV3.prototype.updateCustomRuleForm = function(type) {
    const patternHelp = document.getElementById('patternHelp');
    const patternInput = this.elements.customRulePattern;
    const replacementInput = this.elements.customRuleReplacement;

    if (!patternHelp || !patternInput || !replacementInput) return;

    switch (type) {
        case 'regex':
            patternHelp.textContent = '输入正则表达式或匹配模式';
            patternInput.placeholder = '例如: -\\d+\\.\\d+$';
            replacementInput.placeholder = '替换为的文本';
            break;
        case 'string':
            patternHelp.textContent = '输入要匹配的字符串';
            patternInput.placeholder = '例如: -beta';
            replacementInput.placeholder = '替换为的文本';
            break;
        case 'prefix':
            patternHelp.textContent = '输入要去除的前缀';
            patternInput.placeholder = '例如: gpt-';
            replacementInput.placeholder = '替换为的文本';
            break;
        case 'suffix':
            patternHelp.textContent = '输入要去除的后缀';
            patternInput.placeholder = '例如: -v1';
            replacementInput.placeholder = '替换为的文本';
            break;
        case 'case':
            patternHelp.textContent = '选择大小写转换方式';
            patternInput.placeholder = '选择转换方式';
            replacementInput.placeholder = '转换选项';
            break;
    }
};

NewAPISyncToolV3.prototype.updateConditionVisibility = function(condition) {
    const conditionValueGroup = document.getElementById('conditionValueGroup');
    if (conditionValueGroup) {
        conditionValueGroup.style.display = condition === 'all' ? 'none' : 'block';
    }
};

NewAPISyncToolV3.prototype.updateChannelScopeVisibility = function(scope) {
    const channelScopeList = document.getElementById('channelScopeList');
    if (channelScopeList) {
        channelScopeList.style.display = scope === 'specific' ? 'block' : 'none';
    }
};

NewAPISyncToolV3.prototype.loadChannelScopeCheckboxes = function() {
    const container = document.getElementById('channelScopeCheckboxes');
    if (!container) return;

    container.innerHTML = '';

    this.channels.forEach(channel => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = channel.id;
        checkbox.dataset.channelName = channel.name;

        const span = document.createElement('span');
        span.textContent = channel.name;

        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
};

NewAPISyncToolV3.prototype.saveCustomRule = function() {
    const modal = this.elements.customRuleModal;
    if (!modal) return;

    const ruleData = this.getCustomRuleFormData();
    if (!this.validateCustomRule(ruleData)) {
        return;
    }

    const isEditing = modal.dataset.editingRuleId;
    let rule;

    if (isEditing) {
        rule = this.customRulesManager.updateRule(isEditing, ruleData);
        if (rule) {
            this.showNotification('自定义规则已更新', 'success');
        }
    } else {
        rule = this.customRulesManager.addRule(ruleData);
        if (rule) {
            this.showNotification('自定义规则已添加', 'success');
        }
    }

    if (rule) {
        this.closeCustomRuleModal();
        this.loadCustomRules();
        this.renderCustomRulesList();
        this.updateCustomRulesPreview();
        this.updateCustomRulesCount();
    }
};

NewAPISyncToolV3.prototype.getCustomRuleFormData = function() {
    const channelScope = document.querySelector('input[name="channelScope"]:checked')?.value || 'all';
    const channelIds = channelScope === 'specific' ?
        Array.from(document.querySelectorAll('#channelScopeCheckboxes input:checked')).map(cb => cb.value) : [];

    return {
        name: this.elements.customRuleName?.value?.trim() || '',
        type: this.elements.customRuleType?.value || 'regex',
        pattern: this.elements.customRulePattern?.value || '',
        replacement: this.elements.customRuleReplacement?.value || '',
        priority: parseInt(this.elements.customRulePriority?.value) || 100,
        condition: this.elements.customRuleCondition?.value || 'all',
        conditionValue: this.elements.customRuleConditionValue?.value || '',
        channelScope: channelScope,
        channelIds: channelIds
    };
};

NewAPISyncToolV3.prototype.validateCustomRule = function(ruleData) {
    if (!ruleData.name) {
        this.showNotification('请输入规则名称', 'error');
        return false;
    }

    if (!ruleData.pattern && ruleData.type !== 'case') {
        this.showNotification('请输入匹配模式', 'error');
        return false;
    }

    if (ruleData.type === 'regex' && ruleData.pattern) {
        try {
            new RegExp(ruleData.pattern);
        } catch (error) {
            this.showNotification('正则表达式格式错误: ' + error.message, 'error');
            return false;
        }
    }

    return true;
};

NewAPISyncToolV3.prototype.renderCustomRulesList = function() {
    const container = document.getElementById('customRulesList');
    const emptyState = document.getElementById('emptyCustomRules');
    if (!container) return;

    const allRules = this.customRulesManager.rules;

    if (allRules.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = allRules.map(rule => this.createCustomRuleItem(rule)).join('');
};

NewAPISyncToolV3.prototype.createCustomRuleItem = function(rule) {
    const priorityClass = rule.priority < 100 ? 'priority-high' : rule.priority < 200 ? 'priority-medium' : 'priority-low';
    const typeTagClass = rule.type;
    const statusClass = rule.enabled ? 'enabled' : 'disabled';

    return `
        <div class="custom-rule-item ${statusClass}" data-rule-id="${rule.id}">
            <div class="custom-rule-header">
                <div class="custom-rule-title">
                    <span class="priority-indicator ${priorityClass}">${rule.priority}</span>
                    <i class="fas fa-magic"></i>
                    <span>${rule.name}</span>
                    <span class="rule-type-tag ${typeTagClass}">${this.getRuleTypeLabel(rule.type)}</span>
                </div>
                <div class="custom-rule-status">
                    <span class="status-badge ${statusClass}">${rule.enabled ? '启用' : '禁用'}</span>
                </div>
            </div>
            <div class="custom-rule-details">
                <div class="detail-item">
                    <strong>类型:</strong>
                    <span>${this.getRuleTypeLabel(rule.type)}</span>
                </div>
                <div class="detail-item">
                    <strong>模式:</strong>
                    <span>${rule.pattern}</span>
                </div>
                <div class="detail-item">
                    <strong>替换为:</strong>
                    <span>${rule.replacement || '(无)'}</span>
                </div>
                <div class="detail-item">
                    <strong>优先级:</strong>
                    <span>${rule.priority}</span>
                </div>
                ${rule.condition !== 'all' ? `
                <div class="detail-item">
                    <strong>条件:</strong>
                    <span>${this.getConditionLabel(rule.condition)}: ${rule.conditionValue}</span>
                </div>
                ` : ''}
                ${rule.channelScope === 'specific' ? `
                <div class="detail-item">
                    <strong>渠道:</strong>
                    <span>${rule.channelIds.length} 个指定渠道</span>
                </div>
                ` : ''}
            </div>
            <div class="custom-rule-actions">
                <button class="btn btn-sm ${rule.enabled ? 'btn-warning' : 'btn-success'}" onclick="app.toggleCustomRule('${rule.id}')">
                    <i class="fas fa-${rule.enabled ? 'fa-toggle-off' : 'fa-toggle-on'}"></i>
                    ${rule.enabled ? '禁用' : '启用'}
                </button>
                <button class="btn btn-sm btn-primary" onclick="app.editCustomRule('${rule.id}')">
                    <i class="fas fa-edit"></i>
                    编辑
                </button>
                <button class="btn btn-sm btn-danger" onclick="app.deleteCustomRule('${rule.id}')">
                    <i class="fas fa-trash"></i>
                    删除
                </button>
            </div>
        </div>
    `;
};

NewAPISyncToolV3.prototype.getRuleTypeLabel = function(type) {
    const labels = {
        'regex': '正则替换',
        'string': '字符串替换',
        'prefix': '前缀处理',
        'suffix': '后缀处理',
        'case': '大小写转换'
    };
    return labels[type] || type;
};

NewAPISyncToolV3.prototype.getConditionLabel = function(condition) {
    const labels = {
        'startswith': '开头是',
        'endswith': '结尾是',
        'contains': '包含',
        'regex': '匹配正则',
        'all': '所有模型'
    };
    return labels[condition] || condition;
};

NewAPISyncToolV3.prototype.toggleCustomRule = function(ruleId) {
    const rule = this.customRulesManager.getRule(ruleId);
    if (rule) {
        const updated = this.customRulesManager.updateRule(ruleId, { enabled: !rule.enabled });
        if (updated) {
            this.renderCustomRulesList();
            this.loadCustomRules();
            this.showNotification(`自定义规则已${updated.enabled ? '启用' : '禁用'}`, 'success');
        }
    }
};

NewAPISyncToolV3.prototype.editCustomRule = function(ruleId) {
    this.showCustomRuleModal(ruleId);
};

NewAPISyncToolV3.prototype.deleteCustomRule = function(ruleId) {
    if (confirm('确定要删除这条自定义规则吗？')) {
        const deleted = this.customRulesManager.deleteRule(ruleId);
        if (deleted) {
            this.renderCustomRulesList();
            this.loadCustomRules();
            this.updateCustomRulesPreview();
            this.updateCustomRulesCount();
            this.showNotification('自定义规则已删除', 'info');
        }
    }
};

NewAPISyncToolV3.prototype.updateCustomRulesCount = function() {
    const allRules = this.customRulesManager.rules;
    const countElement = document.getElementById('customRulesCount');
    if (countElement) {
        countElement.textContent = allRules.length;
    }

    // 更新规则管理中的计数
    const rulesCountElement = document.getElementById('rulesCount');
    if (rulesCountElement) {
        const nameMatchingCount = this.rulesManager.rules.nameMatching.length;
        const modelMergeCount = this.rulesManager.rules.modelMerge.length;
        const customCount = allRules.length;
        rulesCountElement.textContent = nameMatchingCount + modelMergeCount + customCount;
    }
};

NewAPISyncToolV3.prototype.testCustomRule = function() {
    const testInput = this.elements.customRuleTestInput?.value?.trim();
    const resultDiv = this.elements.customRuleTestResult;
    const ruleData = this.getCustomRuleFormData();

    if (!testInput || !resultDiv) return;

    const rule = { ...ruleData, enabled: true };
    const originalName = testInput;
    const resultName = this.customRulesManager.applyRule(originalName, rule);
    const applied = resultName !== originalName;

    resultDiv.style.display = 'block';
    document.getElementById('testOriginalName').textContent = originalName;
    document.getElementById('testResultName').textContent = resultName;

    const appliedElement = document.getElementById('testApplied');
    appliedElement.textContent = applied ? '是' : '否';
    appliedElement.setAttribute('data-applied', applied);
};

NewAPISyncToolV3.prototype.importCustomRules = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const rules = JSON.parse(event.target.result);
                    if (Array.isArray(rules)) {
                        rules.forEach(rule => this.customRulesManager.addRule(rule));
                        this.renderCustomRulesList();
                        this.loadCustomRules();
                        this.updateCustomRulesPreview();
                        this.updateCustomRulesCount();
                        this.showNotification(`成功导入 ${rules.length} 条自定义规则`, 'success');
                    } else {
                        this.showNotification('导入文件格式错误', 'error');
                    }
                } catch (error) {
                    this.showNotification('导入失败: ' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        }
    });

    input.click();
};

NewAPISyncToolV3.prototype.exportCustomRules = function() {
    const rules = this.customRulesManager.rules;
    const dataStr = JSON.stringify(rules, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `custom-rules-${new Date().toISOString().split('T')[0]}.json`;

    link.click();
    URL.revokeObjectURL(url);

    this.showNotification(`已导出 ${rules.length} 条自定义规则`, 'success');
};

NewAPISyncToolV3.prototype.clearCustomRules = function() {
    if (confirm('确定要清空所有自定义规则吗？此操作不可恢复。')) {
        this.customRulesManager.rules = [];
        this.customRulesManager.saveRulesToStorage();
        this.renderCustomRulesList();
        this.loadCustomRules();
        this.updateCustomRulesPreview();
        this.updateCustomRulesCount();
        this.showNotification('所有自定义规则已清空', 'info');
    }
};

// 渲染自定义规则列表
NewAPISyncToolV3.prototype.renderCustomRulesList = function() {
    const container = this.elements.customRulesList;
    if (!container) return;

    const rules = this.customRulesManager.rules;

    console.log(`🎨 渲染自定义规则列表，共 ${rules.length} 个规则`);
    rules.forEach(rule => {
        console.log(`  - ${rule.name}: enabled = ${rule.enabled}`);
    });

    if (rules.length === 0) {
        container.innerHTML = `
            <div class="empty-custom-rules">
                <i class="fas fa-cogs"></i>
                <h4>暂无自定义规则</h4>
                <p>点击"添加自定义规则"按钮创建新的转换规则</p>
                <small>自定义规则可以对模型名称进行更精细的控制和转换</small>
            </div>
        `;
        return;
    }

    // 按优先级排序规则
    const sortedRules = [...rules].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const html = sortedRules.map(rule => {
        const priorityClass = `priority-${rule.priority}`;
        const typeClass = `rule-type-tag.${rule.type}`;
        const statusBadge = rule.enabled ?
            '<span class="status-badge enabled">启用</span>' :
            '<span class="status-badge disabled">禁用</span>';

        let targetChannels = '所有渠道';
        if (rule.channelScope !== 'all' && rule.channels && rule.channels.length > 0) {
            targetChannels = `${rule.channels.length} 个指定渠道`;
        }

        return `
            <div class="custom-rule-item ${rule.enabled ? '' : 'disabled'}">
                <div class="custom-rule-header">
                    <div class="custom-rule-title">
                        <div class="priority-indicator ${priorityClass}">${rule.priority.substring(0, 1).toUpperCase()}</div>
                        <i class="fas fa-cogs"></i>
                        <span>${rule.name}</span>
                        <span class="rule-type-tag ${rule.type}">${this.getRuleTypeLabel(rule.type)}</span>
                        ${statusBadge}
                    </div>
                    <div class="custom-rule-actions">
                        <button class="btn btn-sm btn-secondary" onclick="app.editCustomRule('${rule.id}')">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                        <button class="btn btn-sm ${rule.enabled ? 'btn-warning' : 'btn-success'}" onclick="app.toggleCustomRule('${rule.id}')">
                            <i class="fas fa-${rule.enabled ? 'pause' : 'play'}"></i> ${rule.enabled ? '禁用' : '启用'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteCustomRule('${rule.id}')">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </div>

                <div class="custom-rule-details">
                    <div class="detail-item">
                        <strong>描述:</strong>
                        <span>${rule.description || '无描述'}</span>
                    </div>
                    <div class="detail-item">
                        <strong>类型:</strong>
                        <span>${this.getRuleTypeDescription(rule.type)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>条件:</strong>
                        <span>${this.getRuleConditionDescription(rule.condition)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>模式:</strong>
                        <span><code>${rule.pattern}</code></span>
                    </div>
                    <div class="detail-item">
                        <strong>替换:</strong>
                        <span><code>${rule.replacement}</code></span>
                    </div>
                    <div class="detail-item">
                        <strong>渠道:</strong>
                        <span>${targetChannels}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
};

// 获取规则类型标签
NewAPISyncToolV3.prototype.getRuleTypeLabel = function(type) {
    const labels = {
        regex: '正则',
        string: '字符串',
        prefix: '前缀',
        suffix: '后缀',
        case: '大小写'
    };
    return labels[type] || type;
};

// 获取规则类型描述
NewAPISyncToolV3.prototype.getRuleTypeDescription = function(type) {
    const descriptions = {
        regex: '正则表达式替换',
        string: '字符串替换',
        prefix: '前缀处理',
        suffix: '后缀处理',
        case: '大小写转换'
    };
    return descriptions[type] || type;
};

// 获取规则条件描述
NewAPISyncToolV3.prototype.getRuleConditionDescription = function(condition) {
    const descriptions = {
        startwith: '模型名以此开头',
        endswith: '模型名以此结尾',
        contains: '模型名包含',
        regex: '模型名匹配正则',
        all: '所有模型'
    };
    return descriptions[condition] || condition;
};

// 切换自定义规则启用状态
NewAPISyncToolV3.prototype.toggleCustomRule = function(ruleId) {
    const rule = this.customRulesManager.rules.find(r => r.id === ruleId);
    if (rule) {
        rule.enabled = !rule.enabled;
        this.customRulesManager.saveRulesToStorage();
        this.renderCustomRulesList();
        this.loadCustomRules();
        this.updateCustomRulesPreview();
        this.updateCustomRulesCount();
        this.showNotification(`规则已${rule.enabled ? '启用' : '禁用'}`, 'success');
    }
};

// 编辑自定义规则
NewAPISyncToolV3.prototype.editCustomRule = function(ruleId) {
    const rule = this.customRulesManager.rules.find(r => r.id === ruleId);
    if (rule) {
        this.showCustomRuleModal(rule);
    }
};

// 删除自定义规则
NewAPISyncToolV3.prototype.deleteCustomRule = function(ruleId) {
    if (confirm('确定要删除这个自定义规则吗？')) {
        const index = this.customRulesManager.rules.findIndex(r => r.id === ruleId);
        if (index > -1) {
            this.customRulesManager.rules.splice(index, 1);
            this.customRulesManager.saveRulesToStorage();
            this.renderCustomRulesList();
            this.loadCustomRules();
            this.updateCustomRulesPreview();
            this.updateCustomRulesCount();
            this.showNotification('自定义规则已删除', 'success');
        }
    }
};

// 在现有的智能模型映射生成方法中集成自定义规则
const originalGenerateSmartModelMapping = NewAPISyncToolV3.prototype.generateSmartModelMapping;

NewAPISyncToolV3.prototype.generateSmartModelMapping = function(standardModels, actualModels) {
    // 首先应用现有的智能映射逻辑
    let modelMap = originalGenerateSmartModelMapping.call(this, standardModels, actualModels);

    // 如果启用了自定义规则，对映射结果进行进一步处理
    if (this.elements.enableCustomRules && this.elements.enableCustomRules.checked) {
        const processedMap = {};

        for (const [standardModel, actualModel] of Object.entries(modelMap)) {
            const processedModel = this.customRulesManager.applyRules(actualModel);
            processedMap[standardModel] = processedModel;
        }

        modelMap = processedMap;
    }

    return modelMap;
};

// ==================== 表格形式可编辑映射功能 ====================

// 填充映射表格
NewAPISyncToolV3.prototype.populateMappingTable = function(originalModels) {
    const tableBody = document.getElementById('mappingTableBody');
    if (!tableBody) return;

    // 清空现有行
    tableBody.innerHTML = '';

    // 如果没有模型，显示空状态
    if (!originalModels || originalModels.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                暂无模型数据，请先连接并获取模型列表
            </td>
        `;
        tableBody.appendChild(emptyRow);
        return;
    }

    // 直接使用与buildModelMapping相同的逻辑生成默认映射
    const defaultMapping = {};
    const smartNameMatching = this.elements.smartNameMatching.checked;
    const enableSmartMerge = this.elements.enableSmartMerge.checked;
    const autoChannelSuffix = this.elements.autoChannelSuffix.checked;

    for (let i = 0; i < originalModels.length; i++) {
        const originalModel = originalModels[i];
        let mappedModel = originalModel;

        // 从modelChannelMapping获取该模型对应的渠道信息
        let channelName = null;
        const channelMappings = this.modelChannelMapping.get(originalModel);
        if (channelMappings && channelMappings.length > 0) {
            // 使用第一个渠道映射的渠道名称
            const firstChannelId = channelMappings[0].channelId;
            const channelInfo = this.channels.find(ch => ch.id === firstChannelId);
            if (channelInfo) {
                channelName = channelInfo.name;
            }
        }

        // 首先应用智能处理（智能名称匹配、智能模型名合并、自动渠道后缀）
        // 传递渠道名称用于自动渠道后缀功能
        mappedModel = this.applySmartProcessing(mappedModel, channelName);

        // 修复：映射应该是 修改后模型 -> 原始模型
        defaultMapping[mappedModel] = originalModel;
    }

    // 为每个模型创建表格行
    originalModels.forEach(originalModel => {
        // 修复：现在映射是反向的，需要查找原始模型对应的修改后模型
        let mappedModel = defaultMapping[originalModel] || originalModel;
        for (const [key, value] of Object.entries(this.modelMapping)) {
            if (value === originalModel) {
                mappedModel = key;
                break;
            }
        }
        const row = this.createMappingTableRow(originalModel, mappedModel);
        tableBody.appendChild(row);
    });

    // 更新状态显示和空状态控制
    this.updateMappingTableVisibility();
};

// 基于已构建的modelMapping对象填充映射表格UI
// 确保UI和数据的一致性，避免竞态条件
NewAPISyncToolV3.prototype.populateMappingTableFromMapping = function(originalModels) {
    const tableBody = document.getElementById('mappingTableBody');
    if (!tableBody) {
        console.error('映射表格body元素未找到');
        return;
    }

    // 清空现有内容
    tableBody.innerHTML = '';

    // 修复：现在modelMapping是 修改后模型 -> 原始模型 的映射
    // 需要反向查找每个原始模型对应的修改后模型
    originalModels.forEach(originalModel => {
        let mappedModel = originalModel;
        for (const [key, value] of Object.entries(this.modelMapping)) {
            if (value === originalModel) {
                mappedModel = key;
                break;
            }
        }
        const row = this.createMappingTableRow(originalModel, mappedModel);
        tableBody.appendChild(row);
    });

    console.log('🔄 UI已基于最新的modelMapping对象更新:', this.modelMapping);
};

// 创建映射表格行
NewAPISyncToolV3.prototype.createMappingTableRow = function(originalModel, mappedModel) {
    const row = document.createElement('tr');
    row.className = 'mapping-row';

    row.innerHTML = `
        <td class="mapping-cell cell-original">
            <div class="original-model" title="${this.escapeHtml(originalModel)}">
                ${this.escapeHtml(originalModel)}
            </div>
        </td>
        <td class="mapping-cell cell-arrow">
            <div class="arrow-icon">→</div>
        </td>
        <td class="mapping-cell cell-mapped">
            <input
                type="text"
                class="mapped-input"
                value="${this.escapeHtml(mappedModel)}"
                data-original="${this.escapeHtml(originalModel)}"
                placeholder="输入映射后的模型名"
            />
        </td>
        <td class="mapping-cell cell-actions">
            <button class="btn-icon delete-mapping" title="删除映射">
                ✕
            </button>
        </td>
    `;

    return row;
};

// 从表格更新映射
NewAPISyncToolV3.prototype.updateMappingFromTable = function() {
    const mappedInputs = document.querySelectorAll('#mappingTableBody .mapped-input');
    const newMapping = {};

    mappedInputs.forEach(input => {
        const originalModel = input.dataset.original;
        const mappedModel = input.value.trim();

        if (originalModel && mappedModel) {
            // 修复：映射应该是 修改后模型 -> 原始模型
            newMapping[mappedModel] = originalModel;
        }
    });

    this.modelMapping = newMapping;
    console.log('🔄 从表格更新映射:', this.modelMapping);
    this.updateMappingTableVisibility();
};

// 重置映射表格到默认状态
NewAPISyncToolV3.prototype.resetMappingTableToDefault = function() {
    const modelsTextarea = this.elements.originalModels;
    const currentModels = modelsTextarea.value.split('\n').map(m => m.trim()).filter(m => m);

    if (currentModels.length === 0) {
        this.showNotification('请先输入原始模型列表', 'warning');
        return;
    }

    // 重新填充表格（使用默认映射）
    this.populateMappingTable(currentModels);

    // 重新构建映射对象
    this.buildModelMapping(currentModels);

    this.showNotification('映射已重置为默认状态', 'success');
};

// 格式化映射表格
NewAPISyncToolV3.prototype.formatMappingTable = function() {
    const mappedInputs = document.querySelectorAll('#mappingTableBody .mapped-input');

    mappedInputs.forEach(input => {
        let value = input.value.trim();

        // 基本格式化：去除多余空格，确保有效模型名
        if (value) {
            // 去除前后空格，将内部多个空格替换为单个空格
            value = value.replace(/\s+/g, ' ').trim();

            // 确保模型名符合基本规范（字母、数字、连字符、下划线、点）
            value = value.replace(/[^a-zA-Z0-9\-_.]/g, '');

            input.value = value;
        }
    });

    // 更新映射对象
    this.updateMappingFromTable();

    this.showNotification('映射已格式化', 'success');
};

// 导入映射到表格
NewAPISyncToolV3.prototype.importMappingToTable = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const content = await this.readFile(file);
            let mappingData = {};

            if (file.name.endsWith('.json')) {
                // JSON格式导入
                mappingData = JSON.parse(content);
            } else {
                // 文本格式导入（兼容旧格式）
                const lines = content.split('\n');
                lines.forEach(line => {
                    const match = line.match(/^(.+?)\s*->\s*(.+)$/);
                    if (match) {
                        mappingData[match[1].trim()] = match[2].trim();
                    }
                });
            }

            // 更新表格中的映射值
            Object.entries(mappingData).forEach(([original, mapped]) => {
                const input = document.querySelector(`#mappingTableBody .mapped-input[data-original="${this.escapeHtml(original)}"]`);
                if (input) {
                    input.value = mapped;
                }
            });

            // 更新映射对象
            this.updateMappingFromTable();

            this.showNotification('映射配置已导入', 'success');

        } catch (error) {
            console.error('导入映射配置失败:', error);
            this.showNotification('导入失败，请检查文件格式', 'error');
        }
    };

    input.click();
};

// 从表格导出映射
NewAPISyncToolV3.prototype.exportMappingFromTable = function() {
    const mappingData = this.modelMapping;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    // 创建JSON内容
    const jsonContent = JSON.stringify(mappingData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-mapping-${timestamp}.json`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    this.showNotification('映射配置已导出', 'success');
};

// 删除映射行
NewAPISyncToolV3.prototype.deleteMappingRow = function(row) {
    if (confirm('确定要删除这个映射吗？')) {
        row.remove();

        // 更新映射对象
        this.updateMappingFromTable();

        // 更新状态显示
        this.updatePreviewStatus();

        this.showNotification('映射已删除', 'success');
    }
};

// 更新预览状态显示
NewAPISyncToolV3.prototype.updatePreviewStatus = function() {
    const statusElement = document.getElementById('previewStatus');
    const rowCount = document.querySelectorAll('#mappingTableBody .mapping-row').length;

    if (statusElement) {
        statusElement.textContent = `共 ${rowCount} 个映射`;
    }
};

// 更新映射表格可见性和空状态控制
NewAPISyncToolV3.prototype.updateMappingTableVisibility = function() {
    const tableBody = document.getElementById('mappingTableBody');
    const emptyState = document.getElementById('emptyMappingState');
    const mappingTable = document.getElementById('mappingTable');
    const rowCount = document.querySelectorAll('#mappingTableBody .mapping-row').length;

    // 更新统计信息
    this.updatePreviewStats();

    if (tableBody && emptyState && mappingTable) {
        if (rowCount === 0) {
            // 没有映射数据时显示空状态
            mappingTable.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            // 有映射数据时显示表格
            mappingTable.style.display = 'table';
            emptyState.style.display = 'none';
        }
    }
};

// HTML转义函数
NewAPISyncToolV3.prototype.escapeHtml = function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};;