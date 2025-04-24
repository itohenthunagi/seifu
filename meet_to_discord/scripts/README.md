# Meet-to-Discord セットアップ・デプロイスクリプト

このディレクトリには、Meet-to-Discordプロジェクトのセットアップとデプロイに必要なスクリプトが含まれています。

## スクリプト一覧

### 1. setup-auth.js

Google Cloud認証関連の設定を行うスクリプトです。以下の処理を実行します：

- 必要なGoogle Cloud APIの有効化
- サービスアカウントの作成と権限付与
- サービスアカウントキーの生成
- Discord Webhook URLのSecret Managerへの登録

#### 使用方法
```bash
node scripts/setup-auth.js
```

#### 必要な情報
- Google CloudプロジェクトID
- Discord Webhook URL

#### 注意点
- 実行前にGoogle Cloud SDKのインストールと初期設定が必要です
- `gcloud auth login`でGoogleアカウントへのログインが必要です
- プロジェクト作成権限を持つアカウントで実行してください

### 2. deploy.js

Google Cloudへのデプロイを行うスクリプトです。以下の処理を実行します：

- TypeScriptのビルド
- Pub/Subトピックの作成
- Cloud Functions（カレンダーイベントハンドラ、会議文字起こしハンドラ）のデプロイ

#### 使用方法
```bash
node scripts/deploy.js
```

#### 必要な情報
- Google CloudプロジェクトID
- デプロイリージョン（デフォルト: asia-northeast1）

#### 注意点
- 実行前に`setup-auth.js`を実行してサービスアカウントを設定しておくことを推奨します
- デプロイ完了後、Workspace Events APIの設定は手動で行う必要があります

## 前提条件

### ソフトウェア要件
- Node.js v18以上
- npm v9以上
- Google Cloud SDK（最新版）

### 権限要件
- Google Cloudプロジェクト作成権限
- IAM管理権限
- Cloud Functions管理権限
- Secret Manager管理権限

## トラブルシューティング

### よくある問題
1. **「gcloud: command not found」エラー**  
   → Google Cloud SDKがインストールされていないか、PATHに設定されていません

2. **「You do not have permission to access project」エラー**  
   → 実行中のGoogleアカウントに必要な権限がありません

3. **「Failed to create service account」エラー**  
   → プロジェクトIDが正しくないか、権限が不足しています

### 解決策
- `gcloud auth login`でログインし直してください
- Google Cloud Consoleでプロジェクト権限を確認してください
- プロジェクトの課金が有効になっていることを確認してください

## サポート

問題が発生した場合は、リポジトリのIssuesでご報告ください。 