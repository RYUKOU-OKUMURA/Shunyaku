# ローカル“ホバー翻訳”アプリ：要件定義（Tauri/React・非エンジニア向け）

最終更新: 2025-09-22（JST） / 作成対象: 非エンジニアの個人開発者（AIエージェント活用前提） / 主開発OS: macOS

---

## 0. エグゼクティブサマリ
- **目的**: macOS上で、権限を極力要求せずに「スクショ→OCR→翻訳→即表示→保存」までを最短で実現するミニマルなローカルアプリを完成させる。
- **主技術**: **Tauri（Rust最小限） + React/TypeScript + TailwindCSS**。OCRは**Tesseract.js**から開始。
- **設計思想**: ①権限回避（ドラッグ&ドロップ/クリップボード優先）、②段階的成功体験（MVP→改善）、③**外部連携は URL スキーム + クリップボード優先**で“詰まらない”導線。
- **MVP目標（Phase 4 まで）**: 画像/スクショをD&D or クリップボード投入 → 5秒以内に訳文をパネル表示。設定は再起動後も保持。
- **配布**: Developer ID 署名 + notarization（macOS）。アップデートは手動確認から開始。

---

## 1. スコープ
### 1.1 対象機能（優先度: P1 > P2 > P3）
**P1（MVP）**
1. **画像入力**:  
   - D&D（PNG/JPG/PDF1ページ目）を受け付けるドロップゾーン  
   - クリップボード監視（画像/テキスト）ON/OFF（既定ON）
2. **OCR**: Tesseract.js（言語: 英/日）で画像→テキスト
3. **翻訳**: 外部API（DeepL or Google 翻訳 API のいずれか）
4. **出力表示**: フローティングパネル（前面固定/コピー/再翻訳ボタン）
5. **保存（任意モジュール）**: 設定でONにすると、**URLスキーム+クリップボード**で外部アプリに保存（例: Obsidian）。未対応ならDownloadsへ自動フォールバック。
6. **ショートカット**: 例) ⌘⌥T で「直近クリップボードを翻訳」
7. **設定保存**: 翻訳先言語、クリップボード監視ON/OFF、保存先（obsidian/downloads/none）等

**P2（改善）**
- 画像前処理（リサイズ/二値化/コントラスト強調）
- 用語集/語彙ロック（簡易辞書）
- 履歴（直近10件）

**P3（将来）**
- ネイティブOCR（Rustバインディング or macOS VisionKit）
- 自動更新（Tauri Updater）
- 多言語UI/i18n

### 1.2 スコープ外（v1ではやらない）
- 画面収録・アクセシビリティ権限を必須とする**真のホバーオーバーレイ**
- オンデバイス大規模翻訳モデルの同梱
- Windows/Linux 配布（需要次第で検討）

---

## 2. ターゲット環境
- OS: macOS 13+（Apple Silicon優先）
- CPU: Apple M1/M2/M3 世代を目安
- ネットワーク: 翻訳API利用時はオンライン前提（OCR自体はローカル）

---

## 3. ユーザーストーリー
1. **D&D 翻訳**（最頻）  
   ユーザーはブラウザやPDFからスクショを撮り、アプリへD&Dすると、数秒で訳文がパネル表示され、コピーできる。
2. **クリップボード即翻訳**  
   ⌘⇧4で範囲キャプチャ→クリップボード→自動でOCR+翻訳→パネル表示。
3. **保存（任意）**  
   結果をワンクリックで Obsidian に保存（未設定ならDownloadsへ）。

---

## 4. 非機能要件（受け入れ基準つき）
- **性能**: 2000×1200px の英語UIスクショで、**5秒以内に訳文表示**（M1/M2）。
- **信頼性**: 10回連続操作で**失敗率 < 5%**。保存ON時はURLスキーム→フォールバックで**保存失敗0**。
- **可用性**: 設定は再起動後も保持。ネット断時はOCRまで実行し、翻訳はリトライ誘導。
- **UX**: 重要操作は2クリック以内（投入→表示、またはショートカット→表示）。
- **セキュリティ/プライバシ**: 入力画像はローカル処理（OCR）。翻訳API送信時は明示。

---

## 5. アーキテクチャ
```
[UI (React/TS, Tailwind)]
  ├─ D&D / クリップボード設定 / 結果パネル / 設定画面
  └─ Web Worker: OCR(Tesseract.js)
[Bridge (Tauri Commands)]
  ├─ クリップボード監視（プラグイン）
  ├─ 翻訳API呼び出し（HTTP）
  ├─ 保存：URLスキーム起動 / ファイル保存
  └─ 設定ストア（tauri-plugin-store）
[OCR 層]
  └─ Tesseract.js (eng+jpn) → 将来差し替え可能IF
[外部連携]
  └─ Obsidian（例）：obsidian://advanced-uri + clipboard → fallback downloads
```

