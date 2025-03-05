/**
 * スケジュール通知システム
 * メールから打ち合わせ情報を自動抽出し、Discordに通知するシステム
 */

/**
 * メイン処理を実行します
 * 定期実行トリガーから呼び出されます
 */
function main() {
  try {
    console.log('スケジュール通知処理を開始します');
    
    // 未処理のメールを取得
    const mailInfos = MailService.getUnprocessedMails();
    console.log(`未読のメール: ${mailInfos.length}件`);
    
    if (mailInfos.length === 0) {
      console.log('処理対象のメールがありません');
      return;
    }
    
    // 各メールを処理
    let processedCount = 0;
    let errorCount = 0;
    
    for (const mailInfo of mailInfos) {
      try {
        console.log(`メール処理: ${mailInfo.subject}`);
        
        // メール内容を分析
        const analysisResult = GeminiService.analyzeMailContent(mailInfo);
        
        if (!analysisResult) {
          console.error(`メール分析に失敗しました: ${mailInfo.messageId}`);
          errorCount++;
          continue;
        }
        
        // Discordに通知
        const notificationResult = DiscordService.sendNotification(mailInfo, analysisResult);
        
        if (!notificationResult) {
          console.error(`Discord通知に失敗しました: ${mailInfo.messageId}`);
          errorCount++;
          continue;
        }
        
        // 処理済みとしてマーク
        MailService.markAsProcessed(mailInfo.messageId);
        
        processedCount++;
        console.log(`メール処理完了: ${mailInfo.subject}`);
      } catch (error) {
        console.error(`メール処理中にエラーが発生しました: ${error.message}`);
        console.error(error.stack);
        errorCount++;
      }
    }
    
    console.log(`処理完了: 成功=${processedCount}件, 失敗=${errorCount}件`);
  } catch (error) {
    console.error(`メイン処理でエラーが発生しました: ${error.message}`);
    console.error(error.stack);
  }
}

/**
 * 定期実行トリガーを設定します
 */
function setupTrigger() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  // 新しいトリガーを作成（1時間ごとに実行）
  ScriptApp.newTrigger('main')
    .timeBased()
    .everyHours(1)
    .create();
  
  console.log('トリガーを設定しました（1時間ごとに実行）');
}

/**
 * 環境変数をスクリプトプロパティに設定します
 * ローカル開発環境から設定を反映する際に使用します
 */
function setEnvVars() {
  const config = {
    EMAIL_ADDRESS: 'd@bonginkan.ai',
    EMAIL_PASSWORD: 'aib2024dai',
    MAILING_LIST: 'sales@bonginkan.ai',
    GEMINI_API_KEY: 'AIzaSyBzBnEbayPCr7GGnpWU6Ng68gLZQRbRYQQ',
    GEMINI_API_MODEL: 'gemini-2.0-flash',
    DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/1340616329299886091/xDZVhDyz3VvrwjUEohEwvCsJtRjQMPfDyXI6Q9JJaCIdl-TzIUjUwsBK7DLXq1QTMAgu',
    DAYS_TO_SEARCH: 60,
    PROCESSED_LABEL: 'Processed',
    MAX_THREADS: 10
  };
  
  Config.saveConfig(config);
  console.log('環境変数をスクリプトプロパティに設定しました');
}

/**
 * 手動実行用の関数
 * スクリプトエディタから直接実行できます
 */
function runManually() {
  main();
} 