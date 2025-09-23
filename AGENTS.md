# 初心者向け開発ガイド 🚀

このプロジェクトは **デスクトップアプリ** を作るためのものです。ウェブサイトのような見た目ですが、WindowsやMacで動くアプリケーションが作れます！

## 📋 このプロジェクトについて

このアプリは以下の技術で作られています：
- **React** - ウェブサイトのような画面を作る技術
- **TypeScript** - より安全にプログラムを書くためのJavaScriptの進化版
- **Tauri** - ウェブ技術でデスクトップアプリを作る魔法のツール
- **Tailwind CSS** - 見た目を簡単に美しくするツール

## 🏗️ プロジェクトの構造（どこに何があるか）

```
📁 プロジェクトフォルダ/
├── 📁 src/                    # React フロントエンド (TypeScript + JSX)
│   ├── 📄 main.tsx           # アプリケーションエントリポイント
│   ├── 📄 App.tsx            # ルートコンポーネント
│   ├── 📄 styles.css         # Tailwind CSS グローバルスタイル
│   ├── 📁 components/        # 再利用可能なReactコンポーネント
│   ├── 📁 hooks/             # カスタムReactフック
│   ├── 📁 utils/             # ユーティリティ関数
│   └── 📁 test/              # Vitest テストファイルとセットアップ
├── 📁 src-tauri/             # Tauri Rust バックエンド
│   ├── 📄 src/main.rs        # Tauri メインプロセス
│   ├── 📄 tauri.conf.json    # Tauri 設定 (アプリメタデータ、権限、ビルド設定)
│   └── 📄 Cargo.toml         # Rust 依存関係管理
├── 📁 docs/                  # プロジェクト仕様とドキュメント
├── 📄 package.json           # Node.js 依存関係とスクリプト
├── 📄 tsconfig.json          # TypeScript コンパイラ設定
├── 📄 vite.config.ts         # Vite ビルドツール設定
├── 📄 tailwind.config.js     # Tailwind CSS 設定
└── 📄 vitest.config.ts       # Vitest テスト設定
```

## 🚀 開発を始める前に

### 必要なもの
1. **Node.js** (バージョン18以上)
2. **Rust** (Tauriで必要)
3. **コードエディタ** (Visual Studio Codeがおすすめ)

### 初回セットアップ
```bash
# 1. 必要なパッケージをダウンロード
npm install

# 2. 開発環境を起動
npm run dev
```

## 🛠️ よく使うコマンド

### 開発コマンド

#### `npm run dev`
- **機能**: Vite開発サーバーを起動 (ポート3000、ホットリロード有効)
- **用途**: React UIをブラウザでプレビュー
- **出力**: `http://localhost:3000` でアクセス可能

#### `npm run tauri:dev`
- **機能**: Tauri開発モードでデスクトップアプリを起動
- **用途**: ネイティブAPIテスト、デスクトップ固有機能の確認
- **依存**: Rustコンパイル必須

### コード品質管理

#### `npm run format`
- **機能**: Prettier適用 (2スペースインデント、80文字幅、シングルクォート)
- **対象**: `src/**/*.{ts,tsx,js,jsx,css}`
- **実行タイミング**: コミット前必須

#### `npm run lint`
- **機能**: ESLint実行 (@typescript-eslint, react-hooks/exhaustive-deps)
- **チェック**: 型安全性、React Hooksルール、未使用変数
- **修正**: `npm run lint:fix` で自動修正可能

#### `npm run typecheck`
- **機能**: TypeScript型チェック (`tsc --noEmit`)
- **用途**: 型エラーの早期発見

### テスト

#### `npm run test`
- **機能**: Vitest watch mode
- **設定**: `vitest.config.ts`, テストセットアップ `src/test/setup.ts`
- **カバレッジ**: `npm run test:coverage`

#### `npm run test:run`
- **機能**: CI用単発テスト実行
- **用途**: プルリクエスト前の検証

#### `npm run test:ui`
- **機能**: Vitest UIランナー起動
- **アクセス**: ブラウザでテスト結果を視覚的に確認

### ビルド・デプロイ

#### `npm run build`
- **処理フロー**:
  1. TypeScript型チェック (`tsc`)
  2. Vite本番ビルド (`dist/`生成)
  3. Tauri バンドル生成 (`src-tauri/target/release/bundle/`)
- **成果物**: プラットフォーム別インストーラー

#### `npm run tauri:build`
- **機能**: Tauriアプリ単体ビルド
- **出力**: `.app` (macOS), `.exe` (Windows), `.deb/.rpm` (Linux)

## 📝 ファイルの命名ルールと配置

### React コンポーネント
- **パターン**: `PascalCase.tsx`
- **配置**: `src/components/ComponentName.tsx`
- **例**: `UserProfile.tsx`, `NavigationMenu.tsx`, `DataTable.tsx`
- **エクスポート**: `export default ComponentName` または `export { ComponentName }`

### カスタムフック
- **パターン**: `use + PascalCase.ts`
- **配置**: `src/hooks/useHookName.ts`
- **例**: `useLocalStorage.ts`, `useApiData.ts`, `useTheme.ts`

### ユーティリティ関数
- **パターン**: `camelCase.ts`
- **配置**: `src/utils/functionName.ts`
- **例**: `formatDate.ts`, `validateEmail.ts`, `apiClient.ts`
- **エクスポート**: `export const functionName = ...` (named export推奨)

