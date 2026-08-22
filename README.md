# 汉智 · hanji

简体中文 | [日本語](README.ja-JP.md)

<!-- When editing this file, update README.ja-JP.md in the same change. -->

中国大陆、香港、台湾、日本、韩国五地常用汉字的字表。本站对照的是通用黑体与宋体中的印刷字形：同一个字，在各地可能呈现不同字形。这里把五地字形并排列出，默认按界面语言对应地区的字频排序，也可按笔画或码点排序，并按差异模式筛选。韩国没有字频数据，韩国列默认关闭，可在显示选项中启用。

字形只是其中一个维度。收录范围是五地常用字表的并集，**字形完全相同的字同样收录**：这是一份五地汉字的资料表，不是一份差异清单。

下面是概要，逐条的完整说明在站内的「关于」页。

## 名字的由来

「Hanji」跟汉字在各地的叫法各差一个字母：汉语拼音的 hanzi 差一个 z，日语的 kanji 差一个 k，韩语的 hanja 差一个 a——同一件东西，每个地方都改掉一点点。它同时也是闽南语「漢字」的实际读音 hàn-jī，所以并非生造词，而是又一地的读法。中文名「汉智」取其音。

## 收录范围

收录《通用规范汉字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）、韩国《漢文教育用基礎漢字》（2000）五份字表的并集。韩国字表含 1,800 个常用汉字。把简繁、日本新旧字体和韩式异体这类跨码点的对应合并成一行后，共 **8,449 行**——其中 1,695 行五地字形完全一致，129 行五地各不相同。

台湾《次常用國字表》只为已有行提供二级收录状态和候选，不参与生成新行；其 6,343 个主条目中有 3,599 个独有条目明确在产品范围之外。

## 字组与数据语义

一行表示一个字组，五列分别是大陆、香港、台湾、日本和韩国的展示形。跨码点候选主要来自 OpenCC，韩式异体采用 Unicode IRG 收录提案所列对应，并由地区字表约束：

- 某地字表把两个字分开收录时保留两个字组，例如 `着/著`、`欠/缺`；
- OpenCC 明确自包含的同字关系或五列完全相同的名称可以合并；至少有两个地区佐证的映射可作为确定的地区对应；
- 只有一个地区提供证据、而候选还属于另一字组时保守拆分，并在详情页显示双向“关系未确认”，例如 `鎗/槍`。

五列确定后才选择行名；已有中港台日证据时仍按原四地规则选择，以免新增的韩国列改变既有网址。主条目和括注收录都足以保住字组自身名称。日本旧字体也必须来自明确的 `JPShinjitaiCharacters` 关系，不能由行名与日本列不同反推。

每个地区格都有 `primary`（主条目）、`glossed`（括注异体）或 `unlisted`（未收录、显示参考形）状态。`alternatives` 只保存该地区收录且明确属于当前字组的其他形式；`aka` 只表示字组的其他名称；未确认关系只用于“另见”，不会进入搜索、网址别名、字典引用或字体集合。完整定义、构建保证和限制见 [数据规则与已知限制](docs/known-issues.md)。

## 字形差异是怎么判定的

判定使用 Adobe Source Han Sans 与 Source Han Serif，页面则用与它们同源的 Noto Sans CJK 与 Noto Serif CJK 显示结果。每套字体让中、港、台、日、韩五个地区共用一个字形池，并分别提供「Unicode 码点 → 字形编号（CID）」映射。两地映射到同一 CID，就视为同形。Adobe 已把这些映射以纯文本公开，因此不需要比对轮廓或渲染截图。

最终判定取**黑体与宋体结果的并集**：只要其中一款把两地画成同一字形，本站就按同形处理。这能排除只出现在单款字体中的设计细节。例如 Source Han Sans 为约五分之一的日本常用汉字提供独立字形，其中约两百个在 Source Han Serif 并未区分（了、人、子、水、金都在其中）；本站不把这类差异算作地区规范差异。完整取舍见 [数据规则与已知限制](docs/known-issues.md)。

页面会按这份判定重新分组：被判为同形的格子统一借用组内一个地区的 Noto 字体，使屏幕上也真正呈现同一轮廓。相应地，被上述规则过滤的地区版本细小差异不会显示。`scripts/tests/fonts.test.ts` 会用 fontkit 取出生成字体的真实轮廓，逐字验证判定与画面显示一致。

## 局限

