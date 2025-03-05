/**
 * ユーティリティ関数群
 * 共通で使用する便利な関数を提供します
 */
class Utils {
  /**
   * 日付を日本語形式でフォーマットします
   * @param {Date} date フォーマットする日付
   * @returns {string} フォーマットされた日付文字列 (yyyy/M/d(曜) HH:mm)
   */
  static formatDateJP(date) {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    
    return `${year}/${month}/${day}(${dayOfWeek}) ${hours}:${minutes}`;
  }
  
  /**
   * 時間のみをフォーマットします
   * @param {string} timeStr 時間文字列
   * @returns {string} フォーマットされた時間文字列 (HH:mm)
   */
  static formatTime(timeStr) {
    if (!timeStr) return '';
    
    // 時間文字列が既にHH:mm形式の場合はそのまま返す
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    
    // 時間文字列から時間と分を抽出
    const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = (timeMatch[2] || '00').padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    return timeStr;
  }
  
  /**
   * 指定した日数前の日付を取得します
   * @param {number} days 日数
   * @returns {Date} 指定した日数前の日付
   */
  static getDaysAgo(days) {
    const date = new Date();
    // 現在の日付から指定した日数を引く（ミリ秒単位で計算）
    const pastDate = new Date(date.getTime() - (days * 24 * 60 * 60 * 1000));
    
    // デバッグ用にログ出力
    console.log(`現在の日付: ${date.toISOString()}`);
    console.log(`${days}日前の日付: ${pastDate.toISOString()}`);
    
    return pastDate;
  }
  
  /**
   * エラーをログに記録します
   * @param {string} functionName 関数名
   * @param {Error} error エラーオブジェクト
   */
  static logError(functionName, error) {
    console.error(`Error in ${functionName}: ${error.message}`);
    console.error(error.stack);
  }
  
  /**
   * URLが有効かどうかを確認します
   * @param {string} url 確認するURL
   * @returns {boolean} URLが有効な場合はtrue
   */
  static isValidUrl(url) {
    if (!url) return false;
    
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * テキストからURLを抽出します
   * @param {string} text 検索するテキスト
   * @returns {string|null} 最初に見つかったURL、見つからない場合はnull
   */
  static extractUrl(text) {
    if (!text) return null;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    
    return matches ? matches[0] : null;
  }
} 