# 漢智 · hanji

[简体中文](README.md) | 日本語

<!-- When editing this file, update README.md in the same change. -->

中国大陸・香港・台湾・日本・韓国の5地域で一般的に使われる漢字をまとめた字表です。本アプリでは、一般的なゴシック体と明朝体における印刷字形を比較します。同じ字でも、地域によって異なる字形で表示されることがあります。5地域の字形を横に並べ、既定ではUIの言語に対応する地域の文字頻度順で表示します。画数順やコードポイント順への並べ替え、差異パターンによる絞り込みも可能です。韓国には文字頻度データがないため、韓国列は既定で非表示ですが、表示オプションから有効にできます。

字形は一つの側面にすぎません。収録範囲は5地域の常用字表の和集合であり、**字形が完全に同じ字も収録しています**。これは5地域の漢字に関する資料表であり、差異だけを並べた一覧ではありません。

以下は概要です。項目ごとの詳しい説明は、アプリ内の「アプリについて」ページにあります。

## 名前の由来

「Hanji」は、各地における漢字の呼び名と、それぞれ一文字ずつ異なります。中国語ピンインの hanzi とは「j/z」、日本語の kanji とは「h/k」、韓国語の hanja とは「i/a」が違います。同じものでも地域ごとに少しずつ変わる――それこそが、このプロジェクトが扱うテーマです。また、Hanji は閩南語における「漢字」の実際の読み hàn-jī でもあります。つまり造語ではなく、もう一つの地域における呼び方です。中国語名の「漢智」はその音に由来します。

## 収録範囲

中国大陸の『通用規範漢字表』（2013年）、台湾の『常用國字標準字體表』（1982年）、香港の『常用字字形表』、日本の『常用漢字表』（2010年）、韓国の『漢文教育用基礎漢字』（2000年）の和集合を収録しています。韓国の字表には常用漢字1,800字が含まれます。簡体字と繁体字、日本の新字体と旧字体、韓国式異体字など、コードポイントをまたぐ対応を1行に統合した結果、全体で **8,449行** です。このうち1,692行は5地域の字形が完全に一致し、129行は5地域すべてで異なります。

台湾の『次常用國字表』は、既存行の二級収録状態と候補を示すためだけに使い、新しい行の生成には使いません。6,343件の主要項目のうち、他にない3,599件は明示的に本プロダクトの対象外としています。

## 字群とデータの意味

1行は一つの字群を表し、5列にはそれぞれ中国大陸・香港・台湾・日本・韓国の表示字形が入ります。コードポイントをまたぐ候補は主にOpenCCから取得し、韓国式異体字にはUnicode IRGの収録提案に記載された対応を使い、各地域の字表で制約しています。

- ある地域の字表で二つの字が別々に収録されている場合は、`着/著` や `欠/缺` のように別の字群として保持します。
- OpenCCで同字関係が明確に自己完結しているもの、または5列が完全に同じ名称は統合できます。少なくとも二つの地域から裏付けられる対応は、確定した地域間対応として扱えます。
- 証拠が一つの地域からしか得られず、候補が別の字群にも属する場合は保守的に分け、詳細ページで `鎗/槍` のように双方向の「関係未確認」として表示します。

5列を確定してから行名を選びます。中国大陸・香港・台湾・日本の証拠がすでにある場合は、韓国列の追加によって既存URLが変わらないよう、従来の4地域ルールを引き続き使います。主要項目と括注収録のどちらも、字群自身の名称を維持する根拠になります。日本の旧字体も、明示的な `JPShinjitaiCharacters` 関係から取得する必要があり、行名と日本列が異なるというだけでは推定しません。

各地域のセルには、`primary`（主要項目）、`glossed`（括注異体字）、`unlisted`（未収録・参考字形を表示）のいずれかの状態があります。`alternatives` には、その地域で収録され、現在の字群に明確に属する別字形だけを保存します。`aka` は字群の別名だけを表します。未確認関係は「関連項目」の表示にのみ使い、検索、URL別名、辞書参照、フォント集合には含めません。完全な定義、ビルド時の保証、制限事項については、[データ規則と既知の制限](docs/known-issues.md)を参照してください。

## 字形差異の判定方法

