// container-bound.gs

// ▼▼▼【重要】下の行の "YOUR_WEB_APP_URL" を、デプロイ後に取得するウェブアプリURLに置き換えてください ▼▼▼
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwer-QdRxSo-w6j2M2pLKjg2o_pTEJU8qv1eMubf9BwUYO_WOetMA6BFaPPrwDqWaki1A/exec";
// ▲▲▲ ここまで ▲▲▲

// スプレッドシートが開かれたときにカスタムメニューを追加
function onOpen() {
  if (!checkWebAppUrl()) return; // URLチェック

  SpreadsheetApp.getUi()
      .createMenu('企業情報収集') // メニュー名を変更
      .addItem('収集開始', 'startCompanyInfoCollection') // メニュー項目変更
      // .addItem('関数実行 (例: A1*B1+100)', 'callWebAppFunctionExample') // サンプル削除
      .addToUi();
}

// 企業情報収集を開始する関数
function startCompanyInfoCollection() {
  if (!checkWebAppUrl()) return;

  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    // ヘッダー行を除き、A列とB列のデータを取得 (A2:B)
    const dataRange = sheet.getRange('A2:B' + sheet.getLastRow());
    const values = dataRange.getValues();

    const companiesToProcess = [];
    for (let i = 0; i < values.length; i++) {
      const companyName = values[i][0];
      const presidentName = values[i][1];
      // 会社名が空でなければ処理対象とする
      if (companyName && typeof companyName === 'string' && companyName.trim() !== '') {
        companiesToProcess.push({
          company: companyName.trim(),
          president: (presidentName && typeof presidentName === 'string') ? presidentName.trim() : '',
          row: i + 2 // スプレッドシートの行番号 (1-indexed, ヘッダー除く)
        });
      }
    }

    if (companiesToProcess.length === 0) {
      SpreadsheetApp.getUi().alert('処理対象の会社名が見つかりません。A列に会社名を入力してください。');
      return;
    }

    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput('<p>企業情報の収集を開始します...(処理対象: ' + companiesToProcess.length + '件)</p>'), '情報収集中');

    // ウェブアプリを呼び出す (action: 'collectInfo')
    const result = callWebAppFunction('collectInfo', companiesToProcess);

    // モーダルを閉じる (※注: GASの制限により、サーバーサイド関数から直接モーダルを閉じることは推奨されない。完了通知はアラートで行う)

    SpreadsheetApp.getUi().alert('情報収集処理が完了しました。結果: ' + JSON.stringify(result));

  } catch (error) {
    Logger.log("startCompanyInfoCollection Error: " + error);
    SpreadsheetApp.getUi().alert('処理中にエラーが発生しました: ' + error.message);
  }
}

// カスタムメニューからウェブアプリの関数実行を呼び出す例 (削除)
// function callWebAppFunctionExample() { ... }


// --- 内部関数 --- 

// ウェブアプリにPOSTリクエストを送信する共通関数 (変更なし)
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
        // ウェブアプリがエラーを返した場合
        throw new Error(result.message || "ウェブアプリ側で不明なエラーが発生しました。");
      }
    } catch (e) {
      // JSONパースエラーなど
       Logger.log("レスポンス解析エラー: " + e + ", Body:" + responseBody);
       throw new Error("ウェブアプリからの応答を解析できませんでした。応答: " + responseBody);
    }
  } else {
    // 通信エラー
    throw new Error(`ウェブアプリとの通信に失敗しました (HTTPコード: ${responseCode})。URLが正しいか、ウェブアプリがデプロイされているか確認してください。`);
  }
}

// WEB_APP_URLが設定されているかチェックする関数 (変更なし)
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