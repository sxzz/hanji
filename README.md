# 汉智 · hanji

中国大陆、香港、台湾、日本四地常用汉字的字表。同一个字，各地写出来常常不一样——这里把四地写法并排列出，可按笔画、常用度排序，按差异模式筛选。

字形只是其中一个维度。收录范围是四地常用字表的并集，**写法完全相同的字同样收录**：这是一份四地汉字的资料表，不是一份差异清单。

下面是概要，逐条的完整说明在站内的「关于」页。

## 名字的由来

「Hanji」跟汉字在各地的叫法各差一个字母：汉语拼音的 hanzi 差一个 z，日语的 kanji 差一个 k，韩语的 hanja 差一个 a——同一件东西，每个地方都改掉一点点。它同时也是闽南语「漢字」的实际读音 hàn-jī，所以并非生造词，而是又一地的读法。中文名「汉智」取其音。

## 收录范围

收录《通用规范汉字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）四份字表的并集，把简繁、日本新旧字体这类跨码点的对应合并成一行，共 **8,446 行**——其中 1,706 行四地写法完全一致，596 行四地各不相同。什么算一个字组、哪些字曾被误并，见 [docs/known-issues.md](docs/known-issues.md)。

## 字形差异是怎么判定的

Source Han Sans 与 Source Han Serif 各自的五个地区共享同一个字形池，每个地区有一份「码点 → CID」映射，Adobe 以纯文本形式公开在仓库里。同一个池子里 CID 相同就是同一个字形，所以比对四份映射就能判断四地把一个字写成了几种样子——不需要比对轮廓，也不需要渲染截图。

判定取**两种字体的并集**：只要黑体或宋体之中有任意一方认为两地同形，就算同形。因为 Source Han Sans 给日本单独画了约五分之一常用字的字形，其中两百来个宋体并没有跟着分（了、人、子、水、金都在其中）——只有一种字体作出的区分是那套字体的设计取舍，不是地区规范的差异。来龙去脉见 [docs/known-issues.md](docs/known-issues.md)。

`scripts/tests/fonts.test.ts` 会用 fontkit 打开生成的子集字体、取出真实轮廓，验证判定结果与字体真正画出来的形状逐字一致，并确认被判为同形的格子确实画出同一条轮廓。

## 局限

- 判定的对象是 Source Han 的地区字形设计，不是各地标准本身。它是个高质量的代理——Adobe 的地区字形分别依据大陆《印刷通用汉字字形表》、台湾教育部《國字標準字體》、香港教育局《常用字字形表》、日本 JIS X 0208/0213。
- Source Han 的香港字形覆盖并不完整，「只有香港不同」这一类可能少报。
- 笔画数逐地区取：先看 Unihan 的 `kAlternateTotalStrokes`，日本再退到 `kRSAdobe_Japan1_6`（它分析的是 Adobe-Japan1-6 收的日本字形，所以 突 是 8 画而不是 9 画），都没有才用 `kTotalStrokes`。于是日本那列常与其余三地不同，其中约五分之一其实字形一模一样、只是数法不同（那 6/6/6/7）。
- 跨码点的对应关系来自 OpenCC。它的异体表混着「异体」与「代用」两种关系，后者反查会把一个现行汉字吞进别的行——现在的判据是「某地区的字表分开收录了这两个字就不归并」，靠各地字表自己判，不维护例外清单。
- OpenCC 与各地规范字表冲突时，以规范字表为准：臺灣《常用國字標準字體表》收 脣、祕，而 OpenCC 把它们转成 唇、秘，那两列就写规范表的形。

逐条排查记录见 [docs/known-issues.md](docs/known-issues.md)。

## 声明

这里的数据不是权威数据。汉字的收录、字形、笔画、读音，各地标准之间本来就有分歧，也不存在一份能让所有人满意的数据。

为了不让这里变成一个需要长期人工维护的字表，本项目尽量贴着已有的公共数据走——Unicode Unihan、各地文化教育主管部门发布的规范字表、Adobe 与 Google 公开的字体资源——原样取用。判定规则都写在上面，没有个人取舍，也不代表任何立场。

正式场合请以原始规范与词典为准；每个字的详情页都列了该地区自己的字典，可以逐条对照。汉字数量巨大，出错难免，发现数据有误请提 [issue](https://github.com/sxzz/hanji/issues)。

## 开发

```bash
pnpm install
pnpm build:data   # 生成字表与字体子集，首次会下载约 170MB 原始数据，之后走缓存
pnpm dev
pnpm test
pnpm generate     # 静态站点
```

每一行的地址是它的正字（`/char/着`）。其他地区写的那个字也是可用地址，302 跳到所属的行——`/char/著`、`/char/国` 都能打开，页面用 `rel=canonical` 指回正字那个地址。

字表 `public/data/chars.json` 提交在仓库里，也是站点的开放数据地址 `/data/chars.json`。字体子集约 12MB，**不提交**，由 `pnpm build:data` 生成——所以构建前必须先跑一次。原始下载缓存在 `data/raw/` 下按类别存放（`charlist/`、`opencc/`、`cmap/`、`font/`、`unihan/`、`frequency/`），已 gitignore。

## 数据来源

<!-- sources:start -->
| 用途 | 来源 | 许可 |
| --- | --- | --- |
| 判定四地字形差异 | [Adobe Source Han Sans / Serif（CMap 资源）](https://github.com/adobe-fonts/source-han-sans) | [SIL OFL 1.1](https://openfontlicense.org/) |
| 页面展示用字体 | [Noto Sans CJK / Noto Serif CJK](https://github.com/notofonts/noto-cjk) | [SIL OFL 1.1](https://openfontlicense.org/) |
| 简繁、港台异体、日本新旧字体对应 | [OpenCC 开放中文转换](https://github.com/BYVoid/OpenCC) | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) |
| 四地标准字表 | [zispace/hanzi-chars](https://github.com/zispace/hanzi-chars) | [仓库未声明](https://github.com/zispace/hanzi-chars) |
| 笔画数、读音 | [Unicode Han Database (Unihan)](https://www.unicode.org/reports/tr38/) | [Unicode License v3](https://www.unicode.org/license.txt) |
| 大陆字频排名 | [hanziDB.csv（Jun Da《现代汉语单字频率列表》）](https://github.com/ruddfawcett/hanziDB.csv) | [MIT](https://opensource.org/licenses/MIT) |
<!-- sources:end -->

原始规范出处：《通用规范汉字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）与《学年別漢字配当表》（2017）。

逐字对照工具 [tofu.tools](https://tofu.tools/) 是本项目的先行者，同样用 Noto 系列区分四地字形。

字体为 Noto Sans CJK 与 Noto Serif CJK（SIL OFL 1.1）按本站用字子集化后的产物，声明随附于 `/fonts/OFL.txt`。生成的数据文件派生自上述来源，请遵守各自许可。

## License

[MIT](LICENSE) © [Kevin Deng](https://github.com/sxzz)
