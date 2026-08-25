import type { zhCN } from './zh-cn.ts'

export const enUS: typeof zhCN = {
  meta: {
    title: 'Hanji',
    name: 'Hanji',
    slogan: 'One character across five regions',
    description:
      'Hanji compares the printed glyph forms of the same Han character across Mainland China, Hong Kong, Taiwan, Japan, and South Korea, with Unicode code points, stroke counts, frequency ranks, readings, character-list status, and stroke order.',
    charDescription:
      'Compare the glyphs, Unicode code points, stroke counts, frequency ranks, readings, character-list status, and stroke order for “{char}” across Mainland China, Hong Kong, Taiwan, Japan, and South Korea. Regional forms: {forms}.',
    charImageAlt:
      'Overprint of the Mainland Chinese, Hong Kong, Taiwanese, and Japanese glyphs for {char}',
  },
  region: {
    cn: { short: 'CN', full: 'Mainland China' },
    hk: { short: 'HK', full: 'Hong Kong' },
    tw: { short: 'TW', full: 'Taiwan' },
    jp: { short: 'JP', full: 'Japan' },
    kr: { short: 'KR', full: 'South Korea' },
    old: {
      short: 'Old',
      full: 'Japanese kyūjitai',
      description:
        '“Old” denotes kyūjitai, the traditional Japanese character forms used before the postwar shinjitai reforms.',
      wikipedia: 'Learn about kyūjitai on Wikipedia',
    },
  },
  hero: {
    title: '{n} distinct glyphs',
    // The standfirst is assembled from these: see HeroOverprint's `body`.
    same: '{regions} share the same glyph.',
    allDiffer: '{regions} all use different glyphs.',
    mixed: '{parts}.',
    share: '{regions} share one glyph',
    only: 'only {region} differs',
    rest: '{regions} each have a different glyph',
    join: '; ',
    split: 'Separate',
    merge: 'Overprint',
    field: 'Han character to compare',
    fieldHint: 'Select the character to enter another',
    missing: '“{char}” is not in the character list',
    detail: 'View details',
  },
  nav: {
    about: 'About',
    github: 'GitHub repository',
    theme: 'Toggle light and dark themes',
    back: 'Back to the character list',
    options: 'Display options',
    logoMenu: 'Logo menu',
    logoMenuHint: 'Right-click to open the logo menu',
    copyLogo: 'Copy logo',
    copyingLogo: 'Copying…',
    logoCopied: 'Logo copied',
    copyLogoFailed: 'Could not copy; try again',
    logoFormat: 'Vector SVG',
    downloadLogo: 'Download SVG',
    brandCopyright: 'Copyright and credits',
  },
  error: {
    notFoundTitle: 'This page is not in the character list',
    notFoundDescription:
      'The link may have changed, or the address may be incorrect. Return to the character list to continue searching and comparing characters.',
    genericTitle: 'This page is temporarily unavailable',
    genericDescription:
      'The page encountered a problem. Reload it, or return to the character list to continue browsing.',
    home: 'Back to the character list',
    back: 'Go back',
    reload: 'Reload',
  },
  options: {
    title: 'Display options',
    language: 'Interface language',
    flags: 'Show regions as flags',
    flagsHint: 'Replace the CN, HK, TW, JP, and KR labels with flags.',
    outline: 'Use outlines in overprints',
    outlineHint:
      'Remove the translucent fill from overprinted glyphs and retain only their outlines, making overlaps in complex characters easier to distinguish.',
    columns: 'Regions compared',
    columnsHint:
      'Hidden columns are removed, and the remaining glyphs are regrouped.',
    columnsLast: 'At least one region must remain visible.',
  },
  style: {
    label: 'Typeface',
    sans: 'A',
    serif: 'A',
    sansFull: 'Sans serif',
    serifFull: 'Serif',
  },
  filter: {
    dimension: 'Compare by',
    glyph: 'Glyph',
    cp: 'Code point',
    glyphHint:
      'Compare printed glyphs. Regional differences count even when all five regions use the same Unicode code point.',
    cpHint:
      'Compare Unicode code points only. Characters such as 骨, whose regional glyphs differ at one code point, are grouped as identical.',
    search: 'Search',
    searchPlaceholder: 'Character / reading / U+9AA8',
    strokes: 'Stroke count',
    strokeMin: 'Minimum stroke count',
    strokeMax: 'Maximum stroke count',
    common: 'Used in',
    pattern: 'Difference pattern',
    tier: 'Listed in',
    variety: '{n} glyph forms',
    identical: 'Same glyph in {n} regions',
    clear: 'Clear filters',
    matched: '{n} matches',
  },
  sort: {
    label: 'Sort by',
    strokes: 'Stroke count',
    cp: 'Code point',
    freq: 'Frequency',
    freqRegion: 'Frequency corpus',
    asc: 'Ascending',
    desc: 'Descending',
  },
  table: {
    scroll: 'Character list; scroll horizontally',
    old: 'Old',
    empty:
      'No characters match. Widen the stroke-count range or choose another difference pattern.',
    page: 'Page {page} of {total}',
    prev: 'Previous',
    next: 'Next',
    perPage: 'Per page',
    showAll: 'Show all {n} characters',
    paginate: 'Show pages',
  },
  char: {
    codePoint: 'Unicode code point',
    strokes: 'Stroke count',
    freq: 'Frequency rank',
    reading: 'Readings',
    mandarin: 'Mandarin',
    cantonese: 'Cantonese',
    on: 'Japanese on’yomi',
    kun: 'Japanese kun’yomi',
    korean: 'Korean',
    listed: 'List status',
    variety: '{n} distinct glyphs',
    identical: 'The glyphs are identical',
    onePicked: 'Only one column is selected; there is nothing to compare',
    also: 'See also',
    alsoOut: 'The {region} listed form “{char}” has its own entry',
    alsoIn: 'Also the {region} listed form of “{char}”',
    alsoUncertain: 'The relationship to “{char}” in {region} is unconfirmed',
    glossed: 'Parenthetical variant',
    unlistedFallback: 'Unlisted · showing reference form',
    stacked: 'Overprint',
    split: 'Side by side',
    strokeOrder: 'Stroke order',
    strokeHint: 'Play continuously or step through one stroke at a time.',
    strokePlay: 'Play',
    strokePause: 'Pause',
    strokeReplay: 'Replay',
    strokePrevious: 'Previous stroke',
    strokeNext: 'Next stroke',
    strokeSpeed: 'Speed',
    strokeProgress: 'Stroke {current} of {total}',
    strokeDiagram: 'Stroke-order animation for “{char}”, {total} strokes',
    strokeSteps: 'Stroke-order diagram for “{char}”, {total} strokes',
    strokeLoading: 'Loading stroke order…',
    strokeError: 'Stroke order is temporarily unavailable.',
    strokeRetry: 'Try again',
    strokeSource: 'Stroke data',
    dict: 'External dictionaries',
    tierCn: {
      1: 'Level 1 listed character',
      2: 'Level 2 listed character',
      3: 'Level 3 listed character',
    },
    tierTw: {
      1: 'Commonly used character',
      2: 'Less commonly used character',
    },
    tierHk: { 1: 'Commonly used character' },
    tierJp: { 1: 'Jōyō kanji', 2: 'Kyōiku kanji' },
    tierKr: { 1: 'Basic Hanja for education' },
  },
  about: {
    title: 'About',
    buildLabel: 'Built',
    nameTitle: 'The name',
    name1:
      '“Hanji” differs by one letter from three regional names for Han characters: Mandarin pinyin hanzi uses z instead of j, Japanese kanji uses k instead of h, and Korean hanja uses a instead of i. Each region changes the same thing slightly—the subject of this application.',
    name2:
      'It is also the actual Hokkien pronunciation hàn-jī for “漢字”. Hanji is therefore not a coined word, but another regional reading. The Chinese name “汉智” follows its sound.',
    methodTitle: 'How glyph differences are determined',
    scopeTitle: 'Scope',
    sourcesTitle: 'Data sources',
    limitTitle: 'Limitations of the data',
    noticeTitle: 'Notice',
    thanksTitle: 'Acknowledgements',
    dataTitle: 'Using the data',
    licenseTitle: 'Licensing and names',
    brandAssetsTitle: 'Logo and brand assets',
    use: 'Use',
    source: 'Source',
    license: 'License',
    method1:
      'Glyph comparisons are derived from Adobe Source Han Sans and Source Han Serif; pages render the results with their Noto Sans CJK and Noto Serif CJK counterparts. Each family uses one glyph pool shared by Mainland China, Hong Kong, Taiwan, Japan, and South Korea, with a regional “Unicode code point → glyph ID (CID)” mapping. Two regions are treated as sharing a glyph when their mappings point to the same CID.',
    method2:
      'The final classification is the union of the sans-serif and serif results: if either family draws two regions with one glyph, Hanji treats them as identical. This excludes design details found in only one family. Source Han Sans, for example, gives roughly one fifth of the Japanese Jōyō kanji distinct glyphs; Source Han Serif does not distinguish about 200 of them, including 了, 人, 子, 水, and 金. Hanji does not count those differences as regional conventions.',
    method3:
      'The page regroups cells according to this classification. Cells determined to be identical borrow one regional Noto font from their group, so they display exactly the same outline. Consequently, small region-specific differences excluded by the rule above are not shown.',
    scope1:
      'The dataset is the union of Mainland China’s List of Commonly Used Standard Chinese Characters (2013), Taiwan’s Standard Form of National Characters (1982), Hong Kong’s List of Graphemes of Commonly-used Chinese Characters, Japan’s Jōyō Kanji List (2010), and South Korea’s Basic Hanja for Educational Use (2000). Cross-code-point correspondences such as simplified and traditional forms and Japanese shinjitai and kyūjitai are merged into {rows} rows. The South Korean column is hidden by default and can be enabled in Display options.',
    scope2:
      'Across all five regions, {identical} rows have identical glyphs and {allDiffer} rows have five different glyphs. Characters with identical glyphs are included: this is a five-region Han character table, and glyph difference is only one dimension.',
    scope3:
      'Taiwan’s List of Less Commonly Used Characters only supplies secondary-list status and candidates for existing rows; it does not create rows. Of its 6,343 primary entries, 3,599 unique entries are explicitly outside the product scope.',
    limitPrint:
      'Hanji compares printed glyphs in general-purpose sans-serif and serif typefaces. It does not cover handwriting conventions or use textbook-style model forms as its standard. Japanese textbook typefaces are designed chiefly for Japanese instruction and have no official regional versions sharing one glyph pool with Mainland China, Hong Kong, Taiwan, and South Korea. Combining visually similar but unrelated fonts would make regional differences inseparable from the fonts’ own design differences. To control that variable, Hanji uses related font families that provide all five regional versions.',
    limit1:
      'Hanji measures the regional glyph designs in Source Han, not the regional standards themselves. It is a high-quality proxy: Adobe bases its designs on Mainland China’s Standard Form of Printing Typefaces of Chinese Characters, Taiwan’s Standard Form of National Characters, Hong Kong’s List of Graphemes of Commonly-used Chinese Characters, Japan’s JIS X 0208/0213 (JIS2004 glyphs), and South Korea’s KS X 1001/1002.',
    limit2:
      'Source Han’s Hong Kong glyph coverage is incomplete, so patterns in which only Hong Kong differs may be underreported.',
    limit3:
      'Regional stroke counts first use the actual number of strokes in the stroke-order data. As with stroke order, Hong Kong borrows data from an identical glyph in Taiwan, Mainland China, Japan, then South Korea. Where no stroke-order data is available, Hanji falls back in order to Unihan’s kAlternateTotalStrokes, Japan’s kRSAdobe_Japan1_6, and kTotalStrokes.',
    limit4:
      'The filters, sorting, and detail pages use the same regional stroke counts. For example, 以 has 4 strokes in Mainland China and 5 in Hong Kong, Taiwan, Japan, and South Korea.',
    limit5:
      'Where OpenCC conflicts with a regional standard list, the standard list takes precedence. OpenCC’s variant tables mix “one character, different forms” with cases in which one character substitutes for another; a region that lists both separately keeps them in separate rows. When only one region provides evidence and a candidate also belongs to another row, Hanji conservatively keeps the rows separate and shows reciprocal “relationship unconfirmed” links on their detail pages.',
    limit6:
      'Each regional cell distinguishes a primary listed form, a parenthetical variant, and an unlisted fallback. An unlisted cell still shows an inherited reference glyph; these states are explained only on detail pages and do not add badges to the list. If an explicit mapping points to a code point absent from Noto, the page keeps that code point and supplies it from bundled subsets of Plangothic P1 for sans-serif and WenJin Mincho P2 for serif. These supplemental glyphs do not participate in regional-difference classification.',
    notice1:
      'Hanji is a glyph-comparison tool built from public sources. It is not a regional standard, dictionary, or teaching resource. Its pages report the results of the selected data and automated rules; they do not establish that a character has only one “correct” form in a region.',
    notice2:
      'Regional standards differ in scope and definition, and a typeface is only one design implementation of a standard. Hanji organizes, transforms, and merges data from different sources and supplies reference glyphs for unlisted items. These engineering choices necessarily introduce simplifications, omissions, and possible errors.',
    notice3:
      '“Identical” and “different” apply only within the sources, fonts, and rules described above. Region order and grouping serve comparison only and express no ranking or position. For formal use, consult the original standards and dictionaries; every character detail page includes links to relevant regional dictionaries.',
    notice4:
      'The number of Han characters makes occasional errors unavoidable. Please report incorrect data through {issues}.',
    data1:
      'The character-table data is available as JSON with cross-origin access enabled. Subject to the licenses and third-party terms below, it may be used through fetch, XHR, or a direct link:',
    licenseCode:
      'The project’s source code, interface implementation, and original documentation are licensed under {mit}. See {licenseFile} for the complete grant and naming rules.',
    licenseData:
      'Unless otherwise stated, Hanji’s original database structure, selection and arrangement of data, and original metadata are licensed under {cc}.',
    licenseThirdParty:
      'Third-party data and derived fields, fonts, and stroke-order data remain subject to their respective licenses below. Hanji’s licenses do not cover material the project has no right to relicense.',
    licenseBrand:
      'The Hanji name, official logo, and brand identifiers are not included in those licenses. Publicly distributed modifications, forks, and independent deployments may not use them as a project, product, website, or application name or brand without permission. They may state truthfully that they are “based on Hanji”, but must not imply official status or endorsement.',
    brandAssets:
      'Copyright and related rights in Hanji’s official logo, wordmark, icons, and other brand assets are reserved and fall outside the project’s MIT and CC BY 4.0 licenses. They may be used in non-commercial open-source projects, resource lists, community articles, and similar general technical material—for example, alongside other open-source technology marks—and to identify or link to the official Hanji project. They may not be used commercially, to reproduce or imitate Hanji, or in any project, product, website, or application that could be mistaken for an official or endorsed version. The logo was designed by {designer}, with thanks.',
    thanks:
      'Thanks to the maintainers of OpenCC, Unicode Unihan, zispace/hanzi-chars, Jun Da, words.hk, the National Academy for Educational Research, scriptin/kanji-frequency, Adobe Source Han, Noto CJK, Plangothic, and WenJin Mincho. The character-by-character comparison tool {tofu} preceded this project and likewise uses the Noto families to distinguish regional glyphs. Thanks also to {innei} for designing the Hanji logo, and to {oliver} and {antfu} for exploring and assisting with its design.',
  },
  pwa: {
    description:
      'Install Hanji to browse the character list, glyphs, and stroke order offline.',
    install: 'Install Hanji',
  },
  footer: {
    sources: 'Data sources',
    detail: 'Full explanation and acknowledgements',
  },
}
