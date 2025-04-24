import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { Storage } from '@google-cloud/storage';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { google } from 'googleapis';
import * as https from 'https';
import { URL } from 'url';

// Google Cloud サービスクライアントの初期化
const vertexAI = new PredictionServiceClient();
const storage = new Storage();
const secretManager = new SecretManagerServiceClient();
const drive = google.drive('v3');
const docs = google.docs('v1');

// Discord Webhook URL
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1364971222223290548/nuGSezRwVre_wt1FL51tsHpe1zMzi4wPPjE5Ve4InIm53ZZRFiiQR5xmJ-dCFGu1kNtn";

interface TranscriptParams {
  transcriptGcsUri: string;
  meetingTitle: string;
}

/**
 * 文字起こしデータから議事録を生成するエージェント
 */
export async function processTranscript({ transcriptGcsUri, meetingTitle }: TranscriptParams) {
  try {
    console.log(`文字起こしURI: ${transcriptGcsUri} の処理を開始`);
    
    // GCSから文字起こしデータをダウンロード
    const transcriptText = await downloadFromGcs(transcriptGcsUri);
    console.log('文字起こしデータを取得しました');
    
    // Gemini で議事録を生成
    const summaryText = await generateSummaryWithGemini(transcriptText, meetingTitle);
    console.log('議事録の生成が完了しました');
    
    // Google Docsに保存
    const docId = await createGoogleDoc(meetingTitle, summaryText);
    console.log(`Google Docs作成完了: ${docId}`);
    
    // Discordに通知
    await sendToDiscord({
      title: `会議「${meetingTitle}」の議事録ができました`,
      url: `https://docs.google.com/document/d/${docId}/edit`,
      description: summaryText.slice(0, 120) + '...'
    });
    console.log('Discord通知が完了しました');
    
    return { docId, success: true };
    
  } catch (error) {
    console.error('エラー発生:', error);
    throw error;
  }
}

/**
 * GCSから文字起こしデータをダウンロード
 */
async function downloadFromGcs(gcsUri: string): Promise<string> {
  // gcs://bucket-name/path/to/file 形式のURIを解析
  const matches = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
  if (!matches) throw new Error(`無効なGCS URI: ${gcsUri}`);
  
  const [_, bucketName, filePath] = matches;
  const [content] = await storage.bucket(bucketName).file(filePath).download();
  
  return content.toString('utf-8');
}

/**
 * Geminiモデルを使って議事録を生成
 */
async function generateSummaryWithGemini(transcriptText: string, meetingTitle: string): Promise<string> {
  // この実装は簡略化しています。実際の環境では適切なGemini APIクライアントを使用してください。
  // ここではダミーの実装として、テキストを返すだけにします
  console.log(`Geminiで"${meetingTitle}"の議事録を生成中...`);
  
  // 実際のAPIを呼び出す代わりに、サンプルの議事録を返す
  return `# 会議名: ${meetingTitle}

## 要約
これはサンプルの会議要約です。実際の環境ではGemini APIを使用して生成されます。

## 主要な議論
- 議題1についての議論
- 議題2についての議論
- 議題3についての議論

## 決定事項
- 決定事項1
- 決定事項2

## TODOと次のステップ
- タスク1（担当: 山田）
- タスク2（担当: 佐藤）
- タスク3（担当: 鈴木）
`;
}

/**
 * Google Docsに議事録を作成
 */
async function createGoogleDoc(title: string, content: string): Promise<string> {
  try {
    // 認証設定
    // Note: 実際の環境では、サービスアカウント認証を使用します
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents']
    });
    google.options({ auth });
    
    // Docs作成
    const docsResponse = await docs.documents.create({
      requestBody: {
        title: `議事録: ${title} (${new Date().toLocaleDateString('ja-JP')})`
      }
    });
    
    const docId = docsResponse.data.documentId || '';
    if (!docId) {
      throw new Error('ドキュメントIDが取得できませんでした');
    }
    
    // 内容を追加
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [{
          insertText: {
            text: content,
            endOfSegmentLocation: {}
          }
        }]
      }
    });
    
    // 権限を設定 (リンクを知る全員が編集可)
    await drive.permissions.create({
      fileId: docId,
      requestBody: {
        role: 'writer',
        type: 'anyone',
        allowFileDiscovery: false
      }
    });
    
    return docId;
  } catch (error) {
    console.error('Google Docs作成エラー:', error);
    throw new Error(`ドキュメント作成エラー: ${error}`);
  }
}

interface DiscordMessage {
  title: string;
  url: string;
  description: string;
}

/**
 * Discordに通知を送信
 */
async function sendToDiscord({ title, url, description }: DiscordMessage): Promise<void> {
  try {
    // Discord Webhook用のURLを使用（直接指定）
    const webhookUrl = DISCORD_WEBHOOK_URL;
    
    // Discord Webhook用のメッセージを作成
    const message = {
      embeds: [{
        title: title,
        description: description,
        url: url,
        color: 5814783, // 青色
        timestamp: new Date().toISOString()
      }]
    };
    
    // メッセージをStringifyして準備
    const data = JSON.stringify(message);
    
    // URL解析
    const parsedUrl = new URL(webhookUrl);
    
    // リクエストオプション
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    // Promiseを返す
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        console.log('Discord Webhook ステータス:', res.statusCode);
        
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Discord通知に成功しました');
            resolve();
          } else {
            const error = new Error(`Discord通知エラー: ${res.statusCode} ${responseBody}`);
            console.error(error);
            reject(error);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('Discord通知リクエストエラー:', error);
        reject(error);
      });
      
      req.write(data);
      req.end();
    });
  } catch (error) {
    console.error('Discord通知エラー:', error);
    throw error;
  }
}

// Vertex AI Agent Engineからの呼び出し用にエクスポート
export default {
  processTranscript
};
