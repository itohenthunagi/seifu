/**
 * Gemini AIサービスクラス
 * Gemini AIを使用したテキスト分析と情報抽出を提供します
 */
class GeminiService {
  /**
   * Gemini APIにリクエストを送信します
   * @param {string} prompt プロンプト
   * @returns {Object} APIレスポンス
   * @private
   */
  static _callGeminiApi(prompt) {
    try {
      const apiKey = CONFIG.GEMINI_API_KEY;
      const model = CONFIG.GEMINI_API_MODEL;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      };
      
      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(requestBody),
        muteHttpExceptions: true
      };
      
      const response = UrlFetchApp.fetch(apiUrl, options);
      const responseCode = response.getResponseCode();
      
      if (responseCode !== 200) {
        console.error(`Gemini API error: ${responseCode}`);
        console.error(response.getContentText());
        return null;
      }
      
      return JSON.parse(response.getContentText());
    } catch (error) {
      Utils.logError('GeminiService._callGeminiApi', error);
      return null;
    }
  }
  
  /**
   * メール本文から打ち合わせ情報を抽出します
   * @param {Object} mailInfo メール情報
   * @returns {Object} 分析結果
   */
  static analyzeMailContent(mailInfo) {
    try {
      if (!mailInfo || !mailInfo.body) {
        return null;
      }
      
      // プロンプトの構築
      const prompt = `
以下のメール本文から、打ち合わせに関する情報を抽出してJSON形式で返してください。
日付、開始時間、終了時間、会議URL、参加者の情報を特定してください。
また、メール内容の要約も作成してください。

メール件名: ${mailInfo.subject}
メール本文:
${mailInfo.body}

以下のJSON形式で回答してください:
{
  "summary": "メール内容の要約（100文字程度）",
  "meetingDate": "打ち合わせ日（YYYY-MM-DD形式、不明な場合は空文字）",
  "startTime": "開始時間（HH:MM形式、不明な場合は空文字）",
  "endTime": "終了時間（HH:MM形式、不明な場合は空文字）",
  "meetingUrl": "会議URL（Zoom、Google Meet、Teams等のURL、不明な場合は空文字）",
  "participants": ["参加者1", "参加者2", ...]
}

JSONのみを返してください。余分なテキストは含めないでください。
`;
      
      // Gemini APIを呼び出し
      const response = this._callGeminiApi(prompt);
      
      if (!response || !response.candidates || response.candidates.length === 0) {
        console.error('No response from Gemini API');
        return null;
      }
      
      // レスポンスからテキスト部分を抽出
      const responseText = response.candidates[0].content.parts[0].text;
      
      // JSONを抽出（余分なテキストがある場合に対応）
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response');
        return null;
      }
      
      // JSONをパース
      const analysisResult = JSON.parse(jsonMatch[0]);
      
      // 日付の変換（YYYY-MM-DD形式からDateオブジェクトへ）
      if (analysisResult.meetingDate) {
        try {
          analysisResult.meetingDate = new Date(analysisResult.meetingDate);
        } catch (e) {
          analysisResult.meetingDate = null;
        }
      }
      
      return analysisResult;
    } catch (error) {
      Utils.logError('GeminiService.analyzeMailContent', error);
      return null;
    }
  }
} 