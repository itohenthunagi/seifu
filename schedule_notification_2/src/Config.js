/**
 * 設定管理クラス
 * 環境変数やシステム設定を管理します
 */
class Config {
  /**
   * スクリプトプロパティから設定を取得します
   * @returns {Object} 設定オブジェクト
   */
  static getConfig() {
    const scriptProperties = PropertiesService.getScriptProperties();
    
    return {
      EMAIL_ADDRESS: scriptProperties.getProperty('EMAIL_ADDRESS') || '',
      EMAIL_PASSWORD: scriptProperties.getProperty('EMAIL_PASSWORD') || '',
      MAILING_LIST: scriptProperties.getProperty('MAILING_LIST') || '',
      GEMINI_API_KEY: scriptProperties.getProperty('GEMINI_API_KEY') || '',
      GEMINI_API_MODEL: scriptProperties.getProperty('GEMINI_API_MODEL') || 'gemini-2.0-flash',
      DISCORD_WEBHOOK_URL: scriptProperties.getProperty('DISCORD_WEBHOOK_URL') || '',
      DAYS_TO_SEARCH: parseInt(scriptProperties.getProperty('DAYS_TO_SEARCH') || '60', 10),
      PROCESSED_LABEL: scriptProperties.getProperty('PROCESSED_LABEL') || 'Processed',
      MAX_THREADS: parseInt(scriptProperties.getProperty('MAX_THREADS') || '10', 10)
    };
  }

  /**
   * スクリプトプロパティに設定を保存します
   * @param {Object} config 設定オブジェクト
   */
  static saveConfig(config) {
    const scriptProperties = PropertiesService.getScriptProperties();
    
    for (const [key, value] of Object.entries(config)) {
      scriptProperties.setProperty(key, String(value));
    }
  }

  /**
   * .envファイルから環境変数を読み込みます（ローカル開発用）
   * 注: このメソッドはGoogle Apps Script環境では動作しません
   */
  static loadEnvFile() {
    // このメソッドはローカル開発環境用のスタブです
    // Google Apps Script環境では使用されません
    console.log('loadEnvFile is a stub for local development');
  }
}

// グローバル変数として設定を公開
const CONFIG = Config.getConfig(); 