判定にはAdobe Source Han SansとSource Han Serifを使い、ページ上の表示には同系統のNoto Sans CJKとNoto Serif CJKを使います。各フォントでは、中国大陸・香港・台湾・日本・韓国の5地域が一つのグリフプールを共有し、地域ごとに「Unicodeコードポイント → グリフ番号（CID）」の対応を持ちます。二つの地域が同じCIDに対応していれば、同じ字形と見なします。Adobeはこれらの対応をプレーンテキストで公開しているため、アウトラインやレンダリング画像を比較する必要はありません。

最終判定には、**ゴシック体と明朝体の結果の和集合**を使います。どちらか一方の書体で二つの地域が同じ字形なら、本アプリでも同形として扱います。これにより、一方のフォントだけに現れるデザイン上の細部を除外できます。たとえばSource Han Sansは、日本の常用漢字のおよそ5分の1に独立した字形を用意していますが、そのうち約200字はSource Han Serifでは区別されていません（了、人、子、水、金など）。本アプリでは、このような差を地域規範上の差異として数えません。判断の詳細は[データ規則と既知の制限](docs/known-issues.md)を参照してください。

ページ上ではこの判定に基づいてセルを再グループ化します。同形と判定されたセルは、グループ内の一地域のNotoフォントを共通して使い、画面上でも実際に同じ輪郭を表示します。そのため、上記ルールで除外された地域版間の細かな差異は表示されません。`scripts/tests/fonts.test.ts` はfontkitで生成フォントの実際のアウトラインを取り出し、判定と画面表示が一致することを1字ずつ検証します。

明確なコードポイント間の対応は、Noto/Source Hanが対応先の文字を収録していなくても元のコードポイントへ戻しません。たとえば `𬒗 → 𥗽` は二つのコードポイントとして表示します。ビルドは、現在のデータで表示が必要ながらNotoにないコードポイントを自動収集し、同梱用の補充WOFF2サブセットを生成します。ゴシック体はPlangothic P1、明朝体はWenJin Mincho P2を使い、選択したフォントに一つでも未収録コードポイントがあればビルドを明示的に失敗させます。ページには常に実際のUnicodeテキストを残すため、端末フォントには依存しません。これらの補充字形は表示専用で、地域差の判定には使いません。

## 制限事項

- 本アプリが比較するのは、一般的なゴシック体と明朝体における印刷字形だけです。手書きの慣習は対象外で、教科書体の例示字形も基準にしません。日本語の教科書体は主に日本語教育向けに設計され、中国大陸・香港・台湾・韓国と同じグリフプールを共有する正式な地域版がありません。見た目の近い別々のフォントを組み合わせると、地域差とフォント固有のデザイン差を分離できません。条件を揃えるため、5地域版を同時に提供する同系統のフォントファミリーだけを使います。
- 判定対象はSource Hanの地域別字形デザインであり、各地域の標準そのものではありません。ただし高品質な代理です。Adobeの地域別字形は、中国大陸の『印刷通用漢字字形表』、台湾教育部の『國字標準字體』、香港教育局の『常用字字形表』、日本のJIS X 0208/0213、韓国のKS X 1001/1002をそれぞれ根拠としています。
- Source Hanの香港字形は網羅的ではないため、「香港だけが異なる」パターンは少なく報告される可能性があります。
- 漢字表の絞り込み・並べ替えと詳細ページは、同じ地域別画数を使います。まず筆順データの実際の画数を採用し、香港は筆順機能と同じ同形フォールバックで台湾、中国大陸、日本、韓国の順に参照します。筆順データがない場合は `kAlternateTotalStrokes` → 日本の `kRSAdobe_Japan1_6` → `kTotalStrokes` の順に補います。たとえば「以」の5地域の画数は4/5/5/5/5です。
- 韓国語の読みにはUnihan推奨の `kHangul` を使い、現代ハングルの一音節読みをすべて保持します。語の文脈に応じた読みの選択や、頭音法則の追加導出は行いません。
- 未収録セルに表示するのは伝承字形の参考形であり、その地域で実際に採用または規範収録されていることを意味しません。「関係未確認」も、既存の公開情報だけでは関係を確定できないことを示します。

完全なデータ規則とビルド時の保証については、[docs/known-issues.md](docs/known-issues.md)を参照してください。

## 免責事項

本アプリは公開資料に基づいて作成した字形比較ツールであり、各地域の標準、辞書、教材ではありません。ページに表示される内容は、本アプリが採用したデータと自動処理規則による結果です。ある字について、その地域で唯一の「正しい」形であると断定する根拠にはできません。

