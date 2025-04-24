# Meet to Discord

Google Meet の会議が終わったら、自動的に議事録を生成し Discord に通知するシステム

## システム概要

このシステムは以下の流れで動作します：

1. Google カレンダーで予定が作成/更新されると、Cloud Function（`cal-event-handler`）がトリガーされる
2. Meet 会議が含まれる場合、会議情報を Pub/Sub トピック（`meeting-events`）に送信
3. Meet 会議で文字起こしが完了すると、Workspace Events API から通知を受け取り、Cloud Function（`transcript-handler`）がトリガーされる
4. 文字起こしデータを Vertex AI Agent Engine で処理し、Gemini モデルで議事録を生成
5. 議事録を Google Docs に保存し、"リンクを知る全員が編集可" に設定
6. Discord に議事録リンクと要約を通知

```
┌──────────────┐
│   Google     │ 
│  Calendar    │ スプレッドシート行 → カレンダー予定(+Meet)
└──────┬───────┘
       │Calendar Push通知
       ▼
┌────────────────────────┐
│Cloud Function cal-event │ MeetイベントID を Pub/Sub にPublish
└──────┬──────────────────┘
       ▼
┌────────────────────────┐
│Pub/Sub topic meeting-events│
└──────┬──────────────────┘
       ▼
┌────────────────────────┐
│Vertex AI Agent Engine    │ Transcript DL → Geminiで議事録作成
└──────┬───────────────┘
       ▼
┌──────▼──────┐  ┌─────────┐
│Google Docs   │  │Discord  │
│(ACL=全員編集)│→│通知Embed│
└────────────┘  └─────────┘
```

## 前提条件

- Google Cloud アカウント
- Google Workspace アカウント（Meet の文字起こし機能を使用するため）
- Discord サーバーと Webhook URL
- Node.js v18.x以上
- Python 3.12（トランスクリプトハンドラ用）
- Google Cloud SDK

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd meet-to-discord
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 自動セットアップスクリプトの実行

認証とデプロイをサポートする便利なスクリプトを用意しています。

#### 3.1 Google Cloud認証設定

```bash
# サービスアカウント作成、API有効化、Discord WebhookのSecret Manager登録を行うスクリプト
node scripts/setup-auth.js
```

プロンプトに従って以下の情報を入力:
- Google CloudプロジェクトID
- Discord Webhook URL

#### 3.2 Cloud Functionsのデプロイ

```bash
# TypeScriptコンパイル、Pub/Subトピック作成、Cloud Functions自動デプロイを行うスクリプト
node scripts/deploy.js
```

プロンプトに従って以下の情報を入力:
- Google CloudプロジェクトID
- デプロイリージョン（デフォルト: asia-northeast1）

### 4. Workspace Events API の手動設定

スクリプトによるデプロイが完了したら、Google Cloud コンソールでWorkspace Events API の設定を行います:

1. [Google Cloud コンソール](https://console.cloud.google.com/) を開く
2. [Google Workspace 通知の設定](https://console.cloud.google.com/workspace/notifications) を開く
3. 「ウォッチャーを作成」をクリック
4. 以下の設定で作成:
   - 名前: meet-transcript-watcher
   - ドメイン: あなたのGoogleワークスペースドメイン
   - サービス: Google Meet
   - イベントタイプ: transcript_ready
   - 配信方法: Cloud Functions
   - 関数: transcript-handler
   - リージョン: 先ほど指定したリージョン
5. 「作成」ボタンをクリック

## テスト方法

### 1. Discord通知のテスト

```bash
node test_discord.js
```

指定したDiscordチャンネルに通知が届くことを確認してください。

### 2. エージェントのテスト

```bash
node test_agent.js
```

コンソールに以下のメッセージが表示されることを確認:
- 「議事録の生成が完了しました」
- 「Discord通知が完了しました」

### 3. トランスクリプトハンドラのテスト

#### ユニットテスト実行
```bash
cd functions
pip install -r requirements.txt
cd ../tests
python -m unittest test_transcript_handler.py
```

#### エンドツーエンドテスト実行
```bash
cd functions
pip install -r requirements.txt functions-framework
functions-framework --target=main --signature-type=event
```

別のターミナルから:
```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d @../test_data/test_transcript_event.json
```

詳細なテスト手順は `テスト計画.md` ファイルを参照してください。

## 使用方法

1. Google カレンダーで Meet リンク付きの予定を作成
2. 会議中に文字起こし機能を有効にする
3. 会議終了後、自動的に議事録が生成され Discord に通知される

## トラブルシューティング

### よくある問題と解決策

#### Discord通知が届かない
1. Webhook URLの有効性を確認
2. ネットワークの接続を確認
3. Discord側の設定を確認
4. Secret Managerの権限確認: `gcloud secrets get-iam-policy discord-webhook-url`

#### 文字起こしデータが取得できない
1. GCSのバケットへのアクセス権限を確認
2. URIの形式が正しいか確認
3. ストレージクラスを確認（Coldline等だと取得に時間がかかる）

#### Google Docsが作成されない
1. サービスアカウントに適切な権限があるか確認
2. Drive APIが有効化されているか確認
3. クォータ制限に達していないか確認

#### カレンダーPush通知の有効期限切れ
1. Push通知チャンネルは7日で期限切れになります。以下のコマンドで更新:
```bash
gcloud alpha calendar channels watch \
    --id=$(uuidgen) \
    --type=pubsub \
    --address=projects/${PROJECT_ID}/topics/calendar-events \
    --calendar-id=primary
```

### ログ確認方法

各コンポーネントのログを確認するコマンド:

```bash
# カレンダーイベントハンドラのログ
gcloud functions logs read cal-event-handler

# 文字起こしハンドラのログ
gcloud functions logs read transcript-handler
```

詳細なログを表示するには:

```bash
gcloud functions logs read function-name --limit=50 --format=json
```

## プロジェクト構成

```
meet-to-discord/
├─ functions/               # Cloud Functions
│  ├─ cal-event-handler.ts  # カレンダーイベント処理
│  ├─ transcript-handler.py # 文字起こしイベント処理
│  └─ requirements.txt      # Python依存関係
├─ agents/
│  └─ minutes-agent.ts      # 議事録生成エージェント
├─ scripts/
│  ├─ setup-auth.js         # 認証設定スクリプト
│  └─ deploy.js             # デプロイスクリプト
├─ tests/
│  └─ test_transcript_handler.py # Python単体テスト
├─ test_data/
│  ├─ sample_transcript.txt # テスト用文字起こしデータ
│  └─ test_transcript_event.json # テスト用イベントデータ
├─ test_agent.js            # エージェントテスト
├─ test_discord.js          # Discord通知テスト
├─ テスト計画.md             # テスト手順
├─ 作業ログ.md               # 開発進捗ログ
└─ README.md                # 本ドキュメント
```

## 今後の拡張アイデア

1. **多言語議事録** - 文字起こしの言語を自動判別し対応
2. **要約ショート動画** - 会議のハイライト動画を生成
3. **Looker Studio ダッシュボード** - 会議数・発話量を可視化

## ライセンス

ISC
