// standalone-webapp.gs

function doHeavyCalculation(param1, param2) {
  // ここに他人に見られたくない複雑な計算や処理を書く
  console.log("パラメータ1:", param1, "パラメータ2:", param2);
  // .envにあったGemini APIキーを使う場合はここでAPI呼び出しなどを行う
  // const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  // if (!apiKey) {
  //   throw new Error("APIキーが設定されていません。");
  // }
  // ... API呼び出し処理 ...

  const result = param1 * param2 + 100; // 例
  Utilities.sleep(1000); // 時間のかかる処理を模倣
  console.log("計算結果:", result);
  return result;
}

// ウェブアプリのエントリポイント (GETリクエスト)
function doGet(e) {
  try {
    // その他のGETリクエストや、actionパラメータがない場合はシンプルな応答を返す
    return HtmlService.createHtmlOutput("ウェブアプリは動作中です。(メニューから実行してください)");
  } catch (error) {
    console.error("doGetエラー:", error);
    return HtmlService.createHtmlOutput("エラーが発生しました: " + error.message);
  }
}

// ウェブアプリのエントリポイント (POSTリクエスト)
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("無効なリクエストです。POSTデータがありません。");
    }
    const params = JSON.parse(e.postData.contents);
    if (params.action === 'executeFunction') {
      // パラメータを受け取って処理を実行
      // 入力値のバリデーションを追加
      const val1 = Number(params.data.value1);
      const val2 = Number(params.data.value2);
      if (isNaN(val1) || isNaN(val2)) {
        throw new Error("無効な数値が入力されました。");
      }
      const result = doHeavyCalculation(val1, val2);
      // 結果をJSON形式で返す
      return ContentService.createTextOutput(JSON.stringify({ success: true, result: result }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      throw new Error("無効なアクションです。");
    }
  } catch (error) {
    console.error("doPostエラー:", error);
    // エラー情報をJSONで返す
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "サーバー側エラー: " + error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- スクリプトプロパティ設定用の関数 (初回のみ手動実行) ---
// .envの内容をウェブアプリから利用可能にするために、スクリプトプロパティに設定します。
// この関数は、ウェブアプリをデプロイする前に一度だけ、
// スクリプトエディタから手動で実行する必要があります。
function setScriptProperties() {
  // ここに .env ファイルから読み取った情報を直接記述するか、
  // clasp などでローカルから設定する方法もあります。
  // 今回は手動設定を促すコメントのみとします。
  // 例:
  // PropertiesService.getScriptProperties().setProperties({
  //   'GEMINI_API_KEY': 'YOUR_GEMINI_API_KEY_FROM_ENV', // ここに.envの値を入力
  //   'GEMINI_API_MODEL': 'YOUR_GEMINI_MODEL_FROM_ENV', // ここに.envの値を入力
  //   'TARGET_SPREADSHEET_ID': 'YOUR_SPREADSHEET_ID_FROM_ENV' // スプレッドシートIDも必要なら設定
  // });
  // Logger.log("スクリプトプロパティを設定しました。");
  Logger.log("ウェブアプリで .env の値を使う場合は、PropertiesService.getScriptProperties() を利用してください。");
  Logger.log("APIキーなどを設定するには、エディタの「プロジェクトの設定」>「スクリプト プロパティ」で手動追加するか、");
  Logger.log("上記の setScriptProperties 関数に必要なキーと値を記述し、一度手動で実行してください。");
} 