各地域の標準は適用範囲や定義が完全には一致せず、フォントも標準の一つの設計実装にすぎません。本アプリでは異なる出典のデータを整理、変換、統合し、未収録項目には参考字形も補います。これらはすべてエンジニアリング上の判断であり、単純化、欠落、誤りが生じる可能性があります。

ページ上の「同形」または「異なる」という判定は、上記の資料、フォント、規則の範囲内でのみ成立します。地域の並びやグループ分けは比較を容易にするためのもので、優劣や立場を示すものではありません。正式な用途では原典の標準や辞書を確認してください。各字の詳細ページには、対応する地域の辞書へのリンクがあります。漢字は非常に多いため、誤りを完全には避けられません。データの誤りを見つけた場合は、[issue](https://github.com/sxzz/hanji/issues)でお知らせください。

## 開発

```bash
pnpm install
pnpm build:data   # 字表とフォントサブセットを生成。初回は約302 MiBをダウンロードし、以後はキャッシュを使用
pnpm update:sources # サードパーティデータの更新を確認して固定。変更があればダウンロードして再生成
pnpm dev
pnpm test
pnpm generate # 静的Webアプリ
```

各行のURLには行名を使います（`/char/着`）。5地域の表示字形、`aka`、`alternatives` もURLとして利用でき、クライアント側で対応する行へ移動します。たとえば `/char/国`、`/char/郞`、`/char/缐` です。ページの `rel=canonical` は行名のURLを指します。未確認関係はURL別名にはなりません。

字表 `app/assets/data/chars.json` は `pnpm build:dataset` で生成し、リポジトリには**コミットしません**。アプリが直接インポートし、Viteも内容ハッシュ付きのダウンロードURLを出力します。静的生成の完了後、字表は外部サイトから参照できる固定URL `/data/chars.json` にもコピーされ、「アプリについて」ページもこのURLへリンクします。このURLは `Access-Control-Allow-Origin: *` を返し、下記のライセンスと第三者条項に従う限り、`fetch`、XHR、直接リンクなどでクロスオリジン利用できます。キャッシュは1時間有効で、期限切れ後もバックグラウンドで再検証している間は古い版を1日利用できます。出典とライセンスのメタデータは `shared/sources.ts` で直接管理し、ページとビルドスクリプトが共通でインポートするため、`sources.json` は生成しません。約12MBのフォントサブセットは `app/assets/fonts/` に生成し、同様にコミットしません。字表、筆順、フォント、旗はすべてViteのアセットグラフに入り、`/_nuxt/*` の長期immutableキャッシュで安全に再利用できます。変更され得る一方で安定URLが必要なNOTICEとライセンス文は `public/notices/` に分離し、利用のたびに再検証します。ビルド前には `pnpm build:data` を実行してください。元データのダウンロードは `data/raw/` 以下に種類別（`charlist/`、`opencc/`、`cmap/`、`font/`、`unihan/`、`frequency/`、`strokes/`）でキャッシュされ、gitignoreされています。ビルド時には、古いキャッシュから復元されたものの、現在の出典一覧には存在しないファイルを削除します。

## デプロイ

静的Webアプリなので、`.output/public` を任意の静的ホスティングに配置できます。本番環境では、[GitHub Actions](.github/workflows/deploy.yml) がビルド後の成果物をCloudflare Workers Static Assetsへ直接アップロードします。

- `main` へのpushはproductionへデプロイします。
- `main` 向けのPRは `wrangler versions upload` で `pr-<番号>` preview aliasへデプロイします。GitHubのPRには対応するdeploymentとURLが表示され、その後のコミットでも同じプレビューURLを使います。

リポジトリには、次の二つのActions secretsが必要です。

- `CLOUDFLARE_API_TOKEN`：Workersスクリプトの編集権限を持つAPI token。
- `CLOUDFLARE_ACCOUNT_ID`：Workerが所属するCloudflare account ID。

Cloudflare Workerの名前は、`wrangler.json` の `name` と同じ `hanji` にする必要があります。

Cloudflareの **Settings → Domains & Routes** でproductionドメインを接続してください。PRのpreview URLは有効のままです。

ページビューとWeb Vitalsが必要な場合は、実際のドメインを所有するアカウントの **Web Analytics → Add a site** でCloudflareによりプロキシされているhostnameを選び、automatic setupを使用してください。Cloudflareがエッジでbeaconを自動挿入します。

各字群の詳細ページはそれぞれ独立したHTMLとして生成されます。ページデータはローカルbundleに含まれるため、ルートごとの追加 `_payload.json` を生成するpayload extractionは無効にしています。地域異体字の別名については、リダイレクト専用ページを生成しません。Static Assetsがまず `404.html` とHTTP 404を返し、その後Nuxtのクライアントミドルウェアが対応する行へ移動します。これにより、検索エンジンが別名を成功ページとして重複登録することを避けます。実際に存在しないURLはHTTP 404のままです。`@nuxtjs/sitemap` は静的生成時にすべてのcanonicalページを `/sitemap.xml` へ書き出し、`@nuxtjs/robots` は `/robots.txt` を生成してsitemapの場所を通知します。両方の絶対URLには既定で `https://hanji.sxzz.moe` を使用し、`NUXT_SITE_URL` で上書きできます。GitHub Actionsは同名のリポジトリ変数を優先し、未設定の場合はリポジトリのhomepageを使用します。PRプレビューのビルドでは `NUXT_SITE_ENV=preview` によりインデックス登録を禁止します。`public/_headers` では、内容ハッシュ付きの `_nuxt/*` に長期immutableキャッシュを設定し、安定した `/notices/*`、sitemap、robotsのURLには `no-cache`、`/data/chars.json` には1時間の `max-age` と1日の `stale-while-revalidate` を指定します。

サードパーティ資産の具体的なcommit、GitHub release tag、公式添付ファイル識別子、SHA-256は `data/sources.lock.json` に記録しています。更新時には `pnpm update:sources` を実行します。GitHubブランチ、最新release、Unicodeバージョンを解決し、バージョンのない公式直リンクについては改めて検証します。内容が変わっていればlockfileを更新してデータを再生成し、まったく変わっていなければ生成をスキップします。ビルド時の `pnpm build:data` はlockfileに従い、約 **302 MiB** の元データをダウンロードして検証します。このうち195 MiBは10個のNoto CJKフォントで、約40 MiBは2個の補充フォントです。明示的な更新を行っていない直リンクの内容が変わった場合は、チェックサム不一致として失敗し、黙ってデータに取り込むことはありません。Actionsでは元データのダウンロードと生成フォントを別々にキャッシュします。前者はlockfileだけで決まり、後者はlockfile、実際の生成スクリプト、関連依存関係、locale、字表から決まります。フォント入力が完全に同じ場合は、データ生成を省略します。

筆順シャードは `pnpm build:dataset` が `app/assets/strokes/` に生成し、リポジトリにはコミットしません。デプロイ処理はテストと静的生成の前に毎回再生成し、Viteが内容ハッシュ付きのファイル名で出力します。付属ライセンスは `public/notices/` の安定URLに置き、再検証を必須にします。同じ字グループ内で筆画順に並べた輪郭が完全に一致する場合は、最初のバリアントとその中心線だけを保存し、画面上でも対応する地域を1つの選択肢にまとめます。ページ読み込み時に所属シャードを一度だけ取得し、その後の地域切替ではメモリ上の字グループデータを再利用します。サイト全体で、ここから解析した輪郭数を第一候補の画数として使います。

ローカルでも、ビルド後に直接アップロードできます。

```bash
pnpm build:data
pnpm generate
pnpm preview:worker # http://localhost:8787
pnpm deploy
```

## データ出典

<!-- sources:start -->

| 用途                                             | 出典                                                                                                            | ライセンス                                                                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 5地域の字形差異の判定                            | [Adobe Source Han Sans / Serif（CMapリソース）](https://github.com/adobe-fonts/source-han-sans)                 | [SIL OFL 1.1](https://openfontlicense.org/)                                                                                             |
| ページ表示用フォント                             | [Noto Sans / Noto Serif（CJKを含む）](https://github.com/notofonts/noto-cjk)                                    | [SIL OFL 1.1](https://openfontlicense.org/)                                                                                             |
| Noto未収録字のゴシック体補完                     | [Plangothic P1](https://github.com/Fitzgerald-Porthmouth-Koenigsegg/Plangothic_Project)                         | [SIL OFL 1.1](https://github.com/Fitzgerald-Porthmouth-Koenigsegg/Plangothic_Project/blob/main/LICENSE-OFL.txt)                         |
| Noto未収録字の明朝体補完                         | [WenJin Mincho P2](https://github.com/takushun-wu/WenJinMincho)                                                 | [SIL OFL 1.1](https://github.com/takushun-wu/WenJinMincho/blob/main/LICENSE.md)                                                         |
| 簡体・繁体、香港・台湾異体字、日本新旧字体の対応 | [OpenCC（中国語文字変換）](https://github.com/BYVoid/OpenCC)                                                    | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)                                                                               |
| 中国・台湾・日本・韓国の筆順と画数               | [AnimCJK](https://github.com/parsimonhi/animCJK)                                                                | [Arphic Public License](https://github.com/parsimonhi/animCJK/blob/master/licenses/APL/english/ARPHICPL.TXT)                            |
| 5地域の標準字表                                  | [zispace/hanzi-chars](https://github.com/zispace/hanzi-chars)                                                   | [リポジトリに記載なし](https://github.com/zispace/hanzi-chars)                                                                          |
| 画数の補完・読み                                 | [Unicode Han Database（Unihan）](https://www.unicode.org/reports/tr38/)                                         | [Unicode License v3](https://www.unicode.org/license.txt)                                                                               |
| 韓国式異体字の対応                               | [Unicode IRG N2200（韓国教育用漢字提案）](https://www.unicode.org/L2/L2017/17173-irgn2200-unihan-db.pdf)        | [Unicode License v3](https://www.unicode.org/license.txt)                                                                               |
| 中国大陸の文字頻度順位                           | [hanziDB.csv（Jun Da『現代中国語単字頻度一覧』）](https://github.com/ruddfawcett/hanziDB.csv)                   | [MIT](https://opensource.org/licenses/MIT)                                                                                              |
| 香港の文字頻度順位                               | [粵典「コーパス単字使用頻度」](https://words.hk/faiman/analysis/charcount/)                                     | [Public Domain](https://words.hk/faiman/analysis/)                                                                                      |
| 台湾の文字頻度順位                               | [国家教育研究院『民國112年語料字頻表』](https://teric.naer.edu.tw/wSite/ct?ctNode=645&mp=teric_b&xItem=2068770) | [ウェブサイト資料開放宣言（出典明記が必要）](https://teric.naer.edu.tw/wSite/ct?xItem=2000016&ctNode=624&mp=teric_b&idPath=588_623_624) |
| 日本の文字頻度順位                               | [scriptin/kanji-frequency（日本語版Wikipedia）](https://scriptin.github.io/kanji-frequency/)                    | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)                                                                               |

<!-- sources:end -->

原典となる標準は、中国大陸の『通用規範漢字表』（2013年）、台湾の『常用國字標準字體表』（1982年）、香港の『常用字字形表』、日本の『常用漢字表』（2010年）と『学年別漢字配当表』（2017年）、韓国の『漢文教育用基礎漢字』（2000年）です。

1字ずつ比較できるツール [tofu.tools](https://tofu.tools/) は本プロジェクトの先行例で、同じくNotoファミリーを使って地域字形を区別しています。希少字の補充字形を提供してくださったPlangothicとWenJin Minchoのメンテナーにも感謝します。

フォントはNoto Sans CJK、Noto Serif CJK、Plangothic P1、WenJin Mincho P2（すべてSIL OFL 1.1）を本アプリで使う文字にサブセット化したものです。ライセンス文は [`/notices/noto-ofl.txt`](public/notices/noto-ofl.txt)、[`/notices/plangothic-ofl.txt`](public/notices/plangothic-ofl.txt)、[`/notices/wenjin-mincho-ofl.md`](public/notices/wenjin-mincho-ofl.md) に同梱しています。生成データファイルは上記の出典から派生しているため、それぞれのライセンスに従ってください。項目ごとの変換方法と帰属表示は、公開されている [`/notices/data-sources.md`](public/notices/data-sources.md) にも記載しています。

## License

- ソースコード、UI実装、およびプロジェクト独自の文書：[MIT](LICENSE)。
- 別途明記されている場合を除き、Hanjiが独自に作成したデータベース構造、データの選択・配列、および独自メタデータ：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。
- 第三者データとその派生フィールド、フォント、筆順データ：上記の個別ライセンスが引き続き適用されます。
- 「漢智」「Hanji」、公式Logo、およびブランド識別子は上記の許諾に含まれません。許可なく公開する改変版、フォーク、または独自運用版で、これらを名称やブランドに使用することはできません。「漢智をベースに開発」といった事実に即した説明は可能ですが、公式版であることや公式の承認を得ていることを示唆してはなりません。

適用範囲、第三者例外、名称利用規則の全文は [LICENSE](LICENSE) を参照してください。© [Kevin Deng](https://github.com/sxzz)