- 本站只比较通用黑体与宋体中的印刷字形，不涵盖手写习惯，也不以教科书体的示范字形为准。日语教科书体主要为日语教学设计，并没有与中、港、台、韩共享同一字形池的正式地区版本；若拼接风格相近但来源不同的字体，地区差异与字体自身的设计差异就无法分开。为了控制变量，本站只能选用同时提供五地版本的同源字体系列。
- 判定的对象是 Source Han 的地区字形设计，不是各地标准本身。它是个高质量的代理——Adobe 的地区字形分别依据大陆《印刷通用汉字字形表》、台湾教育部《國字標準字體》、香港教育局《常用字字形表》、日本 JIS X 0208/0213、韩国 KS X 1001/1002。
- Source Han 的香港字形覆盖并不完整，「只有香港不同」这一类可能少报。
- 笔画数逐地区取：先看 Unihan 的 `kAlternateTotalStrokes`，日本再退到 `kRSAdobe_Japan1_6`（它分析的是 Adobe-Japan1-6 收的日本字形，所以 突 是 8 画而不是 9 画），都没有才用 `kTotalStrokes`。后者只区分简繁两档，港台日韩通常共用繁体值；例如 那 的五列笔画数是 6/6/6/7/6。
- 韩语读音取 Unihan 推荐的 `kHangul`，保留全部现代韩文单字音；它不根据词语语境替用户选择读音，也不另行推导头音法则。
- 未收录格显示的是传承参考形，不表示该地区实际采用或规范收录该形；“关系未确认”同样表示现有公开来源不足以裁决。

完整的数据规则与构建保证见 [docs/known-issues.md](docs/known-issues.md)。

## 声明

本站是基于公开资料制作的字形对照工具，不是各地的规范、词典或教学材料。页面展示的是本站采用的数据与自动规则所得的结果，不能据此断定某个字在当地只有这一种“正确”形式。

各地规范的适用范围和定义并不完全相同，字体也只是规范的一种设计实现。本站会整理、转换并合并不同来源的数据，也会为未收录项补上参考字形；这些都是工程取舍，难免带来简化、遗漏与错误。

