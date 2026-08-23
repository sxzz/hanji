import type { zhCN } from './zh-cn.ts'

export const zhTW: typeof zhCN = {
  meta: {
    title: '漢智',
    name: 'Hanji',
    slogan: '一字之間，照見五地字形',
    description:
      '把同一個漢字並排、疊印，照見中國大陸、香港、臺灣、日本與韓國之間細微而真實的字形差異。',
  },
  region: {
    cn: { short: '中', full: '中國大陸' },
    hk: { short: '港', full: '香港' },
    tw: { short: '臺', full: '臺灣' },
    jp: { short: '日', full: '日本' },
    kr: { short: '韓', full: '韓國' },
    old: {
      short: '舊',
      full: '日本舊字體',
      description:
        '「舊」表示日本舊字體，也就是日本制定新字體前使用的傳統漢字字體。',
      wikipedia: '在Wikipedia瞭解舊字體',
    },
  },
  hero: {
    title: '一個漢字{n}種字形',
    same: '{regions}字形完全相同。',
    allDiffer: '{regions}字形各不相同。',
    mixed: '{parts}。',
    share: '{regions}同形',
    only: '只有{region}字形不同',
    rest: '{regions}字形各不相同',
    join: '，',
    split: '拆開看',
    merge: '疊回去',
    field: '要對照的漢字',
    fieldHint: '點漢字輸入任意漢字',
    missing: '「{char}」不在字表裡',
    detail: '查看詳情',
  },
  nav: {
    about: '關於',
    github: 'GitHub倉庫',
    theme: '切換深淺色',
    back: '返回字表',
    options: '顯示選項',
    logoMenu: 'Logo選單',
    logoMenuHint: '按右鍵開啟Logo選單',
    copyLogo: '複製Logo',
    copyingLogo: '正在複製…',
    logoCopied: '已複製Logo',
    copyLogoFailed: '複製失敗，請再試一次',
    logoFormat: '向量SVG',
    downloadLogo: '下載SVG',
    brandCopyright: '版權與鳴謝',
  },
  error: {
    notFoundTitle: '這一頁不在字表裡',
    notFoundDescription:
      '連結可能已經變更，或網址有誤。你可以返回字表，繼續查找和對照漢字。',
    genericTitle: '這一頁暫時無法開啟',
    genericDescription: '頁面遇到了問題。請重新載入，或返回字表繼續瀏覽。',
    home: '返回字表',
    back: '返回上一頁',
    reload: '重新載入',
  },
  options: {
    title: '顯示選項',
    language: '介面語言',
    flags: '用旗幟顯示地區',
    flagsHint: '把「中日港臺韓」換成對應的旗幟符號。',
    outline: '疊印用空心字',
    outlineHint:
      '移除疊印字形的半透明填色，只保留各層輪廓，複雜字的重疊關係更容易分辨。',
    columns: '對照範圍',
    columnsHint: '關掉的一列不再出現，其餘字形重新分組。',
    columnsLast: '至少要留一個地區。',
  },
  style: {
    label: '字體',
    sans: '黑',
    serif: '宋',
    sansFull: '黑體',
    serifFull: '宋體',
  },
  filter: {
    dimension: '比較',
    glyph: '字形',
    cp: '碼位',
    glyphHint: '比較印刷字形。五地使用同一碼位而字形不同，也算有差異。',
    cpHint: '只按Unicode碼位比較。骨這類同碼位異字形的字會歸為相同。',
    search: '搜尋',
    searchPlaceholder: '漢字 / 讀音 / U+9AA8',
    strokes: '筆畫',
    strokeMin: '最少筆畫',
    strokeMax: '最多筆畫',
    common: '常用於',
    pattern: '差異模式',
    tier: '收錄於',
    variety: '{n}種字形',
    identical: '{n}地同形',
    clear: '清除篩選',
    matched: '{n}字',
  },
  sort: {
    label: '排序',
    strokes: '筆畫',
    cp: '碼位',
    freq: '字頻',
    freqRegion: '字頻地區',
    asc: '正序',
    desc: '倒序',
  },
  table: {
    scroll: '字表，可左右捲動',
    old: '舊',
    empty: '沒有符合條件的字。放寬筆畫範圍，或換一個差異模式。',
    page: '第{page}/{total}頁',
    prev: '上一頁',
    next: '下一頁',
    showAll: '顯示全部{n}字',
    paginate: '分頁顯示',
  },
  char: {
    codePoint: 'Unicode碼位',
    strokes: '筆畫',
    freq: '字頻',
    reading: '讀音',
    mandarin: '國語',
    cantonese: '粵語',
    on: '日語音讀',
    kun: '日語訓讀',
    korean: '韓語',
    listed: '收錄',
    variety: '有{n}種字形',
    identical: '字形一致',
    onePicked: '只選了一欄，沒有可比較的對象',
    also: '另見',
    alsoOut: '{region}用字「{char}」另有條目',
    alsoIn: '也是「{char}」的{region}用字',
    alsoUncertain: '「{char}」在{region}的對應關係尚未確認',
    glossed: '括注異體',
    unlistedFallback: '未收錄 · 顯示參考字形',
    stacked: '疊印',
    split: '並排',
    strokeOrder: '筆順',
    strokeHint: '可連續播放，也可前後單步查看。',
    strokePlay: '播放',
    strokePause: '暫停',
    strokeReplay: '重播',
    strokePrevious: '上一筆',
    strokeNext: '下一筆',
    strokeSpeed: '速度',
    strokeProgress: '第{current}/{total}筆',
    strokeDiagram: '「{char}」的筆順動畫，共{total}筆',
    strokeSteps: '「{char}」的筆順步驟圖，共{total}筆',
    strokeLoading: '正在載入筆順…',
    strokeError: '筆順暫時無法載入。',
    strokeRetry: '重試',
    strokeSource: '筆畫資料',
    dict: '外部字典',
    tierCn: { 1: '一級字', 2: '二級字', 3: '三級字' },
    tierTw: { 1: '常用國字', 2: '次常用國字' },
    tierHk: { 1: '常用字' },
    tierJp: { 1: '常用漢字', 2: '教育漢字' },
    tierKr: { 1: '教育用基礎漢字' },
  },
  about: {
    title: '關於',
    nameTitle: '名字的由來',
    name1:
      '「Hanji」跟漢字在各地的叫法各差一個字母：漢語拼音的hanzi差一個z，日語的kanji差一個k，韓語的hanja差一個a。同一件東西，每個地方都改掉一點點——這正是這個應用在講的事。',
    name2:
      '它同時也是閩南語「漢字」的實際讀音hàn-jī，所以它並不是憑空造出來的詞，而是又一地的讀法。中文名「漢智」取其音。',
    methodTitle: '字形差異是怎麼判定的',
    scopeTitle: '收錄範圍',
    sourcesTitle: '資料來源',
    limitTitle: '這份資料的侷限',
    noticeTitle: '聲明',
    thanksTitle: '鳴謝',
    dataTitle: '取用資料',
    licenseTitle: '授權與名稱',
    brandAssetsTitle: 'Logo與品牌素材',
    use: '用途',
    source: '來源',
    license: '授權',
    method1:
      '判定依據Adobe Source Han Sans與Source Han Serif；頁面則使用與它們同源的Noto Sans CJK與Noto Serif CJK呈現結果。每套字體讓中、港、臺、日、韓五個地區共用一個字形池，並分別提供「Unicode碼位→字形編號（CID）」對映。兩地對映到同一CID，就視為同形。',
    method2:
      '最終判定取黑體與宋體結果的聯集：只要其中一款把兩地畫成同一字形，本應用就按同形處理。這能排除只出現在單款字體中的設計細節。例如Source Han Sans為約五分之一的日本常用漢字提供獨立字形，其中約兩百個在Source Han Serif並未區分，像了、人、子、水、金；本應用不把這類差異算作地區規範差異。',
    method3:
      '頁面會按這份判定重新分組：被判為同形的格子統一借用組內一個地區的Noto字體，因此螢幕上也會真正呈現同一輪廓。相應地，某個地區版本獨有、但被上述規則過濾的細小差異不會顯示。',
    scope1:
      '收錄《通用規範漢字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）、韓國《漢文教育用基礎漢字》（2000）五份字表的聯集，把簡繁、日本新舊字體這類跨碼位的對應合併成一列，共{rows}列。韓國列預設關閉，可在顯示選項中啟用。',
    scope2:
      '其中{identical}列五地字形完全一致，{allDiffer}列五地各不相同。字形相同的字同樣收錄——這裡是五地漢字的字表，字形差異只是其中一個維度。',
    scope3:
      '臺灣《次常用國字表》只為已有列提供二級收錄狀態和候選，不參與生成新列；其6,343個主條目中有3,599個獨有條目明確在產品範圍之外。',
    limitPrint:
      '本應用只比較通用黑體與宋體中的印刷字形，不涵蓋手寫習慣，也不以教科書體的示範字形為準。日語教科書體主要為日語教學設計，並沒有與中、港、臺、韓共用同一字形池的正式地區版本；若拼接風格相近但來源不同的字體，地區差異與字體自身的設計差異就無法分開。為了控制變因，本應用只能選用同時提供五地版本的同源字體系列。',
    limit1:
      '這裡測的是Source Han系列的地區字形設計，不是各地標準本身。它是個高品質的代理，因為Adobe的地區字形分別依據大陸《印刷通用漢字字形表》、臺灣教育部《國字標準字體》、香港教育局《常用字字形表》、日本JIS X 0208/0213（JIS2004字形）與韓國KS X 1001/1002。',
    limit2:
      'Source Han的香港字形覆蓋並不完整，所以「只有香港不同」這一類可能少報。',
    limit3:
      '全站的地區筆畫數先取筆順資料的實際筆畫數；香港與筆順功能相同，按同形關係依序沿用臺灣、中國大陸、日本、韓國資料。沒有筆順資料時，才依序回退至Unihan的kAlternateTotalStrokes、日本的kRSAdobe_Japan1_6與kTotalStrokes。',
    limit4:
      '字表篩選、排序與詳情頁讀取同一份結果。例如「以」在中國大陸為4畫，在香港、臺灣、日本、韓國均為5畫。',
    limit5:
      'OpenCC與各地規範字表衝突時以規範字表為準。它的異體表裡混著「同字異形」和「一字代用另一字」；某地區的字表分開收錄兩者時就不合併。若只有一個地區提供證據，而候選還屬於另一字組，則保守拆分，並在詳情頁用雙向「關係未確認」連結提示。',
    limit6:
      '每個地區格會區分字表主條目、括注異體和未收錄回退。未收錄格仍顯示傳承參考字形；這些狀態只在詳情頁說明，不在列表頁增加角標。若明確對應到Noto未涵蓋的碼位，頁面仍會顯示該碼位，並分別使用Plangothic P1（黑體）和WenJin Mincho P2（宋體）的專案內建子集補全；這些補充字形不參與地區差異判定。',
    notice1:
      '本應用是依據公開資料製作的字形對照工具，不是各地的規範、辭典或教學材料。頁面呈現的是本應用採用的資料與自動規則所得結果，不能據此斷定某個字在當地只有這一種「正確」形式。',
    notice2:
      '各地規範的適用範圍與定義不盡相同，字體也只是規範的一種設計實作。本應用會整理、轉換並合併不同來源的資料，也會為未收錄項目補上參考字形；這些都是工程取捨，難免帶來簡化、遺漏與錯誤。',
    notice3:
      '頁面中的「同形」或「不同」只在上述資料、字體與規則內成立；地區的排列與分組只為方便對照，不表示優劣或立場。正式場合請以原始規範與辭典為準；每個字的詳情頁都列有相應地區的字典連結。',
    notice4: '漢字數量龐大，出錯難免。發現資料有誤，請透過{issues}回報。',
    data1:
      '本應用的字表資料以JSON提供，並已開放CORS跨來源存取；在遵守下列授權與第三方條款的前提下，可透過fetch、XHR、直接連結等方式自由取用：',
    licenseCode:
      '本專案的程式碼、介面實作與專案原創文件採用{mit}授權；完整的授權範圍與名稱使用規則見{licenseFile}。',
    licenseData:
      '除另有註明外，由漢智原創的資料庫結構、資料選擇與編排及原創中繼資料採用{cc}授權。',
    licenseThirdParty:
      '第三方資料及其衍生欄位、字體與筆順資料仍適用下方列出的各自授權；漢智的授權不涵蓋本專案無權再授權的內容。',
    licenseBrand:
      '「漢智」「Hanji」及官方Logo與品牌識別不包含在上述授權中。未經許可，公開發布的修改版本、Fork或獨立部署不得將其用作專案、產品、網站或應用的名稱與品牌；可以如實註明「基於漢智開發」，但不得暗示其為官方版本或受到官方認可。',
    brandAssets:
      '「漢智」「Hanji」的官方Logo、字標、圖示及其他品牌素材，其版權及相關權利均予保留，不在本專案的MIT或CC BY 4.0授權範圍內。可在非商業的開源專案、資源清單、社群文章及其他一般技術內容中使用，例如與其他開源技術標誌並列展示；也可用於如實介紹或連結漢智官方專案。不得用於商業用途，也不得用於複製、仿製漢智，或用於可能使人誤認為漢智官方版本或獲其認可的專案、產品、網站或應用。Logo由{designer}設計，謹此致謝。',
    thanks:
      '感謝OpenCC、Unicode Unihan、zispace/hanzi-chars、Jun Da、粵典、國家教育研究院、scriptin/kanji-frequency、Adobe Source Han、Noto CJK、Plangothic與WenJin Mincho的維護者。逐字對照工具{tofu}是本專案的先行者，同樣用Noto系列區分地區字形。也感謝{innei}為本專案設計Logo，以及{oliver}與{antfu}對專案Logo的探索與協助。',
  },
  footer: {
    sources: '資料來源',
    detail: '完整說明與鳴謝',
  },
}
