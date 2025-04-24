## 0. 前提とゴール再確認

| 項目 | 内容 |
|-----|------|
| **対象読者** | プログラミングがはじめて ✕ 非エンジニアのあなた |
| **既存資産** | ① スプレッドシート → GAS → Google カレンダーで予定＋Meetリンクを自動生成する仕組み（完成済み） |
| **やりたいこと** | その **Meet 会議が終わったら**<br>1. 文字起こしを取得<br>2. Gemini で議事録を自動生成<br>3. Drive に保存して"リンクを知る全員が編集可"に設定<br>4. Discord にリンク＋要約を自動通知 |
| **開発スタイル** | 100 % CLI／Cursor（AI コード補完）で実装し、コピペで済むレベルに落とし込む |

> **安心ポイント**  
> *コードを 1 行も暗記する必要はありません。*  
> ほぼすべて「コピー → 貼り付け → Enter」で動くよう手順を書きました。  
> "心配性" なので落とし穴は欄外で先回りして潰しておきます。

---

## 1. 準備 5 ステップ（30 分で完了）

| # | やること | 詳細 |
|---|----------|------|
| 1 | **Google Cloud プロジェクト**作成 | [console.cloud.google.com](https://console.cloud.google.com/) → 「新しいプロジェクト」 |
| 2 | **Cloud SDK** インストール | Windows: PowerShell で<br>`choco install googlecloudsdk`<br>macOS: Homebrew で<br>`brew install --cask google-cloud-sdk` |
| 3 | **gcloud 初期化** | `gcloud init` → 指示通りにブラウザが開くのでログイン＆プロジェクト選択 |
| 4 | **Cursor** セットアップ | cursor.so からアプリを DL → GitHub でサインイン |
| 5 | **Git & Node.js** | まだ無ければ：<br>`choco install git nodejs-lts` または `brew install git node` |

> **要注意**  
> 会社 PC でインストール制限がある場合、管理者権限を要確認。  
> プロキシ環境の場合は `gcloud config set proxy/type http` などを設定。

---

## 2. システム全体像（図解）

```
┌──────────────┐
│   既存GAS    │ スプレッドシート行 → カレンダー予定(+Meet)
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

*Vertex AI Agent Engine は 2025/3/4 GA 版を使用* citeturn0search0  

---

## 3. API とサービスの有効化（1 回だけ）

```bash
# 必ずプロジェクト ID を変数に入れておく
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# まとめて API 有効化（コピペ OK）
gcloud services enable \
    meet.googleapis.com \
    workspaceevents.googleapis.com \
    calendar.googleapis.com \
    drive.googleapis.com \
    pubsub.googleapis.com \
    run.googleapis.com \
    aiplatform.googleapis.com
```

> **ひと呼吸メモ**  
> 「権限が足りない」と怒られたら IAM で `Editor` 権限を付与するか、管理者に相談しましょう。

---

## 4. Calendar 変更を受け取る Cloud Function

1. **Calendar Push 通知チャンネルを作成**  
   ```bash
   # Pub/Sub topic
   gcloud pubsub topics create calendar-events

   # watch 開始（primary カレンダーの場合）
   gcloud alpha calendar channels watch \
        --id=$(uuidgen) \
        --type=pubsub \
        --address=projects/${PROJECT_ID}/topics/calendar-events \
        --calendar-id=primary
   ```
   *Push 通知の仕組みは公式ガイド参照* citeturn1search0  

2. **Cloud Function（TypeScript 40 行だけ）**  
   Cursor で `functions/cal-event-handler.ts` を作り、以下を貼り付けます。  
   コメントを読めば流れがわかるはずです（詳述省略）。

3. **デプロイ**  
   ```bash
   gcloud functions deploy cal-event-handler \
       --runtime nodejs20 \
       --trigger-topic calendar-events \
       --entry-point handler \
       --set-env-vars TOPIC=meeting-events
   ```

---

## 5. Meet の「文字起こしできたよ」イベントを捕まえる

Google Workspace Events API＋Meet REST API で "transcript_ready" を受信します。  
Python サンプルが公式にあるので、そのまま Function 化します。 citeturn1search5  

```bash
gcloud functions deploy transcript-handler \
    --runtime python312 \
    --trigger-event-provider=workspace.googleapis.com \
    --trigger-resource="meet.google.com/*" \
    --entry-point main \
    --set-env-vars TOPIC=meeting-events
```

---

## 6. Vertex AI Agent Engine ― "頭脳" を用意

1. **Agent Engine インスタンス作成**  
   ```bash
   gcloud alpha agent-engine instances create meet-minutes-engine \
       --region=us-central1 \
       --replica-count=1
   ```

2. **Gemini 2.5 Pro を使う理由**  
   - 長い会議でも論旨を崩さず要約できる  
   - Flash と切り替え可能（あとで節約策として） citeturn0search6  

3. **Vertex AI SDK** をプロジェクトに追加  
   ```bash
   npm install @google-cloud/aiplatform --save
   ```

4. **シンプルなタスク定義 (`agents/minutes-agent.ts`)**

   ```ts
   export default defineAgent({
     tools: [driveTool, discordTool],
     async run({ transcriptGcsUri }) {
       const text = await gemini.proGenerate(`
         以下の議事録を日本語で要約し、決定事項とTODOを箇条書きにしてください:
         """${await download(transcriptGcsUri)}"""
       `);
       const docId = await driveTool.createDoc(text, { anyoneCanEdit: true });
       await discordTool.post({
         title: "会議終了！議事録できました",
         url: `https://docs.google.com/document/d/${docId}/edit`,
         description: text.slice(0, 120) + "..."
       });
     }
   });
   ```

> **怖がりメモ**  
> - API キーは不要。サービスアカウントに "Vertex AI Administrator" と "Drive Admin" を付与。  
> - Discord Webhook URL は Secret Manager で管理し、環境変数に注入。  

---

## 7. ディレクトリ構成例

```
meet-automation/
├─ functions/
│  ├─ cal-event-handler.ts
│  └─ transcript-handler.py
├─ agents/
│  └─ minutes-agent.ts
└─ package.json
```

Cursor で新規リポジトリを作り、AI コード補完（`⌘+K > "/tests"`）でテストも自動生成できます。

---

## 8. テスト計画（初心者向け）

| フェーズ | テスト内容 | やり方 |
|---------|-----------|--------|
| **手動** | カレンダーにダミー予定を入れる→Cloud Function のログを Cloud Console で確認 | "ログが出たら OK" |
| **自動** | minutes-agent のユニットテスト | Cursor で `npm test`（AI が雛形を作ってくれます） |
| **E2E** | 試験用 Discord サーバーに通知が来るか | Webhook のチャンネルを自分だけ見える "sandbox" にすると安心 |

---

## 9. よくあるハマりポイント & 予防策

| 症状 | 原因 | 処方箋 |
|------|------|-------|
| Discord に投稿されない | Webhook URL ミス or Secret Manager 権限不足 | URL 再発行 → `gcloud secrets add-iam-policy-binding` |
| Drive の編集権限が付かない | サービスアカウントに Drive 権限なし | IAM で **Drive API Service Agent** を追加 |
| Calendar Push が来ない | watch の有効期限切れ（最大 7 日） | `channels.stop` → 再 `watch` を定期実行 (Cloud Scheduler) |

---

## 10. 今後の拡張アイデア（余裕ができたら）

1. **多言語議事録** ― transcript の言語を自動判別して Gemini 2.5 に指示。  
2. **要約ショート動画** ― 動画アーティファクトを生成し、サマリー動画を Drive に保存。  
3. **Looker Studio ダッシュボード** ― 会議数・発話量を可視化。  