页面中的“同形”或“不同”只在上述资料、字体与规则内成立；地区的排列与分组只为方便对照，不表示优劣或立场。正式场合请以原始规范与词典为准；每个字的详情页都列有相应地区的字典链接。汉字数量巨大，出错难免，发现数据有误请提 [issue](https://github.com/sxzz/hanji/issues)。

## 开发

```bash
pnpm install
pnpm build:data   # 生成字表与字体子集，首次会下载约 215MB 原始数据，之后走缓存
pnpm update:sources # 检查并锁定新版第三方数据；有变化时下载并重新生成
pnpm dev
pnpm test
pnpm generate     # 静态站点
```

每一行的地址是它的行名（`/char/着`）。五地展示形、`aka` 和 `alternatives` 也可作为地址，由客户端跳到所属的行——例如 `/char/国`、`/char/郞`、`/char/缐`，页面用 `rel=canonical` 指回行名地址；未确认关系不是地址别名。

字表 `public/data/chars.json` 提交在仓库里，也是站点的开放数据地址 `/data/chars.json`。字体子集约 12MB，**不提交**，由 `pnpm build:data` 生成——所以构建前必须先跑一次。原始下载缓存在 `data/raw/` 下按类别存放（`charlist/`、`opencc/`、`cmap/`、`font/`、`unihan/`、`frequency/`），已 gitignore。

## 部署

静态站点，`.output/public` 直接丢给任意静态托管即可。线上部署由 [GitHub Actions](.github/workflows/deploy.yml) 构建后直传 Cloudflare Workers Static Assets：

- `main` 的 push 部署到 production；
- 指向 `main` 的 PR 通过 `wrangler versions upload` 部署到 `pr-<编号>` preview alias，GitHub 会在 PR 中显示对应的 deployment 与访问地址，后续提交沿用同一个预览地址。

仓库需要配置两个 Actions secrets：

- `CLOUDFLARE_API_TOKEN`：具有 Workers 脚本编辑权限的 API token；
- `CLOUDFLARE_ACCOUNT_ID`：Worker 所在的 Cloudflare account ID。

仓库不绑定 production 域名；请在 Cloudflare 的 **Settings → Domains & Routes** 中自行连接。`wrangler.json` 只描述 Static Assets 的托管行为，并关闭 production `workers.dev` 地址；PR preview URL 仍保持开启。配置没有 Worker 脚本、Assets binding 或 `run_worker_first`，所以请求不会产生 Worker invocation。

每个字组详情页都会生成独立 HTML；页面数据在本地 bundle 中，因此关闭了每路由额外生成 `_payload.json` 的 payload extraction。地区异体别名不另外生成跳转页：它先由 Static Assets 返回 `404.html` 和 HTTP 404，再由 Nuxt 客户端中间件跳到所属行；搜索引擎不会把 alias 当作成功页面重复收录。真正未知的地址保持 HTTP 404；`public/_headers` 给带内容哈希的 `_nuxt/*` 设了长缓存。

第三方资产的具体 commit、官方附件标识与 SHA-256 记录在 `data/sources.lock.json`；需要升级时运行 `pnpm update:sources`。它会解析有版本上游的版本号，并重新校验没有版本号的官方直链；内容有变化时更新 lockfile 并直接重新生成数据，完全未变则跳过生成。构建时 `pnpm build:data` 会按 lockfile 下载并校验约 **215 MB** 原始数据（其中 195 MB 是十份 Noto CJK 字体）；任何未显式更新的直链内容变化都会因校验和不符而失败，不会静默进入数据。Actions 分开缓存原始下载与生成字体：前者只由 lockfile 决定，后者由 lockfile、实际生成脚本、相关依赖、locale 与字表决定；字体输入完全不变时跳过数据生成。

本地也可构建后直传：

```bash
pnpm build:data && pnpm generate
pnpm preview:worker # http://localhost:8787
pnpm deploy
```

## 数据来源

<!-- sources:start -->

| 用途                             | 来源                                                                                                            | 许可                                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 判定五地字形差异                 | [Adobe Source Han Sans / Serif（CMap 资源）](https://github.com/adobe-fonts/source-han-sans)                    | [SIL OFL 1.1](https://openfontlicense.org/)                                                                                 |
| 页面展示用字体                   | [Noto Sans / Noto Serif（含 CJK）](https://github.com/notofonts/noto-cjk)                                       | [SIL OFL 1.1](https://openfontlicense.org/)                                                                                 |
| 简繁、港台异体、日本新旧字体对应 | [OpenCC 开放中文转换](https://github.com/BYVoid/OpenCC)                                                         | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)                                                                   |
| 日本字形笔顺动画                 | [KanjiVG](https://kanjivg.tagaini.net/)                                                                         | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)                                                             |
| 五地标准字表                     | [zispace/hanzi-chars](https://github.com/zispace/hanzi-chars)                                                   | [仓库未声明](https://github.com/zispace/hanzi-chars)                                                                        |
| 笔画数、读音                     | [Unicode Han Database (Unihan)](https://www.unicode.org/reports/tr38/)                                          | [Unicode License v3](https://www.unicode.org/license.txt)                                                                   |
| 韩式异体对应                     | [Unicode IRG N2200（韩国教育用汉字提案）](https://www.unicode.org/L2/L2017/17173-irgn2200-unihan-db.pdf)        | [Unicode License v3](https://www.unicode.org/license.txt)                                                                   |
| 大陆字频排名                     | [hanziDB.csv（Jun Da《现代汉语单字频率列表》）](https://github.com/ruddfawcett/hanziDB.csv)                     | [MIT](https://opensource.org/licenses/MIT)                                                                                  |
| 香港字频排名                     | [粵典「語料庫單字使用頻率」](https://words.hk/faiman/analysis/charcount/)                                       | [Public Domain](https://words.hk/faiman/analysis/)                                                                          |
| 台湾字频排名                     | [国家教育研究院《民國112年語料字頻表》](https://teric.naer.edu.tw/wSite/ct?ctNode=645&mp=teric_b&xItem=2068770) | [网站资料开放宣告（须注明出处）](https://teric.naer.edu.tw/wSite/ct?xItem=2000016&ctNode=624&mp=teric_b&idPath=588_623_624) |
| 日本字频排名                     | [scriptin/kanji-frequency（Japanese Wikipedia）](https://scriptin.github.io/kanji-frequency/)                   | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)                                                                   |

<!-- sources:end -->

原始规范出处：《通用规范汉字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）与《学年別漢字配当表》（2017）、韩国《漢文教育用基礎漢字》（2000）。

逐字对照工具 [tofu.tools](https://tofu.tools/) 是本项目的先行者，同样用 Noto 系列区分地区字形。

字体为 Noto Sans CJK 与 Noto Serif CJK（SIL OFL 1.1）按本站用字子集化后的产物，声明随附于 `/fonts/OFL.txt`。生成的数据文件派生自上述来源，请遵守各自许可；逐项转换方式与署名也写入公开的 [`/data/NOTICE.md`](public/data/NOTICE.md)。

## License

[MIT](LICENSE) © [Kevin Deng](https://github.com/sxzz)