---

## 6. 技術スタックとライブラリ
- **アプリ**: Tauri 2.x / Rust 1.7x 以降（Rustは最小限）
- **フロント**: React 18 / TypeScript 5 / Vite / TailwindCSS
- **OCR**: Tesseract.js（言語データ: `eng`, `jpn`）
- **設定**: `tauri-plugin-store`（JSON）
- **クリップボード**: `tauri-plugin-clipboard`（または community plugin）
- **HTTP**: `fetch` または `axios`（APIキーは安全に保管）
- **翻訳API候補**: DeepL API / Google Cloud Translation / Azure Translator（いずれか1本でMVP）
- **テスト**: Playwright（E2E最低限） + Vitest（ユニット一部）

> **備考**: プラグイン名は時期で変わる可能性があるため、context7/公式ドキュメント参照運用（後述）を標準に。

---

## 7. 権限回避設計
- **画面収録/アクセシビリティ権限は要求しない**。
- 入口は**D&D**と**クリップボード**で完結。CleanShotなどの外部ツール連携は推奨だが必須ではない。
- 保存は**URLスキーム+クリップボード**を“第一経路”、未対応なら**Downloads**へ自動フォールバック。

---

## 8. 画面・UX仕様（MVP）
### 8.1 メインウィンドウ
- 上部: タブ（「翻訳」「設定」）
- 中央: ドロップゾーン（ドラッグ中は枠線点滅）
- 右: 直近結果の簡易リスト（10件）

### 8.2 フローティング結果パネル
- 要素: 原文（折りたたみ）/ 訳文（既定表示）/ コピー / 再翻訳 / 保存（ON時）
- 位置: 画面右下（ドラッグ移動可）
- 表示: 翻訳完了時に自動ポップ、Esc または×で閉じる

### 8.3 設定
- 翻訳先言語（日本語既定）
- クリップボード監視（ON/OFF, 起動時に前回値を復元）
- 保存: `none` / `downloads` / `obsidian`
- APIキー入力（マスク表示 / 保存前に疎通テスト）

### 8.4 ショートカット
- 既定: ⌘⌥T（直近クリップボード翻訳）
- 変更: v1 では固定でも可（難易度を抑える）

---

## 9. データモデル（抜粋）
```ts
// 設定
interface Settings {
  targetLang: 'ja' | 'en' | string;
  clipboardWatch: boolean; // default: true
  saveTarget: 'none' | 'downloads' | 'obsidian';
  apiProvider: 'deepl' | 'gcp' | 'azure';
  apiKeyStored: boolean; // 実キーはOSセキュア領域 or 暗号化ファイル
}

// 翻訳結果（履歴）
interface TranslationItem {
  id: string; // uuid
  createdAt: number;
  srcType: 'drop' | 'clipboard';
  ocrMs?: number; translateMs?: number; totalMs?: number;
  textSrcSample?: string; // 先頭100文字
  textTranslated?: string;
  savedVia?: 'obsidian' | 'downloads' | 'none';
  saveOk?: boolean; error?: string;
}
```

---

## 10. ログ/テレメトリ（ローカルのみ・オプトイン）
- **記録**: 方式（drop/clipboard）、処理時間（OCR/翻訳/合計）、保存経路（URL/Downloads）、成功/失敗、失敗理由
- **用途**: 性能の見える化・改善優先度決定
- 収集はローカルのみ。外部送信は**しない**（ドキュメントで明記）

---

## 11. エラーハンドリング
- OCR失敗: 「前処理を提案（拡大/コントラスト）」「再試行」ボタン
- 翻訳API: レート超過/無効キー/ネット断 → ステータス別の明確なメッセージ + リトライ
- 保存: URLスキーム失敗→自動でDownloadsへフォールバック→結果をトーストで通知

---

## 12. セキュリティ/プライバシー/法務
- 入力画像はローカル。翻訳APIへ送るのは**OCR後テキストのみ**。
- APIキーは OS Keychain（可能なら）or 暗号化ファイルで保管。リポジトリに含めない。
- Tesseract 言語データ/フォントのライセンス表記を含める。

---

## 13. ビルド/配布
- ビルド: Vite → Tauri bundler
- 署名: Apple Developer ID（個人）
- 公証: notarization（Xcode/`notarytool`）
- 配布: `.dmg` or `.app`、初期はGitHub Releasesに手動アップロード
- 更新: v1は「更新確認」ボタンでリリースページを開く（自動更新はv2）

---

