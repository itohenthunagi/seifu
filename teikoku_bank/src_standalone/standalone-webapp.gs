// standalone-webapp.gs

// 企業情報収集のコアロジック（プレースホルダー）
function fetchCompanyInfoPlaceholder(companyName, presidentName) {
  console.log(`情報収集中 (プレースホルダー): ${companyName} (${presidentName || '社長名なし'})`);
  // ここで将来的にウェブ検索やスクレイピング、API呼び出しを行う
  // 現時点ではダミーデータを返す
  Utilities.sleep(500); // 処理時間を模倣
  return {
    website: `https://dummy-search.com/${encodeURIComponent(companyName)}`,
    email: `contact@${companyName.replace(/\s+/g, '').toLowerCase()}.dummy`,
    phone: "01-2345-6789",
    address: "東京都千代田区 ダミービル 1-1-1",
    sns: {
      twitter: `https://x.com/dummy_${companyName.replace(/\s+/g, '').toLowerCase()}`,
      facebook: null // 見つからない場合は null など
    }
  };
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
  let spreadsheetId = null;
  try {
    // --- スクリプトプロパティからスプレッドシートIDを取得 ---
    try {
      spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (!spreadsheetId) {
        throw new Error("スクリプトプロパティ 'SPREADSHEET_ID' が設定されていません。");
      }
    } catch (propError) {
      console.error("スクリプトプロパティ取得エラー:", propError);
      // エラーをJSONで返す
      return ContentService.createTextOutput(JSON.stringify({
         success: false, 
         message: "サーバー設定エラー: スプレッドシートIDが読み取れませんでした。スクリプトプロパティを確認してください。"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- リクエストボディの解析 ---
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("無効なリクエストです。POSTデータがありません。");
    }
    const params = JSON.parse(e.postData.contents);

    // --- アクションによる分岐 --- 
    if (params.action === 'collectInfo') {
      const companies = params.data;
      if (!Array.isArray(companies)) {
        throw new Error("無効なデータ形式です。会社情報の配列が必要です。");
      }

      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getActiveSheet(); // TODO: シート名を指定する方が確実かもしれない
      let processedCount = 0;
      let errorCount = 0;

      for (const companyData of companies) {
        const { company, president, row } = companyData;
        try {
          // 情報収集実行 (現在はプレースホルダー)
          const info = fetchCompanyInfoPlaceholder(company, president);

          // スプレッドシートに書き込み (C列からG列)
          // [ウェブサイトURL, メールアドレス, 電話番号, 会社所在地, SNS(連結)]
          const outputRowData = [
            info.website || '',
            info.email || '',
            info.phone || '',
            info.address || '',
            Object.entries(info.sns || {})
              .filter(([_, url]) => url)
              .map(([sns, url]) => `${sns}: ${url}`)
              .join('\n') // SNSは改行区切りで結合
          ];
          // C列から5列分書き込む
          sheet.getRange(row, 3, 1, 5).setValues([outputRowData]); 
          processedCount++;
        } catch (fetchError) {
          console.error(`[Row ${row}] ${company} の情報収集・書き込みエラー:`, fetchError);
          // エラー発生行にメモを残すなどしても良い
          sheet.getRange(row, 1).setNote(`情報収集中にエラーが発生しました: ${fetchError.message}`);
          errorCount++;
        }
         SpreadsheetApp.flush(); // 書き込みを即時反映させる（任意）
         Utilities.sleep(100); // スプレッドシートAPIの負荷軽減
      }

      // 処理結果を返す
      return ContentService.createTextOutput(JSON.stringify({
        success: true, 
        result: {
          message: `処理完了: ${processedCount} 件成功, ${errorCount} 件エラー`,
          processed: processedCount,
          errors: errorCount
        }
       })).setMimeType(ContentService.MimeType.JSON);

    } else {
      throw new Error("無効なアクションです: " + params.action);
    }
  } catch (error) {
    console.error("doPostエラー:", error);
    // エラー情報をJSONで返す
    return ContentService.createTextOutput(JSON.stringify({
       success: false, 
       message: "サーバー側エラー: " + error.message 
    })).setMimeType(ContentService.MimeType.JSON);
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
  Logger.log("★重要★ 企業情報収集機能を使うには、'SPREADSHEET_ID' に対象スプレッドシートのIDを設定してください。");
} 