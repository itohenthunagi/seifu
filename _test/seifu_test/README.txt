# 生成AIステップアップガイド

## 📖 プロジェクト概要

生成AIに対して心理的抵抗を感じている方が、日常生活や業務において生成AIを抵抗なく活用できるようになることを目的としたウェブサイトです。

### 🎯 ターゲットユーザー
- ITリテラシーが普通以上の方
- AIリテラシーは高くなく、生成AIに心理的抵抗がある方
- 生成AIの具体的な活用方法や学習の進め方を知りたい方

### 🌟 特徴
- **親しみやすさと温かさ**: 専門用語を避けた優しい言葉遣い
- **見やすさ・使いやすさ**: 直感的に理解できるレイアウト
- **信頼感と専門性**: 正確な情報に基づいた学習リソース

## 🏗️ サイト構成

### 主要ページ
1. **ホームページ (index.html)** - サイト全体の紹介と各コンテンツへの導線
2. **生成AIの基礎理解ページ** - 生成AIの基本知識を網羅的に学習
3. **解像度を上げるためのページ** - より質の高い活用を目指すテクニック
4. **プロンプトエンジニアリング理解ページ** - 効果的な指示作成技術
5. **プロンプトを作成するページ** - 実践的なプロンプト作成体験

## 🛠️ 技術仕様

### 使用技術
- **HTML5** - セマンティックな構造
- **CSS3** - レスポンシブデザイン
- **JavaScript** - インタラクティブ機能（必要最小限）

### 対応ブラウザ
- Google Chrome (最新版)
- Mozilla Firefox (最新版)
- Apple Safari (最新版)
- Microsoft Edge (最新版)

### デザインシステム
- **キーカラー**: オレンジ基調
- **フォント**: 游ゴシック、Noto Sans JP
- **レイアウト**: 最大幅960px～1200px
- **レスポンシブ**: PC、タブレット、スマートフォン対応