## 14. 開発プロセス（非エンジニア × AIエージェント）
### 14.1 初期セットアップ
- Node.js / pnpm / Rust / Xcode CLT をインストール
- `pnpm dlx create-tauri-app`（テンプレート: React + TS）
- 実行: `pnpm tauri dev`

### 14.2 AIエージェント運用ルール
- **プロンプト雛形**
  - *設計相談*: 「この仕様を満たす最小構成のコードを生成。`tauri-plugin-store`で設定を保存し、D&D→ダミー訳文表示まで」
  - *リファクタ依頼*: 「型の厳格化、関心分離、テスト容易性を高めて」
  - *デバッグ*: 「このエラーを再現→推定原因→最小修正案→検証コマンド」
- **コーディングの流れ**
  1) 雛形生成 → 2) 小さな単位で動作確認 → 3) コミット → 4) 次の1機能
- **禁止事項**: 一度に複数機能の大改造を依頼しない。必ず動作確認を挟む。

### 14.3 context7活用（ドキュメント即参照）
- Claude等に context7 を登録して、Tauri/React/プラグインの**最新ドキュメント検索**を会話内で実行できるようにする。
- リポジトリ README に設定手順リンク/メモを記載（簡易手順でOK）。

---

## 15. ロードマップ（22週・Exit基準つき）
- **Phase 1（週1–2）**: UIモック（D&D→ダミー表示、設定画面の骨格）  
  *Exit*: D&Dでダミー訳文が出る。設定値が保存/復元される。
- **Phase 2（週3–5）**: 翻訳API接続（DeepL/GCPのどちらか1本）  
  *Exit*: 1往復<800ms（回線依存）。APIキー疎通テスト実装。
- **Phase 3（週6–8）**: Tauri機能（トレイ/ショートカット/クリップボード監視）  
  *Exit*: ⌘⌥Tで直近クリップボードの翻訳が安定動作。
- **Phase 4（週9–12）**: OCR実装（Tesseract.js, eng+jpn）と性能計測  
  *Exit*: 2000×1200で**5秒以内**、失敗率<5% を記録。
- **Phase 5（週13–16）**: UX向上（結果パネル/履歴/簡易辞書/保存モジュール）  
  *Exit*: 保存がURL→フォールバックで**失敗0**。
- **Phase 6（週17–20）**: 署名/公証/配布テスト、手順書・FAQ  
  *Exit*: リリース候補版（RC）を配布できる状態。
- **Buffer（週21–22）**: バグ修正/チュートリアル動画

---

## 16. 受け入れテスト（サンプル項目）
- 画像3種（高精細UI/小さい文字/日本語混在）で 5回ずつ試験し、基準達成を確認
- ネット断での挙動（OCRは実行・翻訳は再試行）
- 保存モジュールON/OFF、URL未対応時のフォールバック確認
- 再起動後の設定復元

---

## 17. リスクと回避策
- **OCR精度/速度不足** → 画像前処理のON/OFF、部分OCR、将来ネイティブ移行IFを維持
- **APIコスト/制限** → バッチ化/キャッシュ/再試行、無料枠の把握
- **“ホバー感”不足** → ショートカット+即時パネルで代替体験を磨く
- **署名/公証の詰まり** → 手順書化・チェックリスト化（Appleアカウント/証明書/Bundle ID）

---

## 18. チェックリスト（抜粋）
- [ ] D&D→ダミー表示
- [ ] APIキー疎通テスト
- [ ] クリップボード監視ON/OFF
- [ ] 翻訳5秒以内（標準ケース）
- [ ] 保存：URL→Downloads フォールバック
- [ ] 署名/公証通過
- [ ] リリース手順書・FAQ・既知の制約

---

## 付録 A: 推奨プロジェクト構成（例）
```
/ (repo root)
  /src
    /ui       // Reactコンポーネント
    /workers  // tesseract.js ワーカー
    /store    // 設定・履歴
    /lib      // API/保存/前処理ユーティリティ
  /src-tauri
    /src      // Rust最小コマンド
    tauri.conf.json
```

## 付録 B: 最小インターフェイス（疑似コード）
```ts
// OCR（Worker 経由）
async function ocrImage(file: File, lang: 'eng'|'jpn'): Promise<string> { /* ... */ }

// 翻訳
async function translate(text: string, to: string): Promise<string> { /* ... */ }

// 保存（URLスキーム→Downloads フォールバック）
async function save(text: string): Promise<'obsidian'|'downloads'|'none'> { /* ... */ }
```

---

> 本要件は「開発難易度を抑えつつ、確実に完成に到達する」ことを最優先に設計。疑問点や詰まりが出た箇所はAIエージェントで“最小の次の一手”に分解し、常に**小さく動かして**前進する。

