A personalized visa eligibility assessment tool for Chinese passport holders. Select your destination, visa type, and personal background, and visafold generates a tailored assessment based on your travel history, financial support, education, itinerary, and other key factors.

Covers Japan, South Korea, Singapore, the United States, the United Kingdom, Australia, New Zealand, and the Schengen Area. Supports tourist visas, working holiday visas, and work visas for applicants with an existing job offer.

## 当前版本：申请准备指引

中文、全选项、无注册、无证件上传。报告分为资格初筛、材料自报准备、递交路径、准备建议和官方来源；不提供获签概率或无数据依据的匹配度分数。打工度假按适用项目开放，已有Offer不能代替工作许可资格。29个申根成员国可分别选择。

### 本地使用与发布

```sh
python3 -m http.server 4173
```

浏览器打开 `http://localhost:4173`。静态托管以根目录发布，无需构建。运行必需文件：`index.html`、`styles.css`、`app.js`、`policy-data.js`、`visa-engine.js`。`tests/`、`scripts/`、`research/` 不参与页面运行。

### 问卷与缓存

- 年龄选项为“18–22、22–29、30岁及以上”。第一档对应18周岁至未满22周岁，已满22周岁选第二档。新加坡25岁、新西兰30岁等边界追加精确选项。
- 户籍、常住地、递交地及居住依据分别询问，不按户籍推测获签难度；未核验领区不会被自动指定。
- 按身份、资助、居住情况、目的地和类别生成材料表。准备进度只统计自报“已准备”，未经文件审核。
- 旧版分数缓存不再复用。切换目的地／类型清理不适用的旧答案；结果页可修改并重新计算。
- PNG和文字导出包含完整限制、材料、建议与来源，不截掉后面的风险。

### 政策维护

`policy-data.js` 保存官方来源、核验日期和具体范围；`visa-engine.js` 执行资格判断及清单规则；`app.js` 处理选项、校验、缓存和导出。

核验依据保存在 `research/rule-review.json`（2026-11-18）；早期记录为 `research/official-sources.json`。HTTP读取成功不等于规则已经核验，动态空壳和官方首页也不能代替实际类别原文。

维护步骤：

1. `python3 scripts/review_sources.py` 获取官方页面快照，需要网络。脚本仅更新快照，不自动改规则。
2. 阅读对应类别、护照及领区原文，核对有效日期与例外。
3. 在 `policy-data.js` 更新规则范围与 `reviewedAt`；必要时同步修改引擎和选项。
4. 运行测试、检查未知和不适用场景后再发布。

日本、韩国、美国部分页面限制读取；澳大利亚部分内容为动态页面。相关具体规则保留待核验，不能宣传为完整政策都已确认。各申根国家入口也不代表国家工作、材料和领区规则都已逐项核验。网站没有实时名额、自动政策更新、订单或兑换码验证。

主视觉图片与字体仍使用外部资源；问卷、规则和报告生成不依赖外部API。面向大陆用户发布时可进一步将视觉资源本地化。

### 验证

规则测试只需Node.js：

```sh
node --test tests/visa-engine.test.cjs
```

在4173端口启动服务并具备Playwright、Chrome后：

```sh
node tests/browser.cjs
```

可用 `PLAYWRIGHT_MODULE` 指定已有模块路径，`CHROME_PATH` 指定Chrome可执行文件。覆盖必填、无输入框、导航、刷新恢复、修改后重新计算、动态材料、导出、免签、申根规则、工作假期年龄边界与手机布局。

仅供申请准备参考，不代表使领馆或移民部门，不保证签证或入境，最终以递交时具体类别及受理机构官方要求为准。