### ホスティング環境
- **メインホスト**: [Render.com](https://dashboard.render.com/) - 静的サイトホスティング
- **データベース**: Firebase（将来の機能拡張用）
- **デプロイ**: GitHub連携による自動デプロイ

## 🚀 開発環境のセットアップ

### 必要なツール
- 現代的なWebブラウザ
- テキストエディタまたはIDE (推奨: Visual Studio Code)
- Gitバージョン管理
- GitHubアカウント
- Render.comアカウント
- Firebaseアカウント（将来利用）

### 初期設定
1. このリポジトリをクローンまたはダウンロード
2. `.env.sample` をコピーして `.env` を作成
3. 必要に応じて環境変数を設定
4. ブラウザでindex.htmlを開いて動作確認
5. GitHubリポジトリに接続
6. Render.comでデプロイ設定

### ディレクトリ構造
```
project-root/
├── index.html              # ホームページ
├── ai-basics.html          # 生成AI基礎理解ページ
├── improve-resolution.html # 解像度向上ページ
├── prompt-engineering.html # プロンプトエンジニアリング
├── prompt-creator.html     # プロンプト作成ページ
├── style.css              # メインスタイルシート
├── css/                   # CSSファイル群
│   ├── variables.css      # CSS変数定義
│   ├── base.css          # 基本スタイル
│   ├── components.css    # コンポーネント
│   └── pages.css         # ページ固有スタイル
├── js/                    # JavaScriptファイル群
│   ├── main.js           # メイン機能
│   ├── firebase-config.js # Firebase設定（将来用）
│   └── components/       # コンポーネント群
├── images/                # 画像リソース
├── docs/                  # 設計文書
│   ├── render_deploy_guide.md  # Render.comデプロイガイド
│   └── project_setup_report.md # セットアップ報告書
├── favicon.ico            # ファビコン
├── robots.txt             # SEO用ロボット制御
├── sitemap.xml           # SEO用サイトマップ
├── .env                   # 環境設定ファイル（gitignore対象）
├── .env.sample           # 環境設定テンプレート
├── basic_design.md       # 仕様書（設計文書）
├── TODO.md               # 開発TODOリスト
└── README.txt            # このファイル
```

## 📋 開発ワークフロー

### 開発フェーズ
1. **フェーズ1**: プロジェクト設計・基盤構築 ✅
2. **フェーズ2**: 共通要素・レイアウト開発
3. **フェーズ3**: 各ページコンテンツ開発
4. **フェーズ4**: インタラクティブ機能実装
5. **フェーズ5**: テスト・最適化・デプロイ

### 作業前の確認事項
- TODO.mdで現在のタスクを確認
- basic_design.mdで仕様詳細を確認
- docs/render_deploy_guide.mdでデプロイ手順を確認
- 既存コードとの整合性をチェック

### 品質管理
- 各フェーズ完了時にブラウザテストを実施
- アクセシビリティガイドラインの準拠
- レスポンシブデザインの動作確認
- コードレビューとリファクタリング
- Render.com環境での動作確認

## 🔧 環境変数について

### .env ファイル
開発環境固有の設定を管理します。
（機密情報が含まれるため、.gitignoreに含まれています）

### .env.sample ファイル
環境変数のテンプレートファイルです。
新しい開発者は、このファイルをコピーして.envを作成してください。

### 主要な設定項目
#### 基本設定
- ENVIRONMENT: 環境識別子（development/staging/production）
- DEBUG_MODE: デバッグモードのオン/オフ
- PROJECT_VERSION: プロジェクトバージョン

#### Render.com設定
- RENDER_SITE_URL: 本番サイトURL
- RENDER_SERVICE_NAME: サービス名
- RENDER_PUBLISH_DIRECTORY: 公開ディレクトリ

#### Firebase設定（将来拡張用）
- FIREBASE_PROJECT_ID: プロジェクトID
- FIREBASE_API_KEY: API キー
- FIREBASE_AUTH_DOMAIN: 認証ドメイン
- FIREBASE_MEASUREMENT_ID: アクセス解析ID

#### SEO・メタデータ設定
- SITE_BASE_URL: サイトベースURL
- META_DESCRIPTION: メタディスクリプション
- META_KEYWORDS: メタキーワード
- GA_TRACKING_ID: Google Analytics ID

## 🎨 デザインガイドライン

### カラーパレット
- **プライマリ**: オレンジ系統（#FF8C00, #FFA500）
- **ベース**: 白・薄いグレー（#FFFFFF, #F8F9FA）
- **テキスト**: ダークグレー・ブラック（#333333, #000000）
- **アクセント**: 補色として青やグリーンを検討

### タイポグラフィ
- **日本語**: 游ゴシック、Noto Sans JP
- **英語**: システムフォントスタック
- **見出し**: 階層構造を明確に表現
- **本文**: 読みやすさを最優先

### コンポーネント設計
- **ボタン**: 統一されたスタイル
- **カード**: 情報の視覚的グループ化
- **フォーム**: ユーザビリティ重視
- **ナビゲーション**: 直感的な操作性

## 📚 学習リソースとベストプラクティス

### 参考サイト
- [リベシティ スキルアップチャンネル](https://site.libecity.com/)
  - 情報整理、ナビゲーション、デザインテイストの参考

### 開発時の注意点
- ターゲットユーザーを常に意識した設計
- 専門用語の使用を避け、平易な表現を心がける
- 視覚的要素（図、イラスト、アイコン）の積極活用
- 情報の構造的整理（見出し、リスト、箇条書き）
- 段階的な学習フローの設計

### アクセシビリティ
- セマンティックHTMLの使用
- 適切なalt属性の設定
- キーボード操作への対応
- 十分なコントラスト比の確保
- 読み上げソフト対応

## 🧪 テスト項目

### 機能テスト
- 全ページの表示確認
- ナビゲーションリンクの動作
- フォーム機能の正常動作
- JavaScriptインタラクションの確認

### レスポンシブテスト
- デスクトップ表示（1200px以上）
- タブレット表示（768px～1199px）
- スマートフォン表示（767px以下）

### パフォーマンステスト
- ページ読み込み速度
- 画像最適化の効果
- CSS/JS圧縮の効果
- Render.com環境での表示速度

### SEOテスト
- メタタグの適切な設定
- OGPタグの動作確認
- サイトマップの生成
- robots.txtの設定

## 🚀 デプロイ手順

### Render.com デプロイ
**詳細手順**: `docs/render_deploy_guide.md` を参照

#### 基本ステップ
1. **GitHubリポジトリの準備**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Render.com設定**
   - [Render.com Dashboard](https://dashboard.render.com/) でStatic Site作成
   - GitHubリポジトリと連携
   - 環境変数の設定

3. **自動デプロイの確認**
   ```bash
   # コードプッシュで自動デプロイ
   git add .
   git commit -m "Update: feature implementation"
   git push origin main
   ```

### 本番環境準備
1. ファイルの最終確認
2. 画像の最適化
3. CSS/JSの圧縮
4. 本番用環境変数の設定
5. SEOファイル（robots.txt, sitemap.xml）の設置

### デプロイチェックリスト
- [ ] 全ページの動作確認
- [ ] 外部リンクの有効性確認
- [ ] メタタグの適切な設定
- [ ] ファビコンの設置
- [ ] robots.txtとsitemap.xmlの設置
- [ ] 環境変数の本番用設定
- [ ] SSL証明書の確認（Render.com自動設定）
- [ ] カスタムドメインの設定（必要に応じて）

## 🔄 メンテナンス

### 定期的な確認事項
- ブラウザ対応状況の更新
- 外部ライブラリの脆弱性チェック
- コンテンツの最新性確認
- アクセス解析データの確認
- Render.comサービス状況の確認

### バージョン管理
- 機能追加時の適切なコミット
- タグを使用したリリース管理
- 変更履歴の文書化
- ブランチ戦略の実施

### Firebase活用（将来予定）
- ユーザー管理（Authentication）
- データベース（Firestore）
- アクセス解析（Analytics）
- ホスティング（オプション）

## 📞 サポート・お問い合わせ

### 開発に関する質問
- 仕様書（basic_design.md）を先に確認
- TODOリスト（TODO.md）で進捗状況を確認
- Render.comデプロイガイド（docs/render_deploy_guide.md）を参照
- コード内のコメントを参照

### バグ報告
- 発生環境（ブラウザ、OS、画面サイズ）の明記
- 再現手順の詳細な記録
- スクリーンショットの添付
- Render.com環境での再現確認

### デプロイ問題
- Render.comのビルドログを確認
- 環境変数の設定を確認
- GitHubリポジトリの状態を確認
- docs/render_deploy_guide.mdのトラブルシューティングを参照

## 🔗 関連リンク

- **本番サイト**: https://your-app-name.onrender.com（デプロイ後）
- **Render.com Dashboard**: https://dashboard.render.com/
- **Firebase Console**: https://console.firebase.google.com/
- **GitHub Repository**: https://github.com/yourusername/ai-learning-guide

---

最終更新日: 2025年5月29日
プロジェクトバージョン: 1.0.0-dev
ホスティング環境: Render.com + Firebase
