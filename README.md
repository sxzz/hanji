# 汉智 · hanji

中国大陆、香港、台湾、日本、韩国五地常用汉字的字表。同一个字，各地写出来常常不一样——这里把五地写法并排列出，可按笔画、常用度排序，按差异模式筛选。韩国列默认关闭，可在显示选项中启用。

字形只是其中一个维度。收录范围是五地常用字表的并集，**写法完全相同的字同样收录**：这是一份五地汉字的资料表，不是一份差异清单。

下面是概要，逐条的完整说明在站内的「关于」页。

## 名字的由来

「Hanji」跟汉字在各地的叫法各差一个字母：汉语拼音的 hanzi 差一个 z，日语的 kanji 差一个 k，韩语的 hanja 差一个 a——同一件东西，每个地方都改掉一点点。它同时也是闽南语「漢字」的实际读音 hàn-jī，所以并非生造词，而是又一地的读法。中文名「汉智」取其音。

## 收录范围

收录《通用规范汉字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）、韩国《漢文教育用基礎漢字》（2000）五份字表的并集。韩国字表含 1,800 个常用汉字。把简繁、日本新旧字体和韩式异体这类跨码点的对应合并成一行后，共 **8,449 行**——其中 1,695 行五地写法完全一致，129 行五地各不相同。

台湾《次常用國字表》只为已有行提供二级收录状态和候选，不参与生成新行；其 6,343 个主条目中有 3,599 个独有条目明确在产品范围之外。

## 字组与数据语义

一行表示一个字组，五列分别是大陆、香港、台湾、日本和韩国的展示形。跨码点候选主要来自 OpenCC，韩式异体采用 Unicode IRG 收录提案所列对应，并由地区字表约束：

- 某地字表把两个字分开收录时保留两个字组，例如 `着/著`、`欠/缺`；
- OpenCC 明确自包含的同字关系或五列完全相同的名称可以合并；至少有两个地区佐证的映射可作为确定的地区对应；
- 只有一个地区提供证据、而候选还属于另一字组时保守拆分，并在详情页显示双向“关系未确认”，例如 `鎗/槍`。

五列确定后才选择行名；已有中港台日证据时仍按原四地规则选择，以免新增的韩国列改变既有网址。主条目和括注收录都足以保住字组自身名称。日本旧字体也必须来自明确的 `JPShinjitaiCharacters` 关系，不能由行名与日本列不同反推。

每个地区格都有 `primary`（主条目）、`glossed`（括注异体）或 `unlisted`（未收录、显示参考形）状态。`alternatives` 只保存该地区收录且明确属于当前字组的其他形式；`aka` 只表示字组的其他名称；未确认关系只用于“另见”，不会进入搜索、网址别名、字典引用或字体集合。完整定义、构建保证和限制见 [数据规则与已知限制](docs/known-issues.md)。

## 字形差异是怎么判定的

Source Han Sans 与 Source Han Serif 各自的五个地区共享同一个字形池，每个地区有一份「码点 → CID」映射，Adobe 以纯文本形式公开在仓库里。同一个池子里 CID 相同就是同一个字形，所以比对五份映射就能判断五地把一个字写成了几种样子——不需要比对轮廓，也不需要渲染截图。

判定取**两种字体的并集**：只要黑体或宋体之中有任意一方认为两地同形，就算同形。因为 Source Han Sans 给日本单独画了约五分之一常用字的字形，其中两百来个宋体并没有跟着分（了、人、子、水、金都在其中）——只有一种字体作出的区分是那套字体的设计取舍，不是地区规范的差异。完整取舍见 [数据规则与已知限制](docs/known-issues.md)。

`scripts/tests/fonts.test.ts` 会用 fontkit 打开生成的子集字体、取出真实轮廓，验证判定结果与字体真正画出来的形状逐字一致，并确认被判为同形的格子确实画出同一条轮廓。

## 局限

- 判定的对象是 Source Han 的地区字形设计，不是各地标准本身。它是个高质量的代理——Adobe 的地区字形分别依据大陆《印刷通用汉字字形表》、台湾教育部《國字標準字體》、香港教育局《常用字字形表》、日本 JIS X 0208/0213、韩国 KS X 1001/1002。
- Source Han 的香港字形覆盖并不完整，「只有香港不同」这一类可能少报。
- 笔画数逐地区取：先看 Unihan 的 `kAlternateTotalStrokes`，日本再退到 `kRSAdobe_Japan1_6`（它分析的是 Adobe-Japan1-6 收的日本字形，所以 突 是 8 画而不是 9 画），都没有才用 `kTotalStrokes`。后者只区分简繁两档，港台日韩通常共用繁体值；例如 那 的五列笔画数是 6/6/6/7/6。
- 韩语读音取 Unihan 推荐的 `kHangul`，保留全部现代韩文单字音；它不根据词语语境替用户选择读音，也不另行推导头音法则。
- 未收录格显示的是传承参考形，不表示该地区实际采用或规范收录该形；“关系未确认”同样表示现有公开来源不足以裁决。

完整的数据规则与构建保证见 [docs/known-issues.md](docs/known-issues.md)。

## 声明

这里的数据不是权威数据。汉字的收录、字形、笔画、读音，各地标准之间本来就有分歧，也不存在一份能让所有人满意的数据。

为了不让这里变成一个需要长期人工维护的字表，本项目尽量贴着已有的公共数据走——Unicode Unihan、各地文化教育主管部门发布的规范字表、Adobe 与 Google 公开的字体资源——原样取用。判定规则都写在上面，没有个人取舍，也不代表任何立场。

