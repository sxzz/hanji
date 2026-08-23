import { BRAND_DESCRIPTION, BRAND_SLOGAN } from '../../shared/brand.ts'

export const zhCN = {
  meta: {
    title: '汉智',
    name: 'Hanji',
    slogan: BRAND_SLOGAN,
    description: BRAND_DESCRIPTION,
  },
  region: {
    cn: { short: '中', full: '中国大陆' },
    hk: { short: '港', full: '香港' },
    tw: { short: '台', full: '台湾' },
    jp: { short: '日', full: '日本' },
    kr: { short: '韩', full: '韩国' },
    old: {
      short: '旧',
      full: '日本旧字体',
      description:
        '“旧”表示日本旧字体，即日本在制定新字体前使用的传统汉字字体。',
      wikipedia: '在Wikipedia上了解旧字体',
    },
  },
  hero: {
    title: '一个汉字{n}种字形',
    // The standfirst is assembled from these: see HeroOverprint's `body`.
    same: '{regions}字形完全相同。',
    allDiffer: '{regions}字形各不相同。',
    mixed: '{parts}。',
    share: '{regions}同形',
    only: '只有{region}字形不同',
    rest: '{regions}字形各不相同',
    join: '，',
    split: '拆开看',
    merge: '叠回去',
    field: '要对照的汉字',
    fieldHint: '点汉字输入任意汉字',
    missing: '「{char}」不在字表里',
    detail: '查看详情',
  },
  nav: {
    about: '关于',
    github: 'GitHub仓库',
    theme: '切换深浅色',
    back: '返回字表',
    options: '显示选项',
    logoMenu: 'Logo菜单',
    logoMenuHint: '右键打开Logo菜单',
    copyLogo: '复制Logo',
    copyingLogo: '正在复制…',
    logoCopied: '已复制Logo',
    copyLogoFailed: '复制失败，请重试',
    logoFormat: '矢量SVG',
    downloadLogo: '下载SVG',
    brandCopyright: '版权与鸣谢',
  },
  error: {
    notFoundTitle: '这一页不在字表里',
    notFoundDescription:
      '链接可能已经更改，或地址有误。你可以返回字表，继续查找和对照汉字。',
    genericTitle: '这一页暂时打不开',
    genericDescription: '页面遇到了问题。请重新载入，或返回字表继续浏览。',
    home: '返回字表',
    back: '返回上一页',
    reload: '重新载入',
  },
  options: {
    title: '显示选项',
    language: '界面语言',
    flags: '用旗帜显示地区',
    flagsHint: '把「中日港台韩」换成对应的旗帜符号。',
    outline: '叠印用空心字',
    outlineHint:
      '去掉叠印字形的半透明填充，只保留各层轮廓，复杂字的重叠关系更容易分辨。',
    columns: '对照范围',
    columnsHint: '关掉的一列不再出现，其余字形重新分组。',
    columnsLast: '至少要留一个地区。',
  },
  style: {
    label: '字体',
    sans: '黑',
    serif: '宋',
    sansFull: '黑体',
    serifFull: '宋体',
  },
  filter: {
    dimension: '比较',
    glyph: '字形',
    cp: '码点',
    glyphHint: '比较印刷字形。五地使用同一码点而字形不同，也算有差异。',
    cpHint: '只按Unicode码点比较。骨这类同码点异字形的字会归为相同。',
    search: '搜索',
    searchPlaceholder: '汉字 / 读音 / U+9AA8',
    strokes: '笔画',
    strokeMin: '最少笔画',
    strokeMax: '最多笔画',
    common: '常用于',
    pattern: '差异模式',
    tier: '收录于',
    variety: '{n}种字形',
    identical: '{n}地同形',
    clear: '清空筛选',
    matched: '{n}字',
  },
  sort: {
    label: '排序',
    strokes: '笔画',
    cp: '码点',
    freq: '字频',
    freqRegion: '字频地区',
    asc: '正序',
    desc: '倒序',
  },
  table: {
    scroll: '字表，可左右滚动',
    old: '旧',
    empty: '没有符合条件的字。放宽笔画范围，或换一个差异模式。',
    page: '第{page}/{total}页',
    prev: '上一页',
    next: '下一页',
    showAll: '显示全部{n}字',
    paginate: '分页显示',
  },
  char: {
    codePoint: 'Unicode码点',
    strokes: '笔画',
    freq: '字频',
    reading: '读音',
    mandarin: '普通话',
    cantonese: '粤语',
    on: '日语音读',
    kun: '日语训读',
    korean: '韩语',
    listed: '收录',
    variety: '有{n}种字形',
    identical: '字形一致',
    onePicked: '只选了一列，没有可比较的对象',
    also: '另见',
    alsoOut: '{region}用字「{char}」另有条目',
    alsoIn: '也是「{char}」的{region}用字',
    alsoUncertain: '「{char}」在{region}的对应关系尚未确认',
    glossed: '括注异体',
    unlistedFallback: '未收录 · 显示参考字形',
    stacked: '叠印',
    split: '并排',
    strokeOrder: '笔顺',
    strokeHint: '连续播放，也可前后单步查看。',
    strokePlay: '播放',
    strokePause: '暂停',
    strokeReplay: '重播',
    strokePrevious: '上一笔',
    strokeNext: '下一笔',
    strokeSpeed: '速度',
    strokeProgress: '第{current}/{total}笔',
    strokeDiagram: '「{char}」的笔顺动画，共{total}笔',
    strokeSteps: '「{char}」的笔顺步骤图，共{total}笔',
    strokeLoading: '正在载入笔顺…',
    strokeError: '笔顺暂时无法载入。',
    strokeRetry: '重试',
    strokeSource: '笔画数据',
    dict: '外部字典',
    tierCn: { 1: '一级字', 2: '二级字', 3: '三级字' },
    tierTw: { 1: '常用国字', 2: '次常用国字' },
    tierHk: { 1: '常用字' },
    tierJp: { 1: '常用汉字', 2: '教育汉字' },
    tierKr: { 1: '教育用基础汉字' },
  },
  about: {
    title: '关于',
    nameTitle: '名字的由来',
    name1:
      '「Hanji」跟汉字在各地的叫法各差一个字母：汉语拼音的hanzi差一个z，日语的kanji差一个k，韩语的hanja差一个a。同一件东西，每个地方都改掉一点点——这正是这个应用在讲的事。',
    name2:
      '它同时也是闽南语「漢字」的实际读音hàn-jī，所以它并不是凭空造出来的词，而是又一地的读法。中文名「汉智」取其音。',
    methodTitle: '字形差异是怎么判定的',
    scopeTitle: '收录范围',
    sourcesTitle: '数据来源',
    limitTitle: '这份数据的局限',
    noticeTitle: '声明',
    thanksTitle: '鸣谢',
    dataTitle: '取用数据',
    licenseTitle: '许可与名称',
    brandAssetsTitle: 'Logo与品牌素材',
    use: '用途',
    source: '来源',
    license: '许可',
    method1:
      '判定依据Adobe Source Han Sans与Source Han Serif；页面则使用与它们同源的Noto Sans CJK与Noto Serif CJK显示结果。每套字体让中、港、台、日、韩五个地区共用一个字形池，并分别提供「Unicode码点→字形编号（CID）」映射。两地映射到同一CID，就视为同形。',
    method2:
      '最终判定取黑体与宋体结果的并集：只要其中一款把两地画成同一字形，本应用就按同形处理。这能排除只出现在单款字体中的设计细节。例如Source Han Sans为约五分之一的日本常用汉字提供独立字形，其中约两百个在Source Han Serif并未区分，像了、人、子、水、金；本应用不把这类差异算作地区规范差异。',
    method3:
      '页面会按这份判定重新分组：被判为同形的格子统一借用组内一个地区的Noto字体，因此屏幕上也会真正呈现同一轮廓。相应地，某个地区版本独有、但被上述规则过滤的细小差异不会显示。',
    scope1:
      '收录《通用规范汉字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）、韩国《漢文教育用基礎漢字》（2000）五份字表的并集，把简繁、日本新旧字体这类跨码点的对应合并成一行，共{rows}行。韩国列默认关闭，可在显示选项中启用。',
    scope2:
      '其中{identical}行五地字形完全一致，{allDiffer}行五地各不相同。字形相同的字同样收录——这里是五地汉字的字表，字形差异只是其中一个维度。',
    scope3:
      '台湾《次常用国字表》只为已有行提供二级收录状态和候选，不参与生成新行；其6,343个主条目中有3,599个独有条目明确在产品范围之外。',
    limitPrint:
      '本应用只比较通用黑体与宋体中的印刷字形，不涵盖手写习惯，也不以教科书体的示范字形为准。日语教科书体主要为日语教学设计，并没有与中、港、台、韩共享同一字形池的正式地区版本；若拼接风格相近但来源不同的字体，地区差异与字体自身的设计差异就无法分开。为了控制变量，本应用只能选用同时提供五地版本的同源字体系列。',
    limit1:
      '这里测的是Source Han系列的地区字形设计，不是各地标准本身。它是个高质量的代理，因为Adobe的地区字形分别依据大陆《印刷通用汉字字形表》、台湾教育部《國字標準字體》、香港教育局《常用字字形表》、日本JIS X 0208/0213（JIS2004字形）与韩国KS X 1001/1002。',
    limit2:
      'Source Han的香港字形覆盖并不完整，所以「只有香港不同」这一类可能少报。',
    limit3:
      '全站的地区笔画数先取笔顺数据的实际笔画数；香港与笔顺功能一样，按同形关系依次借用台湾、大陆、日本、韩国数据。没有笔顺数据时，才依次回退到Unihan的kAlternateTotalStrokes、日本的kRSAdobe_Japan1_6和kTotalStrokes。',
    limit4:
      '字表筛选、排序与详情页读取同一份结果。例如「以」在大陆为4画，在香港、台湾、日本、韩国均为5画。',
    limit5:
      'OpenCC与各地规范字表冲突时以规范字表为准。它的异体表里混着「同字异形」和「一字代用另一字」；某地区的字表分开收录两者时就不归并。若只有一个地区提供证据，而候选还属于另一字组，则保守拆分，并在详情页用双向「关系未确认」链接提示。',
    limit6:
      '每个地区格会区分字表主条目、括注异体和未收录回退。未收录格仍显示传承参考字形；这些状态只在详情页说明，不在列表页增加角标。若明确映射到Noto未覆盖的码点，页面仍会显示该码点，并分别使用Plangothic P1（黑体）和WenJin Mincho P2（宋体）的项目内置子集补全；这些补充字形不参与地区差异判定。',
    notice1:
      '本应用是基于公开资料制作的字形对照工具，不是各地的规范、词典或教学材料。页面展示的是本应用采用的数据与自动规则所得的结果，不能据此断定某个字在当地只有这一种「正确」形式。',
    notice2:
      '各地规范的适用范围和定义并不完全相同，字体也只是规范的一种设计实现。本应用会整理、转换并合并不同来源的数据，也会为未收录项补上参考字形；这些都是工程取舍，难免带来简化、遗漏与错误。',
    notice3:
      '页面中的「同形」或「不同」只在上述资料、字体与规则内成立；地区的排列与分组只为方便对照，不表示优劣或立场。正式场合请以原始规范与词典为准；每个字的详情页都列有相应地区的字典链接。',
    notice4: '汉字数量巨大，出错难免。发现数据有误，请通过{issues}反馈。',
    data1:
      '本应用的字表数据以JSON提供，并已开放CORS跨域访问；在遵守下列许可与第三方条款的前提下，可通过fetch、XHR、直接链接等方式自由取用：',
    licenseCode:
      '本项目的程序代码、界面实现与项目原创文档采用{mit}许可；完整的授权范围和名称使用规则见{licenseFile}。',
    licenseData:
      '除另有注明外，由汉智原创的数据库结构、数据选择与编排及原创元数据采用{cc}许可。',
    licenseThirdParty:
      '第三方数据及其派生字段、字体与笔顺数据仍适用下方列出的各自许可；汉智的许可不覆盖本项目无权再授权的内容。',
    licenseBrand:
      '「汉智」「Hanji」及官方Logo和品牌标识不包含在上述许可中。未经许可，公开发布的修改版本、Fork或独立部署不得将其用作项目、产品、网站或应用的名称与品牌；可以如实注明「基于汉智开发」，但不得暗示其为官方版本或受到官方认可。',
    brandAssets:
      '「汉智」「Hanji」的官方Logo、字标、图标及其他品牌素材，其版权及相关权利均予保留，不在本项目的MIT或CC BY 4.0许可范围内。可在非商业的开源项目、资源列表、社区文章及其他一般性技术内容中使用，例如与其他开源技术标识并列展示；也可用于如实介绍或链接汉智官方项目。不得用于商业用途，也不得用于复制、仿制汉智，或用于可能使人误认为汉智官方版本或受其认可的项目、产品、网站或应用。Logo由{designer}设计，谨此致谢。',
    thanks:
      '感谢OpenCC、Unicode Unihan、zispace/hanzi-chars、Jun Da、粤典、国家教育研究院、scriptin/kanji-frequency、Adobe Source Han、Noto CJK、Plangothic与WenJin Mincho的维护者。逐字对照工具{tofu}是本项目的先行者，同样用Noto系列区分地区字形。同时感谢{innei}为本项目设计Logo，以及{oliver}与{antfu}对项目Logo的探索和帮助。',
  },
  footer: {
    sources: '数据来源',
    detail: '完整说明与鸣谢',
  },
}
