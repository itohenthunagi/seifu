# スケジュール通知システム 基本設計書

## 1. システム概要

メールから打ち合わせ情報を自動抽出し、Discordに通知するシステム。

## 2. 機能要件

1. Gmailから指定メールアドレスの未読メールを取得
2. メール本文から打ち合わせ情報を抽出
3. 抽出した情報をDiscordに通知
4. 処理済みメールにラベルを付与

## 3. システム構成

### 3.1 コンポーネント

- **Main**: エントリーポイント、全体の処理フロー制御
- **MailService**: Gmail APIを使用したメール操作
- **GeminiService**: Gemini AIを使用した情報抽出
- **DiscordService**: Discord Webhookを使用した通知
- **Config**: システム設定の管理
- **Utils**: ユーティリティ関数

### 3.2 処理フロー

1. 定期実行トリガーでMainが起動
2. MailServiceで指定メールアドレスの未処理メールを取得
3. GeminiServiceでメール内容を分析
4. DiscordServiceで通知を送信
5. 処理済みメールにラベルを付与

## 4. 技術仕様

### 4.1 使用技術

- Google Apps Script
- Gmail API
- Gemini AI API
- Discord Webhook API

### 4.2 データ構造

#### メール情報 (mailInfo)
```javascript
{
  messageId: string,  // メールID
  threadId: string,   // スレッドID
  subject: string,    // 件名
  from: string,       // 送信者
  date: Date,         // 受信日時
  body: string        // 本文
}
```

#### 分析結果 (analysisResult)
   ```javascript
{
  summary: string,       // 要約
  meetingDate: Date,     // 打ち合わせ日
  startTime: string,     // 開始時間
  endTime: string,       // 終了時間
  meetingUrl: string,    // 会議URL
}
```

### 4.3 Discord通知フォーマット

Discord通知は以下のフォーマットで送信されます：

```
## 📅 [件名]
### 受信日時：[yyyy/M/d（曜） HH:mm]
### 送信者：[名前] <メールアドレス>

## 📝要約
[メール本文の要約内容]

## 💻打ち合わせ詳細
### 日時：[yyyy/M/d（曜） HH:mm ～ HH:mm]
### URL：[会議URL]

### メール：[メールのURLリンク]
```

- 日付は日本語の曜日表記（日、月、火、水、木、金、土）を使用
- メールとのURLはクリック可能なリンク形式で表示
- 要約と打ち合わせ詳細は見出しレベルを分けて表示
- 件名はメッセージのタイトルとして表示

## 5. 設定項目

- PROCESSED_LABEL: 処理済みラベル名
- DISCORD_WEBHOOK_URL: Discord Webhook URL
- GEMINI_API_KEY: Gemini API キー
- MAX_THREADS: 一度に処理するスレッド数
- SENDER_FILTER: 送信者フィルター
- DATE_FILTER: 日付フィルター

## 6. 制限事項

- 一度に処理できるメール数に制限あり
- Gemini APIの利用制限あり
- 特定のメールフォーマットに依存する可能性あり