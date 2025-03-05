/**
 * メールサービスクラス
 * Gmail APIを使用したメール操作を提供します
 */
class MailService {
  /**
   * 指定した条件に一致する未処理のメールを取得します
   * @returns {Array} メール情報の配列
   */
  static getUnprocessedMails() {
    try {
      // 検索クエリの構築
      const daysAgo = Utils.getDaysAgo(CONFIG.DAYS_TO_SEARCH);
      const formattedDate = Utilities.formatDate(daysAgo, 'GMT', 'yyyy/MM/dd');
      
      let query = `after:${formattedDate} is:unread`;
      
      // 送信者フィルターが設定されている場合は追加
      if (CONFIG.MAILING_LIST) {
        // from:またはcc:またはto:のいずれかに指定アドレスが含まれるメールを検索
        query += ` (from:(${CONFIG.MAILING_LIST}) OR cc:(${CONFIG.MAILING_LIST}) OR to:(${CONFIG.MAILING_LIST}))`;
      }
      
      // 処理済みラベルが付いていないメールを検索
      query += ` -label:${CONFIG.PROCESSED_LABEL}`;
      
      // デバッグ用にクエリを出力
      console.log(`検索クエリ: ${query}`);
      
      // GmailAppを使用してスレッドを検索
      const threads = GmailApp.search(query, 0, CONFIG.MAX_THREADS);
      console.log(`検索結果スレッド数: ${threads.length}`);
      
      // 各スレッドから最新のメッセージを取得
      const mailInfos = [];
      
      for (const thread of threads) {
        const messages = thread.getMessages();
        console.log(`スレッド内メッセージ数: ${messages.length}`);
        
        // スレッド内の各メッセージをチェック
        for (const message of messages) {
          // メールが未読でない場合はスキップ
          if (!message.isUnread()) {
            console.log(`メッセージはすでに既読です: ${message.getSubject()}`);
            continue;
          }
          
          console.log(`未読メッセージを検出: ${message.getSubject()}`);
          
          // メール情報を構築
          const mailInfo = {
            messageId: message.getId(),
            threadId: thread.getId(),
            subject: message.getSubject(),
            from: message.getFrom(),
            date: message.getDate(),
            body: message.getPlainBody()
          };
          
          mailInfos.push(mailInfo);
        }
      }
      
      console.log(`処理対象メール数: ${mailInfos.length}`);
      return mailInfos;
    } catch (error) {
      Utils.logError('MailService.getUnprocessedMails', error);
      return [];
    }
  }
  
  /**
   * 処理済みラベルをメールに適用します
   * @param {string} messageId メールID
   * @returns {boolean} 成功した場合はtrue
   */
  static markAsProcessed(messageId) {
    try {
      // 処理済みラベルを取得または作成
      let label = GmailApp.getUserLabelByName(CONFIG.PROCESSED_LABEL);
      if (!label) {
        label = GmailApp.createLabel(CONFIG.PROCESSED_LABEL);
      }
      
      // メッセージにラベルを適用
      const message = GmailApp.getMessageById(messageId);
      if (message) {
        message.markRead();
        const thread = message.getThread();
        label.addToThread(thread);
        return true;
      }
      
      return false;
    } catch (error) {
      Utils.logError('MailService.markAsProcessed', error);
      return false;
    }
  }
  
  /**
   * メールのURLを生成します
   * @param {string} messageId メールID
   * @returns {string} メールのURL
   */
  static getMailUrl(messageId) {
    return `https://mail.google.com/mail/u/0/#inbox/${messageId}`;
  }
} 