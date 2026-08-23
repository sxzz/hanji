/**
 * User-facing attribution metadata shared by the app and build pipeline.
 *
 * Keep this browser-safe: Node-only download and parsing helpers belong in
 * scripts/sources.ts.
 */
import type { Locale } from '../app/locales/index.ts'

/**
 * Copy in every interface language. Written out here rather than in the
 * message files because a source belongs with the rest of its record.
 */
export type Localized = Record<Locale, string>

export interface Source {
  id: string
  /** One line on what it is used for. */
  use: Localized
  name: string
  /** Language-specific replacement when the source name itself has copy. */
  localizedName?: Partial<Localized>
  homepage: string
  license: string
  /** Language-specific replacement for a prose license label. */
  localizedLicense?: Partial<Localized>
  licenseUrl: string
  /** Upstream standard, or a caveat worth stating. */
  note?: Localized
}

export const SOURCES: Source[] = [
  {
    id: 'source-han',
    use: {
      'zh-CN': '判定五地字形差异',
      'zh-TW': '判定五地字形差異',
      'zh-HK': '判定五地字形差異',
      'ja-JP': '5地域の字形差を判定',
      'ko-KR': '다섯 지역의 자형 차이 판정',
    },
    name: 'Adobe Source Han Sans / Serif（CMap 资源）',
    localizedName: {
      'ja-JP': 'Adobe Source Han Sans / Serif（CMapリソース）',
      'ko-KR': 'Adobe Source Han Sans / Serif(CMap 리소스)',
    },
    homepage: 'https://github.com/adobe-fonts/source-han-sans',
    license: 'SIL OFL 1.1',
    licenseUrl: 'https://openfontlicense.org/',
    note: {
      'zh-CN':
        '每套字体的五份地区 CMap 给出「码点 → CID」映射，同一字形池内 CID 相同即同一字形。判定取黑体与宋体的并集。',
      'zh-TW':
        '每套字體的五份地區 CMap 給出「碼位 → CID」對映，同一字形池內 CID 相同即同一字形。判定取黑體與宋體的聯集。',
      'zh-HK':
        '每套字體的五份地區 CMap 給出「碼點 → CID」對應，同一字形池內 CID 相同即同一字形。判定取黑體與宋體的並集。',
      'ja-JP':
        '各書体の5地域向けCMapには「コードポイント → CID」の対応があり、同じ字形プール内でCIDが同じなら同一字形です。判定にはゴシック体と明朝体の和集合を使います。',
      'ko-KR':
        '각 글꼴의 다섯 지역용 CMap은 ‘코드 포인트 → CID’ 매핑을 제공합니다. 같은 자형 풀에서 CID가 같으면 같은 자형입니다. 판정에는 고딕체와 명조체의 합집합을 사용합니다.',
    },
  },
  {
    id: 'noto-cjk',
    use: {
      'zh-CN': '页面展示用字体',
      'zh-TW': '頁面顯示用字體',
      'zh-HK': '頁面顯示用字體',
      'ja-JP': '画面表示用フォント',
      'ko-KR': '화면 표시용 글꼴',
    },
    name: 'Noto Sans / Noto Serif（含 CJK）',
    localizedName: {
      'ja-JP': 'Noto Sans / Noto Serif（CJK対応）',
      'ko-KR': 'Noto Sans / Noto Serif(CJK 지원)',
    },
    homepage: 'https://github.com/notofonts/noto-cjk',
    license: 'SIL OFL 1.1',
    licenseUrl: 'https://openfontlicense.org/',
    note: {
      'zh-CN':
        '汉字取自 CJK 版本，拉丁字母与数字取自拉丁版本，都按应用内用字子集化后自托管，OFL 声明随附于 /notices/noto-ofl.txt。',
      'zh-TW':
        '漢字取自 CJK 版本，拉丁字母與數字取自拉丁版本，都按應用內用字子集化後自行託管，OFL 聲明隨附於 /notices/noto-ofl.txt。',
      'zh-HK':
        '漢字取自 CJK 版本，拉丁字母與數字取自拉丁版本，都按應用內用字子集化後自行託管，OFL 聲明隨附於 /notices/noto-ofl.txt。',
      'ja-JP':
        '漢字はCJK版、ラテン文字と数字はラテン版を使用し、アプリ内で使う文字だけにサブセット化してセルフホストしています。OFLの表記は/notices/noto-ofl.txtに同梱しています。',
      'ko-KR':
        '한자는 CJK 버전, 라틴 문자와 숫자는 라틴 버전을 사용합니다. 앱에서 쓰는 문자만 서브셋으로 만들어 자체 호스팅하며, OFL 고지문은 /notices/noto-ofl.txt에 함께 제공합니다.',
    },
  },
  {
    id: 'plangothic',
    use: {
      'zh-CN': '补充Noto未收录的黑体字形',
      'zh-TW': '補充Noto未收錄的黑體字形',
      'zh-HK': '補充Noto未收錄的黑體字形',
      'ja-JP': 'Noto未収録字のゴシック体補完',
      'ko-KR': 'Noto 미수록 글자의 고딕체 보완',
    },
    name: 'Plangothic P1',
    homepage:
      'https://github.com/Fitzgerald-Porthmouth-Koenigsegg/Plangothic_Project',
    license: 'SIL OFL 1.1',
    licenseUrl:
      'https://github.com/Fitzgerald-Porthmouth-Koenigsegg/Plangothic_Project/blob/main/LICENSE-OFL.txt',
    note: {
      'zh-CN':
        '按当前数据中Noto未收录但需要显示的码点，动态生成重命名后的网页字体子集；这些字形不参与地区差异判定。OFL声明随附于/notices/plangothic-ofl.txt。',
      'zh-TW':
        '依目前資料中Noto未收錄但需要顯示的碼位，動態產生重新命名的網頁字型子集；這些字形不參與地區差異判定。OFL聲明隨附於/notices/plangothic-ofl.txt。',
      'zh-HK':
        '按目前資料中Noto未收錄但需要顯示的碼位，動態產生重新命名的網頁字體子集；這些字形不參與地區差異判定。OFL聲明隨附於/notices/plangothic-ofl.txt。',
      'ja-JP':
        '現在のデータで表示が必要ながらNotoにないコードポイントから、名称を変更したWebフォントサブセットを動的に生成します。これらの字形は地域差の判定には使いません。OFL表記は/notices/plangothic-ofl.txtに同梱しています。',
      'ko-KR':
        '현재 데이터에서 표시해야 하지만 Noto에 없는 코드 포인트를 동적으로 수집해 이름을 바꾼 웹 글꼴 서브셋을 생성합니다. 이 자형은 지역 차이 판정에 사용하지 않습니다. OFL 고지문은 /notices/plangothic-ofl.txt에 있습니다.',
    },
  },
  {
    id: 'wenjin-mincho',
    use: {
      'zh-CN': '补充Noto未收录的宋体字形',
      'zh-TW': '補充Noto未收錄的宋體字形',
      'zh-HK': '補充Noto未收錄的宋體字形',
      'ja-JP': 'Noto未収録字の明朝体補完',
      'ko-KR': 'Noto 미수록 글자의 명조체 보완',
    },
    name: 'WenJin Mincho P2',
    homepage: 'https://github.com/takushun-wu/WenJinMincho',
    license: 'SIL OFL 1.1',
    licenseUrl:
      'https://github.com/takushun-wu/WenJinMincho/blob/main/LICENSE.md',
    note: {
      'zh-CN':
        '按当前数据中Noto未收录但需要显示的码点，动态生成重命名后的网页字体子集；这些字形不参与地区差异判定。OFL声明随附于/notices/wenjin-mincho-ofl.md。',
      'zh-TW':
        '依目前資料中Noto未收錄但需要顯示的碼位，動態產生重新命名的網頁字型子集；這些字形不參與地區差異判定。OFL聲明隨附於/notices/wenjin-mincho-ofl.md。',
      'zh-HK':
        '按目前資料中Noto未收錄但需要顯示的碼位，動態產生重新命名的網頁字體子集；這些字形不參與地區差異判定。OFL聲明隨附於/notices/wenjin-mincho-ofl.md。',
      'ja-JP':
        '現在のデータで表示が必要ながらNotoにないコードポイントから、名称を変更したWebフォントサブセットを動的に生成します。これらの字形は地域差の判定には使いません。OFL表記は/notices/wenjin-mincho-ofl.mdに同梱しています。',
      'ko-KR':
        '현재 데이터에서 표시해야 하지만 Noto에 없는 코드 포인트를 동적으로 수집해 이름을 바꾼 웹 글꼴 서브셋을 생성합니다. 이 자형은 지역 차이 판정에 사용하지 않습니다. OFL 고지문은 /notices/wenjin-mincho-ofl.md에 있습니다.',
    },
  },
  {
    id: 'opencc',
    use: {
      'zh-CN': '简繁、港台异体、日本新旧字体对应',
      'zh-TW': '簡繁、港臺異體、日本新舊字體對應',
      'zh-HK': '簡繁、港台異體、日本新舊字體對應',
      'ja-JP': '簡体字・繁体字、香港・台湾の異体字、日本の新字体・旧字体の対応',
      'ko-KR': '간체·번체, 홍콩·대만 이체자, 일본 신자체·구자체 대응',
    },
    name: 'OpenCC 开放中文转换',
    localizedName: {
      'ja-JP': 'OpenCC（Open Chinese Convert）',
      'ko-KR': 'OpenCC(Open Chinese Convert)',
    },
    homepage: 'https://github.com/BYVoid/OpenCC',
    license: 'Apache-2.0',
    licenseUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
  },
  {
    id: 'animcjk',
    use: {
      'zh-CN': '中、台、日、韩笔顺动画与笔画数',
      'zh-TW': '中、臺、日、韓筆順動畫與筆畫數',
      'zh-HK': '中、台、日、韓筆順動畫與筆畫數',
      'ja-JP': '中国・台湾・日本・韓国の筆順と画数',
      'ko-KR': '중국·대만·일본·한국 필순과 획수',
    },
    name: 'AnimCJK',
    homepage: 'https://github.com/parsimonhi/animCJK',
    license: 'Arphic Public License',
    licenseUrl:
      'https://github.com/parsimonhi/animCJK/blob/master/licenses/APL/english/ARPHICPL.TXT',
    note: {
      'zh-CN':
        '仅提取本应用字组引用的中、台、日、韩字形，保留原始笔画轮廓与中线，并按字组主键转换成32个哈希分片；动画以官方示例的轮廓裁剪方式绘制。同一字组切换地区只需一个分片；按笔画顺序排列的轮廓完全一致时仅保留第一份变体及其中线，界面也合并成一个选项。香港按本应用的Source Han字形分组复用已有数据，优先顺序为台湾、中国大陆、日本、韩国。全站的地区笔画数以所解析变体的轮廓数量为首选，没有数据时再回退到Unihan。分片由构建脚本生成至app/assets/strokes，再由Vite输出为带内容哈希的资源；随附授权通过/notices/下的稳定URL提供并要求重新验证。修改后的AnimCJK数据继续按APL提供。',
      'zh-TW':
        '只擷取本應用字組引用的中、臺、日、韓字形，保留原始筆畫輪廓與中線，並依字組主鍵轉換成32個雜湊分片；動畫採官方範例的輪廓裁剪方式繪製。同一字組切換地區只需一個分片；依筆畫順序排列的輪廓完全一致時只保留第一份變體及其中心線，介面亦合併成單一選項。香港依本應用的Source Han字形分組沿用既有資料，優先順序為臺灣、中國大陸、日本、韓國。全站的地區筆畫數以解析出的變體輪廓數量為優先，沒有資料時再回退至Unihan。分片由建置腳本產生至app/assets/strokes，再由Vite輸出為帶內容雜湊的資源；隨附授權透過/notices/下的穩定URL提供並要求重新驗證。修改後的AnimCJK資料繼續依APL提供。',
      'zh-HK':
        '只抽取本應用字組引用嘅中、台、日、韓字形，保留原始筆畫輪廓同中線，並按字組主鍵轉換成32個雜湊分片；動畫用官方範例嘅輪廓裁剪方式繪製。同一字組切換地區只需要一個分片；按筆畫次序排列嘅輪廓完全一致時只保留第一份變體同其中線，介面亦合併成一個選項。香港按本應用嘅Source Han字形分組沿用已有數據，優先次序係台灣、中國大陸、日本、韓國。全站嘅地區筆畫數會用解析出嚟嘅變體輪廓數量做首選，冇數據先回退到Unihan。分片由建置腳本產生到app/assets/strokes，再由Vite輸出做有內容雜湊嘅資源；附帶授權經/notices/下面嘅穩定URL提供並要求重新驗證。修改後嘅AnimCJK數據繼續按APL提供。',
      'ja-JP':
        '本アプリの字グループが参照する中国・台湾・日本・韓国の字形だけを抽出し、元の筆画輪郭と中心線を保持したまま、字グループキーをハッシュした32個のシャードへ変換します。アニメーションは公式サンプルと同じ輪郭クリッピング方式で描画し、同じ字グループ内の地域切替は1シャードだけで済みます。筆画順に並べた輪郭が完全に一致する場合は最初のバリアントとその中心線だけを保存し、画面上でも1つの選択肢にまとめます。香港は本アプリのSource Han字形グループに基づいて既存データを流用し、台湾、中国大陸、日本、韓国の順に優先します。サイト全体の地域別画数は解析したバリアントの輪郭数を第一候補とし、データがなければUnihanへフォールバックします。シャードはビルドスクリプトがapp/assets/strokesへ生成し、Viteが内容ハッシュ付きのアセットとして出力します。付属ライセンスは/notices/配下の安定URLで提供し、再検証を必須にします。変更後のAnimCJKデータもAPLで提供します。',
      'ko-KR':
        '이 앱의 글자 그룹이 참조하는 중국·대만·일본·한국 자형만 추출하고 원본 획 윤곽과 중심선을 유지한 채 글자 그룹 키를 해시한 32개 샤드로 변환합니다. 애니메이션은 공식 예제와 같은 윤곽 클리핑 방식으로 그리며 같은 글자 그룹의 지역 전환은 샤드 하나만 사용합니다. 획순대로 배열한 윤곽이 완전히 같으면 첫 번째 변형과 그 중심선만 저장하고 화면에서도 하나의 선택 항목으로 합칩니다. 홍콩은 이 앱의 Source Han 자형 그룹에 따라 기존 데이터를 재사용하며 대만, 중국 대륙, 일본, 한국 순으로 우선합니다. 사이트 전체의 지역별 획수는 분석한 변형의 윤곽 수를 우선 사용하고, 데이터가 없으면 Unihan으로 대체합니다. 샤드는 빌드 스크립트가 app/assets/strokes에 생성하고 Vite가 콘텐츠 해시가 붙은 에셋으로 출력합니다. 동봉 라이선스는 /notices/ 아래의 안정적인 URL로 제공하며 재검증을 요구합니다. 수정한 AnimCJK 데이터도 APL로 제공합니다.',
    },
  },
  {
    id: 'hanzi-chars',
    use: {
      'zh-CN': '五地标准字表',
      'zh-TW': '五地標準字表',
      'zh-HK': '五地標準字表',
      'ja-JP': '5地域の標準字表',
      'ko-KR': '다섯 지역의 표준 한자표',
    },
    name: 'zispace/hanzi-chars',
    homepage: 'https://github.com/zispace/hanzi-chars',
    license: '仓库未声明',
    localizedLicense: {
      'ja-JP': 'リポジトリに記載なし',
      'ko-KR': '저장소에 명시되지 않음',
    },
    licenseUrl: 'https://github.com/zispace/hanzi-chars',
    note: {
      'zh-CN':
        '转录自各地官方规范：《通用规范汉字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）与《学年別漢字配当表》（2017）、韩国《漢文教育用基礎漢字》（2000）。',
      'zh-TW':
        '轉錄自各地官方規範：《通用規範漢字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）與《学年別漢字配当表》（2017）、韓國《漢文教育用基礎漢字》（2000）。',
      'zh-HK':
        '轉錄自各地官方規範：《通用規範漢字表》（2013）、臺灣《常用國字標準字體表》（1982）、香港《常用字字形表》、日本《常用漢字表》（2010）與《学年別漢字配当表》（2017）、韓國《漢文教育用基礎漢字》（2000）。',
      'ja-JP':
        '各地域の公式規範である中国大陸の『通用規範漢字表』（2013年）、台湾の『常用國字標準字體表』（1982年）、香港の『常用字字形表』、日本の『常用漢字表』（2010年）と『学年別漢字配当表』（2017年）、韓国の『漢文教育用基礎漢字』（2000年）から転記されています。',
      'ko-KR':
        '각 지역의 공식 규범인 중국 대륙의 《통용규범한자표》(通用規範漢字表, 2013), 대만의 《상용국자표준자체표》(常用國字標準字體表, 1982), 홍콩의 《상용자자형표》(常用字字形表), 일본의 《상용한자표》(常用漢字表, 2010)와 《학년별한자배당표》(学年別漢字配当表, 2017), 한국의 《한문교육용기초한자》(漢文教育用基礎漢字, 2000)에서 옮긴 자료입니다.',
    },
  },
  {
    id: 'unihan',
    use: {
      'zh-CN': '笔画数回退、读音',
      'zh-TW': '筆畫數回退、讀音',
      'zh-HK': '筆畫數回退、讀音',
      'ja-JP': '画数の補完・読み',
      'ko-KR': '획수 대체·독음',
    },
    name: 'Unicode Han Database (Unihan)',
    homepage: 'https://www.unicode.org/reports/tr38/',
    license: 'Unicode License v3',
    licenseUrl: 'https://www.unicode.org/license.txt',
  },
  {
    id: 'korean-hanja-variants',
    use: {
      'zh-CN': '韩式异体对应',
      'zh-TW': '韓式異體對應',
      'zh-HK': '韓式異體對應',
      'ja-JP': '韓国の異体字対応',
      'ko-KR': '한국식 이체자 대응',
    },
    name: 'Unicode IRG N2200（韩国教育用汉字提案）',
    localizedName: {
      'zh-TW': 'Unicode IRG N2200（韓國教育用漢字提案）',
      'zh-HK': 'Unicode IRG N2200（韓國教育用漢字提案）',
      'ja-JP': 'Unicode IRG N2200（韓国の教育用漢字提案）',
      'ko-KR': 'Unicode IRG N2200(한국 교육용 한자 제안)',
    },
    homepage: 'https://www.unicode.org/L2/L2017/17173-irgn2200-unihan-db.pdf',
    license: 'Unicode License v3',
    licenseUrl: 'https://www.unicode.org/license.txt',
    note: {
      'zh-CN':
        '用于把韩国字表中跨码点的旧字形归入同一字组，包括以U+2E569编码的「衰」旧形。',
      'zh-TW':
        '用於把韓國字表中跨碼位的舊字形歸入同一字組，包括以U+2E569編碼的「衰」舊形。',
      'zh-HK':
        '用於把韓國字表中跨碼點的舊字形歸入同一字組，包括以U+2E569編碼的「衰」舊形。',
      'ja-JP':
        '韓国の字表にあるコードポイントの異なる旧字形を同じ文字グループへ統合するために使用します。「衰」の旧字形はU+2E569で符号化されています。',
      'ko-KR':
        '한국 한자표에서 코드 포인트가 다른 구자형을 같은 글자 그룹으로 통합하는 데 사용합니다. ‘衰’의 구자형은 U+2E569로 인코딩되어 있습니다.',
    },
  },
  {
    id: 'hanzidb',
    use: {
      'zh-CN': '大陆字频排名',
      'zh-TW': '大陸字頻排名',
      'zh-HK': '大陸字頻排名',
      'ja-JP': '中国大陸の文字頻度順位',
      'ko-KR': '중국 대륙 글자 빈도 순위',
    },
    name: 'hanziDB.csv（Jun Da《现代汉语单字频率列表》）',
    localizedName: {
      'ja-JP':
        'hanziDB.csv（Jun Da『Modern Chinese Character Frequency List』）',
      'ko-KR':
        'hanziDB.csv(Jun Da, 《Modern Chinese Character Frequency List》)',
    },
    homepage: 'https://github.com/ruddfawcett/hanziDB.csv',
    license: 'MIT',
    licenseUrl: 'https://opensource.org/licenses/MIT',
  },
  {
    id: 'words-hk-frequency',
    use: {
      'zh-CN': '香港字频排名',
      'zh-TW': '香港字頻排名',
      'zh-HK': '香港字頻排名',
      'ja-JP': '香港の文字頻度順位',
      'ko-KR': '홍콩 글자 빈도 순위',
    },
    name: '粵典「語料庫單字使用頻率」',
    localizedName: {
      'zh-CN': '粤典「语料库单字使用频率」',
      'ja-JP': 'words.hk「コーパス文字使用頻度」',
      'ko-KR': 'words.hk ‘말뭉치 글자 사용 빈도’',
    },
    homepage: 'https://words.hk/faiman/analysis/charcount/',
    license: 'Public Domain',
    licenseUrl: 'https://words.hk/faiman/analysis/',
    note: {
      'zh-CN':
        '统计粵文庫的书面粤语；本应用筛出汉字后，按出现次数重新计算从1开始的排名。数据注明为公有领域，并按发布者建议标注粵典出处。',
      'zh-TW':
        '統計粵文庫的書面粵語；本應用篩出漢字後，按出現次數重新計算從1開始的排名。資料註明為公有領域，並按發布者建議標註粵典出處。',
      'zh-HK':
        '統計粵文庫嘅書面粵語；本應用篩出漢字後，按出現次數重新計算由1開始嘅排名。資料註明為公有領域，並按發布者建議標註粵典來源。',
      'ja-JP':
        '粵文庫の書き言葉の広東語を集計したものです。本アプリでは漢字だけを抽出し、出現数から1始まりの順位を再計算しています。データはパブリックドメインで、公開者の希望に沿ってwords.hkを表示しています。',
      'ko-KR':
        '粵文庫의 문어 광둥어를 집계한 자료입니다. 이 앱은 한자만 추려 출현 횟수로 1부터 시작하는 순위를 다시 계산합니다. 데이터는 퍼블릭 도메인이며 배포자의 요청에 따라 words.hk를 표시합니다.',
    },
  },
  {
    id: 'naer-tw-frequency',
    use: {
      'zh-CN': '台湾字频排名',
      'zh-TW': '臺灣字頻排名',
      'zh-HK': '台灣字頻排名',
      'ja-JP': '台湾の文字頻度順位',
      'ko-KR': '대만 글자 빈도 순위',
    },
    name: '国家教育研究院《民國112年語料字頻表》',
    localizedName: {
      'zh-TW': '國家教育研究院《民國112年語料字頻表》',
      'zh-HK': '國家教育研究院《民國112年語料字頻表》',
      'ja-JP': '国家教育研究院『民国112年コーパス文字頻度表』',
      'ko-KR': '국가교육연구원 《민국 112년 말뭉치 글자 빈도표》',
    },
    homepage:
      'https://teric.naer.edu.tw/wSite/ct?ctNode=645&mp=teric_b&xItem=2068770',
    license: '网站资料开放宣告（须注明出处）',
    localizedLicense: {
      'zh-TW': '網站資料開放宣告（須註明出處）',
      'zh-HK': '網站資料開放宣告（須註明出處）',
      'ja-JP': 'ウェブサイト資料開放宣言（出典表示必須）',
      'ko-KR': '웹사이트 자료 개방 선언(출처 표시 필수)',
    },
    licenseUrl:
      'https://teric.naer.edu.tw/wSite/ct?xItem=2000016&ctNode=624&mp=teric_b&idPath=588_623_624',
    note: {
      'zh-CN':
        '附件1汇总2023年五家新闻媒体及PTT、DCard语料；本应用筛出汉字后，按字频重新计算从1开始的排名。',
      'zh-TW':
        '附件1彙整2023年五家新聞媒體及PTT、DCard語料；本應用篩出漢字後，按字頻重新計算從1開始的排名。',
      'zh-HK':
        '附件1彙整2023年五家新聞媒體及PTT、DCard語料；本應用篩出漢字後，按字頻重新計算由1開始嘅排名。',
      'ja-JP':
        '添付資料1は、2023年の新聞5媒体とPTT・DCardのコーパスを統合したものです。本アプリでは漢字だけを抽出し、文字頻度から1始まりの順位を再計算しています。',
      'ko-KR':
        '첨부 자료 1은 2023년 5개 신문 매체와 PTT·DCard 말뭉치를 합친 자료입니다. 이 앱은 한자만 추려 글자 빈도로 1부터 시작하는 순위를 다시 계산합니다.',
    },
  },
  {
    id: 'kanji-frequency',
    use: {
      'zh-CN': '日本字频排名',
      'zh-TW': '日本字頻排名',
      'zh-HK': '日本字頻排名',
      'ja-JP': '日本の文字頻度順位',
      'ko-KR': '일본 글자 빈도 순위',
    },
    name: 'scriptin/kanji-frequency（Japanese Wikipedia）',
    localizedName: {
      'ja-JP': 'scriptin/kanji-frequency（日本語版Wikipedia）',
      'ko-KR': 'scriptin/kanji-frequency(일본어 위키백과)',
    },
    homepage: 'https://scriptin.github.io/kanji-frequency/',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    note: {
      'zh-CN':
        '使用2023年1月随机抽取的10万篇日文Wikipedia文章；本应用取wikipedia_characters.csv中的汉字次数，重新计算从1开始的排名并关联到地区字形。',
      'zh-TW':
        '使用2023年1月隨機抽取的10萬篇日文Wikipedia文章；本應用取wikipedia_characters.csv中的漢字次數，重新計算從1開始的排名並關聯至地區字形。',
      'zh-HK':
        '使用2023年1月隨機抽取嘅10萬篇日文Wikipedia文章；本應用取wikipedia_characters.csv入面嘅漢字次數，重新計算由1開始嘅排名並對應到地區字形。',
      'ja-JP':
        '2023年1月に日本語版Wikipediaから無作為抽出した10万記事を使用しています。本アプリではwikipedia_characters.csvの漢字出現数から1始まりの順位を再計算し、地域字形に対応付けています。',
      'ko-KR':
        '2023년 1월 일본어 위키백과에서 무작위로 뽑은 문서 10만 건을 사용합니다. 이 앱은 wikipedia_characters.csv의 한자 출현 횟수로 1부터 시작하는 순위를 다시 계산해 지역 자형에 연결합니다.',
    },
  },
]