正式场合请以原始规范与词典为准；每个字的详情页都列了该地区自己的字典，可以逐条对照。汉字数量巨大，出错难免，发现数据有误请提 [issue](https://github.com/sxzz/hanji/issues)。

## 开发

```bash
pnpm install
pnpm build:data   # 生成字表与字体子集，首次会下载约 211MB 原始数据，之后走缓存
pnpm update:sources # 检查并锁定新版第三方数据；有变化时下载并重新生成
pnpm dev
pnpm test
pnpm generate     # 静态站点
```

每一行的地址是它的行名（`/char/着`）。五地展示形、`aka` 和 `alternatives` 也可作为地址，由客户端跳到所属的行——例如 `/char/国`、`/char/郞`、`/char/缐`，页面用 `rel=canonical` 指回行名地址；未确认关系不是地址别名。

字表 `public/data/chars.json` 提交在仓库里，也是站点的开放数据地址 `/data/chars.json`。字体子集约 12MB，**不提交**，由 `pnpm build:data` 生成——所以构建前必须先跑一次。原始下载缓存在 `data/raw/` 下按类别存放（`charlist/`、`opencc/`、`cmap/`、`font/`、`unihan/`、`frequency/`），已 gitignore。

## 部署

静态站点，`.output/public` 直接丢给任意静态托管即可。线上部署由 [GitHub Actions](.github/workflows/deploy.yml) 构建后直传 Cloudflare Pages：

- `main` 的 push 部署到 production；
- 指向 `main` 的 PR 部署到 `pr-<编号>` preview，GitHub 会在 PR 中显示对应的 deployment 与访问地址，后续提交沿用同一个分支预览地址。

仓库需要配置三个 Actions secrets：

- `CLOUDFLARE_API_TOKEN`：具有 `Account / Cloudflare Pages / Edit` 权限的 API token；
- `CLOUDFLARE_ACCOUNT_ID`：Pages 项目所在的 Cloudflare account ID；
- `CLOUDFLARE_PROJECT_NAME`：Cloudflare Pages 项目名。

Cloudflare Pages 的 production branch 设为 `main`。在项目的 **Settings → Builds → Branch control** 中关闭 **Enable automatic production branch deployments**，并将 **Preview branch** 设为 **None**；Cloudflare 只托管 Actions 上传的成品，不再自行构建。

全部 8,449 个字组详情页都会生成独立 HTML；页面数据在本地 bundle 中，因此关闭了每路由额外生成 `_payload.json` 的 payload extraction。地区异体别名也不另外生成跳转页，而是通过 `public/_redirects` 回到应用后由客户端跳转。同一条回退规则也让应用显示未知字符的 404；`public/_headers` 给带内容哈希的 `_nuxt/*` 设了长缓存。

第三方资产的具体 commit、Unicode 版本与 SHA-256 记录在 `data/sources.lock.json`；需要升级时运行 `pnpm update:sources`。它会解析上游版本，版本有变化时下载变化的固定版本、更新 lockfile，并直接重新生成数据；版本未变则跳过下载与生成。构建时 `pnpm build:data` 会按 lockfile 下载并校验约 **211 MB** 原始数据（其中 195 MB 是十份 Noto CJK 字体）。Actions 分开缓存原始下载与生成字体：前者只由 lockfile 决定，后者由 lockfile、实际生成脚本、相关依赖、locale 与字表决定；字体输入完全不变时跳过数据生成。

本地也可构建后直传：

```bash
pnpm build:data && pnpm generate
pnpm wrangler pages deploy .output/public --project-name="$CLOUDFLARE_PROJECT_NAME"
```

## 数据来源

<!-- sources:start -->

| 用途                             | 来源                                                                                                     | 许可                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 判定五地字形差异                 | [Adobe Source Han Sans / Serif（CMap 资源）](https://github.com/adobe-fonts/source-han-sans)             | [SIL OFL 1.1](https://openfontlicense.org/)                     |
| 页面展示用字体                   | [Noto Sans / Noto Serif（含 CJK）](https://github.com/notofonts/noto-cjk)                                | [SIL OFL 1.1](https://openfontlicense.org/)                     |
| 简繁、港台异体、日本新旧字体对应 | [OpenCC 开放中文转换](https://github.com/BYVoid/OpenCC)                                                  | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)       |
| 日本字形笔顺动画                 | [KanjiVG](https://kanjivg.tagaini.net/)                                                                  | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| 五地标准字表                     | [zispace/hanzi-chars](https://github.com/zispace/hanzi-chars)                                            | [仓库未声明](https://github.com/zispace/hanzi-chars)            |
| 笔画数、读音                     | [Unicode Han Database (Unihan)](https://www.unicode.org/reports/tr38/)                                   | [Unicode License v3](https://www.unicode.org/license.txt)       |
| 韩式异体对应                     | [Unicode IRG N2200（韩国教育用汉字提案）](https://www.unicode.org/L2/L2017/17173-irgn2200-unihan-db.pdf) | [Unicode License v3](https://www.unicode.org/license.txt)       |
| 大陆字频排名                     | [hanziDB.csv（Jun Da《现代汉语单字频率列表》）](https://github.com/ruddfawcett/hanziDB.csv)              | [MIT](https://opensource.org/licenses/MIT)                      |

<!-- sources:end -->

原始规范出处：《通用规范汉字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）与《学年別漢字配当表》（2017）、韩国《漢文教育用基礎漢字》（2000）。

逐字对照工具 [tofu.tools](https://tofu.tools/) 是本项目的先行者，同样用 Noto 系列区分地区字形。

字体为 Noto Sans CJK 与 Noto Serif CJK（SIL OFL 1.1）按本站用字子集化后的产物，声明随附于 `/fonts/OFL.txt`。生成的数据文件派生自上述来源，请遵守各自许可。

## License

[MIT](LICENSE) © [Kevin Deng](https://github.com/sxzz)
