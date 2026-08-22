# Data source notice / 数据来源声明

Hanji 的程序代码采用 MIT 许可；来源数据及其派生字段仍须遵守下列各自条款。转换方式与语料口径记录在每项备注中。

## Adobe Source Han Sans / Serif（CMap 资源）

- 用途：判定五地字形差异
- 来源：https://github.com/adobe-fonts/source-han-sans
- 许可：SIL OFL 1.1 (https://openfontlicense.org/)
- 备注：每套字体的五份地区 CMap 给出「码点 → CID」映射，同一字形池内 CID 相同即同一字形。判定取黑体与宋体的并集。

## Noto Sans / Noto Serif（含 CJK）

- 用途：页面展示用字体
- 来源：https://github.com/notofonts/noto-cjk
- 许可：SIL OFL 1.1 (https://openfontlicense.org/)
- 备注：汉字取自 CJK 版本，拉丁字母与数字取自拉丁版本，都按应用内用字子集化后自托管，OFL 声明随附于 /notices/noto-ofl.txt。

## OpenCC 开放中文转换

- 用途：简繁、港台异体、日本新旧字体对应
- 来源：https://github.com/BYVoid/OpenCC
- 许可：Apache-2.0 (https://www.apache.org/licenses/LICENSE-2.0)

## AnimCJK

- 用途：中、台、日、韩笔顺动画与笔画数
- 来源：https://github.com/parsimonhi/animCJK
- 许可：Arphic Public License (https://github.com/parsimonhi/animCJK/blob/master/licenses/APL/english/ARPHICPL.TXT)
- 备注：仅提取本应用字组引用的中、台、日、韩字形，保留原始笔画轮廓与中线，并按字组主键转换成32个哈希分片；动画以官方示例的轮廓裁剪方式绘制。同一字组切换地区只需一个分片；按笔画顺序排列的轮廓完全一致时仅保留第一份变体及其中线，界面也合并成一个选项。香港按本应用的Source Han字形分组复用已有数据，优先顺序为台湾、中国大陆、日本、韩国。全站的地区笔画数以所解析变体的轮廓数量为首选，没有数据时再回退到Unihan。分片由构建脚本生成至app/assets/strokes，再由Vite输出为带内容哈希的资源；随附授权通过/notices/下的稳定URL提供并要求重新验证。修改后的AnimCJK数据继续按APL提供。

## zispace/hanzi-chars

- 用途：五地标准字表
- 来源：https://github.com/zispace/hanzi-chars
- 许可：仓库未声明 (https://github.com/zispace/hanzi-chars)
- 备注：转录自各地官方规范：《通用规范汉字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）与《学年別漢字配当表》（2017）、韩国《漢文教育用基礎漢字》（2000）。

## Unicode Han Database (Unihan)

- 用途：笔画数回退、读音
- 来源：https://www.unicode.org/reports/tr38/
- 许可：Unicode License v3 (https://www.unicode.org/license.txt)

## Unicode IRG N2200（韩国教育用汉字提案）

- 用途：韩式异体对应
- 来源：https://www.unicode.org/L2/L2017/17173-irgn2200-unihan-db.pdf
- 许可：Unicode License v3 (https://www.unicode.org/license.txt)
- 备注：用于把韩国字表中跨码点的旧字形归入同一字组，包括以U+2E569编码的「衰」旧形。

## hanziDB.csv（Jun Da《现代汉语单字频率列表》）

- 用途：大陆字频排名
- 来源：https://github.com/ruddfawcett/hanziDB.csv
- 许可：MIT (https://opensource.org/licenses/MIT)

## 粵典「語料庫單字使用頻率」

- 用途：香港字频排名
- 来源：https://words.hk/faiman/analysis/charcount/
- 许可：Public Domain (https://words.hk/faiman/analysis/)
- 备注：统计粵文庫的书面粤语；本应用筛出汉字后，按出现次数重新计算从1开始的排名。数据注明为公有领域，并按发布者建议标注粵典出处。

## 国家教育研究院《民國112年語料字頻表》

- 用途：台湾字频排名
- 来源：https://teric.naer.edu.tw/wSite/ct?ctNode=645&mp=teric_b&xItem=2068770
- 许可：网站资料开放宣告（须注明出处） (https://teric.naer.edu.tw/wSite/ct?xItem=2000016&ctNode=624&mp=teric_b&idPath=588_623_624)
- 备注：附件1汇总2023年五家新闻媒体及PTT、DCard语料；本应用筛出汉字后，按字频重新计算从1开始的排名。

## scriptin/kanji-frequency（Japanese Wikipedia）

- 用途：日本字频排名
- 来源：https://scriptin.github.io/kanji-frequency/
- 许可：CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
- 备注：使用2023年1月随机抽取的10万篇日文Wikipedia文章；本应用取wikipedia_characters.csv中的汉字次数，重新计算从1开始的排名并关联到地区字形。
