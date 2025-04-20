// container-bound.gs

// ▼▼▼【重要】下の行の "YOUR_WEB_APP_URL" を、デプロイ後に取得するウェブアプリURLに置き換えてください ▼▼▼
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwer-QdRxSo-w6j2M2pLKjg2o_pTEJU8qv1eMubf9BwUYO_WOetMA6BFaPPrwDqWaki1A/exec";
// ▲▲▲ ここまで ▲▲▲

// スプレッドシートが開かれたときにカスタムメニューを追加
function onOpen() {
  // URLが設定されていない場合は警告を出す
  if (WEB_APP_URL === "YOUR_WEB_APP_URL") {
    SpreadsheetApp.getUi().alert(
      'スクリプトの設定が必要です。', 
      '「拡張機能」>「Apps Script」を開き、container-bound.gs ファイル内の WEB_APP_URL を、デプロイしたウェブアプリのURLに書き換えてください。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
  
  SpreadsheetApp.getUi()
      .createMenu('カスタム連携メニュー') // メニュー名を変更
      .addItem('連携サイドバー表示', 'showSidebarWrapper')
      .addSeparator() // 区切り線
      .addItem('関数実行 (例: A1*B1+100)', 'callWebAppFunctionExample')
      .addToUi();
}

// ウェブアプリのサイドバーをiframeで表示するラッパー関数
function showSidebarWrapper() {
  if (checkWebAppUrl()) {
    // ウェブアプリの doGet に action=showSidebar パラメータを付けてアクセス
    const sidebarUrl = WEB_APP_URL + "?action=showSidebar&t=" + new Date().getTime(); // キャッシュ対策

    // ラッパーHTMLファイルからHtmlTemplateオブジェクトを作成
    const template = HtmlService.createTemplateFromFile('sidebar_wrapper');
    // HTMLテンプレートに変数を渡す
    template.webAppUrl = sidebarUrl;

    // HTMLを評価してHtmlOutputオブジェクトを取得
    const htmlOutput = template.evaluate()
        .setTitle('連携サイドバー')
        .setWidth(320);

    SpreadsheetApp.getUi().showSidebar(htmlOutput);
  }
}

// カスタムメニューからウェブアプリの関数実行を呼び出す例
function callWebAppFunctionExample() {
  if (!checkWebAppUrl()) return; // URLチェック

  try {
    // 例としてアクティブシートのA1とB1セルの値を取得
    const sheet = SpreadsheetApp.getActiveSheet();
    const value1 = sheet.getRange('A1').getValue();
    const value2 = sheet.getRange('B1').getValue();

    if (typeof value1 !== 'number' || typeof value2 !== 'number') {
      SpreadsheetApp.getUi().alert('A1セルとB1セルに有効な数値を入力してください。');
      return;
    }

    // ウェブアプリを呼び出す共通関数を使用
    const result = callWebAppFunction('executeFunction', { value1: value1, value2: value2 });
    SpreadsheetApp.getUi().alert('ウェブアプリの実行結果: ' + result);

  } catch (error) {
    Logger.log("callWebAppFunctionExample Error: " + error);
    SpreadsheetApp.getUi().alert('ウェブアプリの呼び出し中にエラーが発生しました: ' + error.message);
  }
}

// サイドバーのHTML内 (google.script.run) から呼び出される関数（ウェブアプリを呼び出す）
function callWebAppFunctionFromSidebar(val1, val2) {
  if (!checkWebAppUrl()) {
     throw new Error("ウェブアプリのURLが設定されていません。");
  } 

  try {
    // ウェブアプリの 'executeFunction' アクションを呼び出す
    const result = callWebAppFunction('executeFunction', { value1: val1, value2: val2 });
    return result; // サイドバーのSuccessHandlerに結果を返す
  } catch (error) {
     Logger.log("callWebAppFunctionFromSidebar Error: " + error);
     // エラーオブジェクト全体ではなく、メッセージのみをサイドバーに返す
     throw new Error('ウェブアプリ処理エラー: ' + error.message); // サイドバーのFailureHandlerにエラーを投げる
  }
}


// --- 内部関数 --- 

// ウェブアプリにPOSTリクエストを送信する共通関数
function callWebAppFunction(action, data) {
  const payload = {
    action: action,
    data: data
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true, // エラー時にもレスポンスを受け取るため
    headers: {
      'Authorization': 'Bearer ' + ScriptApp.getIdentityToken() // WebApp側で呼び出し元を検証する場合に利用可能
    }
  };

  Logger.log("ウェブアプリに送信するリクエスト: URL=" + WEB_APP_URL + ", options=" + JSON.stringify(options));

  // ウェブアプリにリクエストを送信
  const response = UrlFetchApp.fetch(WEB_APP_URL, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  Logger.log("ウェブアプリからのレスポンス: Code=" + responseCode + ", Body=" + responseBody);

  if (responseCode === 200) {
    try {
      const result = JSON.parse(responseBody);
      if (result.success) {
        return result.result; // 成功時の結果を返す
      } else {
        // ウェブアプリがエラーを返した場合 (例: 入力値不正など)
        throw new Error(result.message || "ウェブアプリ側で不明なエラーが発生しました。");
      }
    } catch (e) {
      // JSONパースエラーなど
       Logger.log("レスポンス解析エラー: " + e + ", Body:" + responseBody);
       throw new Error("ウェブアプリからの応答を解析できませんでした。応答: " + responseBody);
    }
  } else {
    // 通信エラー (404, 500など)
    throw new Error(`ウェブアプリとの通信に失敗しました (HTTPコード: ${responseCode})。URLが正しいか、ウェブアプリがデプロイされているか確認してください。`);
  }
}

// WEB_APP_URLが設定されているかチェックする関数
function checkWebAppUrl() {
  if (WEB_APP_URL === "YOUR_WEB_APP_URL") {
     SpreadsheetApp.getUi().alert(
      'ウェブアプリURL未設定', 
      'container-bound.gs ファイル内の WEB_APP_URL を設定してください。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return false;
  }
  return true;
} 