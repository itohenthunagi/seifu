# 🚀 Render.com 設定手順書

**プロジェクト**: 生成AIステップアップガイド  
**リポジトリ**: https://github.com/itohenthunagi/seifu.git  
**対象**: ホスティング初心者でもわかる詳細手順

---

## 📝 ステップ・バイ・ステップ設定ガイド

### Step 1: Render.com アカウント作成

1. [Render.com](https://dashboard.render.com/) にアクセス
2. **"Get Started"** または **"Sign Up"** をクリック
3. GitHubアカウントでサインアップ（推奨）
   - **"Sign Up with GitHub"** をクリック
   - GitHubでの認証を許可
4. アカウント設定を完了

### Step 2: Static Site の作成

#### 2-1. 新しいサービス作成
1. Render.com ダッシュボードで **"New +"** ボタンをクリック
2. **"Static Site"** を選択

#### 2-2. リポジトリの接続
1. **"Connect a repository"** セクションで **"GitHub"** を選択
2. 必要に応じて追加の権限を許可
3. **"itohenthunagi"** のアカウントから **"seifu"** リポジトリを選択
4. **"Connect"** をクリック

#### 2-3. 基本設定
以下の項目を設定してください：

**Name（サイト名）**:
```
ai-learning-guide
```

**Branch（ブランチ）**:
```
main
```

**Root Directory（ルートディレクトリ）**:
```
（空白のまま）
```

**Build Command（ビルドコマンド）**:
```
（空白のまま - 静的サイトなのでビルド不要）
```

**Publish Directory（公開ディレクトリ）**:
```
.
```

### Step 3: 環境変数の設定

#### 3-1. 環境変数ページへ移動
1. サイト作成後、**"Settings"** タブをクリック
2. 左メニューから **"Environment"** を選択

#### 3-2. 環境変数を追加
**"Add Environment Variable"** ボタンをクリックして、以下の変数を1つずつ追加：

**基本設定**:
```
Key: ENVIRONMENT
Value: production

Key: DEBUG_MODE
Value: false

Key: PROJECT_VERSION
Value: 1.0.0

Key: SITE_BASE_URL
Value: https://ai-learning-guide.onrender.com
```

**SEO設定**:
```
Key: META_DESCRIPTION
Value: 生成AIの基本的な使い方を学び、日常生活や業務で活用できるスキルを身につけるためのステップアップガイド

Key: META_KEYWORDS
Value: 生成AI,プロンプトエンジニアリング,AI活用,学習ガイド
```

**パフォーマンス設定**:
```
Key: IMAGE_QUALITY
Value: 90

Key: CACHE_DURATION
Value: 86400
```

### Step 4: デプロイ実行

1. 設定完了後、**"Create Static Site"** をクリック
2. 自動的にデプロイが開始されます
3. **"Deploy"** タブでデプロイ状況を確認

### Step 5: デプロイ完了確認

#### 5-1. デプロイ状況の確認
- **"Deploys"** タブで緑色の **"Live"** マークを確認
- ビルドログで "Deploy succeeded" を確認

#### 5-2. サイトURLの確認
- ダッシュボード上部に表示されるURLをクリック
- 例: `https://ai-learning-guide.onrender.com`

#### 5-3. 動作確認
以下のページが正常に表示されることを確認：
- ✅ ホームページ: `/`
- ✅ CSS・スタイルの適用確認
- ✅ レスポンシブデザインの動作確認

---

## 🔧 設定後の運用

### 自動デプロイの確認
GitHubにプッシュするたびに自動でデプロイされます：

```bash
# ローカルで変更作業
git add .
git commit -m "Update: サイト改善"
git push origin main

# Render.comで自動デプロイが開始
# 通常2-3分で完了
```

### デプロイ通知の設定
1. **Settings > Notifications** で通知設定
2. Slackまたはメール通知を設定可能

### カスタムドメインの設定（オプション）
1. **Settings > Custom Domains**
2. 独自ドメインがある場合は追加可能
3. SSL証明書は自動で設定されます

---

## 🔍 トラブルシューティング

### よくある問題と解決法

#### ❌ Deploy Failed
**症状**: デプロイが失敗する
**確認事項**:
1. **Deploys > ログ** を確認
2. HTMLの構文エラーがないか確認
3. ファイルパスの大文字・小文字を確認

#### ❌ ページが表示されない
**症状**: 404エラーまたは白い画面
**確認事項**:
1. `index.html` がルートディレクトリにあるか確認
2. Publish Directoryが「.」になっているか確認
3. ブラウザのキャッシュをクリア

#### ❌ CSS・スタイルが反映されない
**症状**: HTMLは表示されるがスタイルがない
**確認事項**:
1. CSSファイルのパスが正しいか確認
2. 相対パス（`./css/style.css`）を使用
3. ファイル名の大文字・小文字を確認

#### ❌ 環境変数が効かない
**症状**: 設定した環境変数が反映されない
**確認事項**:
1. 環境変数の形式が正しいか確認
2. デプロイ後に反映されているか確認
3. JavaScriptで環境変数を使用する場合はブラウザ制限に注意

---

## 📊 サイト管理・分析

### Render.com ダッシュボードの活用

#### Analytics（アクセス解析）
- **Usage** タブで帯域使用量を確認
- リクエスト数とデータ転送量をモニタリング

#### Logs（ログ）
- **Logs** タブでアクセスログを確認
- エラーログの監視

#### Deploys（デプロイ履歴）
- 過去のデプロイ履歴を確認
- 特定のコミットに戻すことも可能

### 外部分析ツールの活用
- **Google Analytics**: より詳細なアクセス解析
- **Google Search Console**: SEO状況の確認
- **PageSpeed Insights**: パフォーマンス測定

---

## 🎯 次のステップ

### 短期目標（今週中）
1. ✅ Render.comデプロイ完了
2. ⏳ 各ページのコンテンツ追加
3. ⏳ SEOファイル（robots.txt, sitemap.xml）の追加
4. ⏳ ファビコンの設定

### 中期目標（来月中）
1. ⏳ Firebase設定（Analytics）
2. ⏳ Contact フォームの追加
3. ⏳ パフォーマンス最適化
4. ⏳ カスタムドメインの検討

### 長期目標（将来）
1. ⏳ Firebase Authentication 導入
2. ⏳ プロンプト保存機能
3. ⏳ ユーザーコミュニティ機能
4. ⏳ PWA（プログレッシブWebアプリ）化

---

## 📞 サポート情報

### Render.com サポート
- **ドキュメント**: https://render.com/docs
- **コミュニティ**: https://community.render.com/
- **サポートチケット**: ダッシュボード内から送信可能

### プロジェクト関連
- **TODO管理**: `TODO.md` ファイルを参照
- **仕様確認**: `basic_design.md` ファイルを参照
- **技術詳細**: `README.txt` ファイルを参照

### 緊急時の対応
1. **サイトダウン**: Render.com Status ページを確認
2. **デプロイエラー**: 前のバージョンにロールバック
3. **パフォーマンス問題**: Analyticsで原因特定

---

**作成日**: 2025年1月20日  
**最終更新**: 2025年1月20日  
**作成者**: AI天才心配性エンジニア  
**想定時間**: 初回設定 約15-20分、以降のメンテナンス 月5分程度 