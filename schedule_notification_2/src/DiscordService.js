/**
 * Discordサービスクラス
 * Discord Webhookを使用した通知機能を提供します
 */
class DiscordService {
  /**
   * Discord Webhookに通知を送信します
   * @param {Object} mailInfo メール情報
   * @param {Object} analysisResult 分析結果
   * @returns {boolean} 成功した場合はtrue
   */
  static sendNotification(mailInfo, analysisResult) {
    try {
      if (!mailInfo || !analysisResult) {
        return false;
      }
      
      const webhookUrl = CONFIG.DISCORD_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('Discord webhook URL is not configured');
        return false;
      }
      
      // メールURLの生成
      const mailUrl = MailService.getMailUrl(mailInfo.messageId);
      
      // 日付と時間のフォーマット
      const receivedDate = Utils.formatDateJP(mailInfo.date);
      let meetingDateTime = '';
      
      if (analysisResult.meetingDate) {
        const meetingDateStr = Utils.formatDateJP(analysisResult.meetingDate);
        const startTime = Utils.formatTime(analysisResult.startTime);
        const endTime = Utils.formatTime(analysisResult.endTime);
        
        if (startTime && endTime) {
          meetingDateTime = `${meetingDateStr} ${startTime} ～ ${endTime}`;
        } else if (startTime) {
          meetingDateTime = `${meetingDateStr} ${startTime}～`;
        } else {
          meetingDateTime = meetingDateStr;
        }
      }
      
      // 会議URLのフォーマット
      let meetingUrlText = '';
      if (analysisResult.meetingUrl) {
        meetingUrlText = `### URL：${analysisResult.meetingUrl}\n\n`;
      }
      
      // Discord通知メッセージの構築
      const message = `## 📅 ${mailInfo.subject}
### 受信日時：${receivedDate}
### 送信者：${mailInfo.from}

## 📝要約
${analysisResult.summary}

## 💻打ち合わせ詳細
### 日時：${meetingDateTime}
${meetingUrlText}### メール：[メールを開く](${mailUrl})`;
      
      // Discord Webhookにリクエストを送信
      const payload = {
        content: message
      };
      
      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      const response = UrlFetchApp.fetch(webhookUrl, options);
      const responseCode = response.getResponseCode();
      
      if (responseCode !== 204) {
        console.error(`Discord webhook error: ${responseCode}`);
        console.error(response.getContentText());
        return false;
      }
      
      return true;
    } catch (error) {
      Utils.logError('DiscordService.sendNotification', error);
      return false;
    }
  }
} 