# スケジュール通知システム

メールから打ち合わせ情報を自動抽出し、Discordに通知するシステム。

## 機能概要

- Gmailから指定メールアドレスの未読メールを取得
- メール本文から打ち合わせ情報を自動抽出
- 抽出した情報をDiscordに通知
- 処理済みメールにラベルを付与

## セットアップ手順

1. リポジトリをクローン
   ```
   git clone https://github.com/yourusername/schedule_notification_2.git
   cd schedule_notification_2
   ```

2. 環境変数の設定
   - `.env.sample`ファイルを`.env`にコピー
   - `.env`ファイルに実際の値を設定

   ```
   cp .env.sample .env
   ```

3. 必要なパッケージのインストール
   ```
   npm install
   ```

4. Google Apps Scriptへのデプロイ
   ```
   clasp login
   clasp push
   ```

## 環境変数

以下の環境変数を`.env`ファイルに設定してください：

- `EMAIL_ADDRESS`: 監視するメールアドレス
- `EMAIL_PASSWORD`: メールアカウントのパスワード（アプリパスワードを推奨）
- `MAILING_LIST`: フィルタリングするメーリングリスト
- `GEMINI_API_KEY`: Google Gemini APIキー
- `GEMINI_API_MODEL`: 使用するGeminiモデル
- `DISCORD_WEBHOOK_URL`: Discord WebhookのURL
- `DAYS_TO_SEARCH`: 検索する過去の日数
- `PROCESSED_LABEL`: 処理済みメールに付けるラベル
- `MAX_THREADS`: 一度に処理するスレッド数の上限

## セキュリティ注意事項

- `.env`ファイルには機密情報が含まれるため、Gitリポジトリにコミットしないでください
- `.gitignore`ファイルに`.env`が含まれていることを確認してください
- APIキーやパスワードを公開リポジトリにプッシュしないよう注意してください

## 詳細設計

詳細な設計情報は[basic.design.md](basic.design.md)を参照してください。

## 機能

- Gmailから指定メールアドレスの未読メールを取得
- メール本文から打ち合わせ情報を抽出（Gemini AI使用）
- 抽出した情報をDiscordに通知
- 処理済みメールにラベルを付与

## 技術スタック

- Google Apps Script
- Gmail API
- Gemini AI API
- Discord Webhook API

## セットアップ方法

### 1. 環境変数の設定

`.env.sample`を参考に、`.env`ファイルを作成し、必要な環境変数を設定します。

```
EMAIL_ADDRESS=your_email@example.com
EMAIL_PASSWORD=your_password
MAILING_LIST=mailing_list@example.com
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_MODEL=gemini-2.0-flash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url
DAYS_TO_SEARCH=60
PROCESSED_LABEL=Processed
MAX_THREADS=10
```

### 2. Google Apps Scriptプロジェクトの作成

1. [Google Apps Script](https://script.google.com/) にアクセスし、新しいプロジェクトを作成します。
2. `.clasp.json`ファイルの`scriptId`に、作成したプロジェクトのIDを設定します。

### 3. claspのインストールと設定

```bash
# claspのインストール
npm install -g @google/clasp

# Googleアカウントにログイン
clasp login

# プロジェクトのプッシュ
clasp push
```

### 4. 環境変数の反映

Google Apps Scriptエディタで`setEnvVars`関数を実行し、環境変数をスクリプトプロパティに反映します。

### 5. トリガーの設定

Google Apps Scriptエディタで`setupTrigger`関数を実行し、定期実行トリガーを設定します。

## 使い方

システムは設定したトリガーに従って自動的に実行されます（デフォルトでは1時間ごと）。

手動で実行する場合は、Google Apps Scriptエディタで`runManually`関数を実行します。

## ファイル構成

- `src/appsscript.json`: Google Apps Scriptプロジェクト設定
- `src/Main.js`: エントリーポイント、全体の処理フロー制御
- `src/MailService.js`: Gmail APIを使用したメール操作
- `src/GeminiService.js`: Gemini AIを使用した情報抽出
- `src/DiscordService.js`: Discord Webhookを使用した通知
- `src/Config.js`: システム設定の管理
- `src/Utils.js`: ユーティリティ関数

## 注意事項

- Gmail APIの使用制限に注意してください。
- Gemini APIの使用制限に注意してください。
- 環境変数に含まれる機密情報（APIキーなど）は適切に管理してください。 