### 型定義
- **パターン**: `types.ts` または `ComponentName.types.ts`
- **配置**: 使用するファイルと同じディレクトリ
- **例**: `src/components/UserProfile.types.ts`, `src/utils/types.ts`

### テストファイル
- **パターン**: `ファイル名.test.tsx` または `ファイル名.spec.tsx`
- **配置**: テスト対象ファイルと同じディレクトリ
- **例**: `UserProfile.test.tsx`, `formatDate.test.ts`

### Tauri コマンド (Rust)
- **パターン**: `snake_case`
- **配置**: `src-tauri/src/main.rs`
- **例**: `get_user_data`, `save_file`, `open_dialog`

## 🧪 テスト仕様

### テストフレームワーク構成
- **テストランナー**: Vitest
- **テストライブラリ**: @testing-library/react, @testing-library/jest-dom
- **セットアップ**: `src/test/setup.ts` (グローバル設定)
- **設定ファイル**: `vitest.config.ts`

### テストファイルパターン
```typescript
// UserProfile.test.tsx の基本構造
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import UserProfile from './UserProfile'

describe('UserProfile', () => {
  it('should render user name', () => {
    render(<UserProfile name="John Doe" />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })
})
```

### Tauri API のモック
```typescript
// Tauri関数のモック例
import { vi } from 'vitest'

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn().mockResolvedValue('mocked response')
}))
```

### テスト実行コマンド
- `npm run test` - ウォッチモード
- `npm run test:run` - 単発実行
- `npm run test:ui` - UI ブラウザ表示
- `npm run test:coverage` - カバレッジレポート生成

## 🤝 コードを保存する（コミット）ルール

### コミットメッセージの書き方
- **英語で簡潔に** (72文字以内)
- **命令形で書く**
- **例**: `Add user login feature`, `Fix button color issue`

### プルリクエスト（変更提案）に含めるもの
1. 何を変更したかの説明
2. 画面が変わった場合はスクリーンショット
3. テスト結果
4. 特別な設定が必要な場合はその説明

## 🆘 よくある問題と解決方法

### `npm run dev` が失敗する
```bash
# パッケージを再インストール
rm -rf node_modules
npm install
```

### アプリが起動しない
1. Node.jsのバージョンを確認（18以上必要）
2. `npm run dev` でブラウザ版が動くか確認
3. Rustがインストールされているか確認

### コードエラーが出る
1. `npm run lint` でエラー箇所を確認
2. `npm run format` でコードを整理
3. 型エラーの場合は変数の型を確認

### テストが失敗する
1. `npm run test:run` で詳細なエラーを確認
2. テストファイルの書き方を既存のものと比較
3. 必要に応じてテストデータを更新

## 💡 初心者向けのヒント

### 1. 小さく始める
- 一度に大きな変更をせず、少しずつ変更して動作確認

### 2. エラーを恐れない
- エラーメッセージは問題解決のヒント
- Google翻訳でエラーメッセージを日本語にしてみる

### 3. バックアップを取る
- 重要な変更の前は必ずGitでコミット

### 4. 質問する
- わからないことがあれば遠慮なく質問
- エラーメッセージも一緒に共有すると解決が早い

## 🔧 開発環境の詳細設定

### VS Code の推奨拡張機能
- **ES7+ React/Redux/React-Native snippets** - Reactコードの自動補完
- **Prettier** - コード整形
- **ESLint** - エラーチェック
- **rust-analyzer** - Rustコードサポート

### デバッグのコツ
1. ブラウザの開発者ツールを活用
2. `console.log()` でデータの中身を確認
3. React Developer Tools でコンポーネントの状態確認

---

## 🤖 AI エージェント向け技術仕様

### プロジェクト識別情報
- **フレームワーク**: Tauri 1.x + React 18 + TypeScript 5.x
- **ビルドツール**: Vite 4.x
- **パッケージマネージャー**: npm
- **Node.js要件**: >=18.0.0
- **Rust要件**: stable (MSRV 1.70)

### 重要な設定ファイル
```typescript
// tsconfig.json - TypeScript設定
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "jsx": "react-jsx"
  }
}

// vite.config.ts - ビルド設定
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true
  }
})
```

### コード品質ルール
- **ESLint**: `@typescript-eslint/recommended`, `react-hooks/exhaustive-deps`
- **Prettier**: 2スペース, 80文字, シングルクォート, セミコロンあり
- **Import順序**: 1) external, 2) internal, 3) relative
- **型定義**: `.types.ts` ファイルまたはインライン

### 必須の前処理・後処理
1. **開発前**: `npm run typecheck && npm run lint`
2. **コミット前**: `npm run format && npm run lint:fix && npm run test:run`
3. **プルリクエスト前**: `npm run build` (成功必須)

### Tauri 統合パターン
```rust
// src-tauri/src/main.rs - コマンド定義例
#[tauri::command]
async fn get_app_data() -> Result<String, String> {
    // 実装
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_app_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```typescript
// TypeScript側での呼び出し
import { invoke } from '@tauri-apps/api/tauri'

const data = await invoke<string>('get_app_data')
```

### エラーハンドリング規約
- **TypeScript**: Result型またはtry-catch with typed Error
- **React**: Error Boundary + fallback UI
- **Tauri**: Rust `Result<T, E>` パターン必須

---

**🎉 開発を楽しんでください！**
わからないことがあれば、このガイドを見返すか、チームメンバーに気軽に質問してくださいね。
