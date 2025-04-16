/**
 * スクリプトプロパティから設定値を取得します。
 * @returns {Record<string, string>} 設定値のオブジェクト
 * @throws {Error} 必須プロパティが設定されていない場合にエラーをスローします。
 */
function getScriptProperties(): { [key: string]: string } {
  const properties = PropertiesService.getScriptProperties();
  const scriptProperties: { [key: string]: string } = {};
  const requiredKeys = [
    'CHATWORK_API_TOKEN',
    'SPREADSHEET_ID',
    'HISTORY_SHEET_NAME',
    'ROOM_ID_SHEET_NAME',
  ];

  for (const key of requiredKeys) {
    const value = properties.getProperty(key);
    if (!value) {
      throw new Error(`必須のスクリプトプロパティが設定されていません: ${key}`);
    }
    scriptProperties[key] = value;
  }
  return scriptProperties;
}

/**
 * 指定されたシートからルームIDのリストを取得します。
 * @param spreadsheetId スプレッドシートのID
 * @param sheetName ルームIDが記載されたシート名
 * @returns {string[]} ルームIDの配列
 */
function getRoomIdsFromSheet(spreadsheetId: string, sheetName: string): string[] {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`シートが見つかりません: ${sheetName}`);
    }
    // A列の2行目から最終行まで取得 (ヘッダーを除く)
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      console.log(`シート「${sheetName}」にルームIDが見つかりません。`);
      return [];
    }
    const range = sheet.getRange(`A2:A${lastRow}`);
    const values = range.getValues();
    const roomIds = values.flat().filter(id => id).map(id => String(id).trim()); // 空白を除外し、文字列に変換
    console.log(`取得したルームID: ${roomIds.join(', ')}`);
    return roomIds;
  } catch (error) {
    console.error(`ルームIDの取得中にエラーが発生しました: ${error}`);
    throw error; // エラーを再スローしてメイン処理で捕捉
  }
}

/**
 * 指定されたルームのChatWorkメッセージを取得します。
 * @param roomId ルームID
 * @param apiToken ChatWork APIトークン
 * @returns {any[]} メッセージオブジェクトの配列
 */
function fetchChatworkMessages(roomId: string, apiToken: string): any[] {
  const endpoint = `https://api.chatwork.com/v2/rooms/${roomId}/messages`;
  // force=1 で常に全メッセージを取得 (必要に応じて調整)
  const params = {
    method: 'get' as const,
    headers: { 'X-ChatWorkToken': apiToken },
    muteHttpExceptions: true, // APIエラー時もレスポンスを受け取る
  };

  try {
    console.log(`ChatWork APIリクエスト開始: Room ID = ${roomId}`);
    const response = UrlFetchApp.fetch(`${endpoint}?force=1`, params);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      const messages = JSON.parse(responseBody);
      console.log(`ChatWork APIリクエスト成功: Room ID = ${roomId}, 件数 = ${messages.length}`);
      return messages;
    } else if (responseCode === 204) { // No Content
      console.log(`ChatWork API: Room ID = ${roomId} に新しいメッセージはありません。`);
      return [];
    } else {
      console.error(`ChatWork APIエラー: Room ID = ${roomId}, Status = ${responseCode}, Body = ${responseBody}`);
      throw new Error(`ChatWork APIエラー: Status ${responseCode}`);
    }
  } catch (error) {
    console.error(`ChatWork APIリクエスト中にエラー: ${error}`);
    throw error;
  }
}

/**
 * スプレッドシートにメッセージを書き込みます。
 * @param spreadsheetId スプレッドシートID
 * @param sheetName 書き込み先のシート名
 * @param messages 書き込むメッセージデータの配列 (各要素は[roomId, sender, body, time])
 */
function writeMessagesToSheet(spreadsheetId: string, sheetName: string, messages: (string | number)[][]): void {
  if (messages.length === 0) {
    console.log("書き込むメッセージがありません。");
    return;
  }
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`シートが見つかりません: ${sheetName}`);
    }
    const startRow = sheet.getLastRow() + 1;
    const numRows = messages.length;
    const numCols = messages[0].length; // 最初のメッセージの列数を基準とする
    const range = sheet.getRange(startRow, 1, numRows, numCols);
    range.setValues(messages);
    console.log(`シート「${sheetName}」に ${numRows} 件のメッセージを書き込みました。`);
  } catch (error) {
    console.error(`スプレッドシートへの書き込み中にエラー: ${error}`);
    throw error;
  }
}

// Helper function to find the row number for a given roomId in the specified sheet
function findRoomIdRow(sheet: GoogleAppsScript.Spreadsheet.Sheet, roomId: string): number {
  const data = sheet.getRange("A:A").getValues(); // Get all values in column A
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(roomId).trim()) {
      return i + 1; // Return 1-based row index
    }
  }
  return -1; // Not found
}

/**
 * [スプレッドシート版] ルームごとに最後に処理したメッセージIDを取得します.
 * @param spreadsheetId スプレッドシートID
 * @param roomIdSheetName ルームIDシート名
 * @param roomId ルームID
 * @returns {string | null} 最終メッセージID、または見つからない/エラーの場合は null
 */
function getLastMessageId(spreadsheetId: string, roomIdSheetName: string, roomId: string): string | null {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(roomIdSheetName);
    if (!sheet) {
      console.error(`[getLastMessageId] ルームIDシートが見つかりません: ${roomIdSheetName}`);
      return null;
    }
    const row = findRoomIdRow(sheet, roomId);
    if (row === -1) {
      // これはエラーではなく、初回実行などの正常系の場合もあるので warn レベル
      console.warn(`[getLastMessageId] ルームIDシートで roomId=${roomId} が見つかりませんでした。(初回実行の可能性)`);
      return null;
    }
    const value = sheet.getRange(row, 2).getValue(); // B列の値を取得
    // console.log(`[getLastMessageId] ${roomId} の最終IDをシートから取得: ${value}`);
    return value ? String(value) : null;
  } catch (error) {
    console.error(`[getLastMessageId] 最終メッセージID (${roomId}) の取得中にエラーが発生しました: ${error}`);
    return null;
  }
}

/**
 * [スプレッドシート版] ルームごとに最後に処理したメッセージIDを保存します.
 * @param spreadsheetId スプレッドシートID
 * @param roomIdSheetName ルームIDシート名
 * @param roomId ルームID
 * @param messageId 保存するメッセージID
 */
function setLastMessageId(spreadsheetId: string, roomIdSheetName: string, roomId: string, messageId: string): void {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(roomIdSheetName);
    if (!sheet) {
      console.error(`[setLastMessageId] ルームIDシートが見つかりません: ${roomIdSheetName}`);
      return;
    }
    const row = findRoomIdRow(sheet, roomId);
    if (row === -1) {
       console.error(`[setLastMessageId] 最終メッセージID (${roomId}) を保存できません。ルームIDシートに roomId が見つかりません。`);
       return;
    }
    sheet.getRange(row, 2).setValue(messageId); // B列に書き込み
  } catch (error) {
    console.error(`[setLastMessageId] 最終メッセージID (${roomId}) の保存中にエラーが発生しました: ${error}`);
  }
}

// --- 定数定義 ---
const SCRIPT_EXECUTION_TIME_LIMIT_SECONDS = 270; // 実行時間制限 (秒) - 6分より短く設定 (例: 4分30秒)
const MAX_MESSAGES_PER_ROOM_PER_RUN = 200; // 1ルームあたり、1実行で処理する最大メッセージ数
const SPREADSHEET_WRITE_BATCH_SIZE = 100; // スプレッドシートへの書き込みバッチサイズ

/**
 * スクリプトの実行時間が制限に近づいているか確認します。
 * @param startTime 処理開始時刻 (ミリ秒)
 * @returns {boolean} 制限時間に近づいていれば true
 */
function isTimeRunningOut(startTime: number): boolean {
  const currentTime = new Date().getTime();
  const elapsedTimeSeconds = (currentTime - startTime) / 1000;
  if (elapsedTimeSeconds >= SCRIPT_EXECUTION_TIME_LIMIT_SECONDS) {
    console.warn(`実行時間が制限 (${SCRIPT_EXECUTION_TIME_LIMIT_SECONDS}秒) に近づいています。処理を中断します。経過時間: ${elapsedTimeSeconds.toFixed(1)}秒`);
    return true;
  }
  return false;
}

/**
 * メイン関数
 */
function main(): void {
  const startTime = new Date().getTime(); // 処理開始時刻を記録
  console.log("処理を開始します。");
  let hasError = false;
  let processedRoomCount = 0;
  let totalProcessedMessageCount = 0;
  let stoppedDueToTimeLimit = false;

  try {
    const props = getScriptProperties();
    const chatworkApiToken = props['CHATWORK_API_TOKEN'];
    const spreadsheetId = props['SPREADSHEET_ID'];
    const historySheetName = props['HISTORY_SHEET_NAME'];
    const roomIdSheetName = props['ROOM_ID_SHEET_NAME'];

    // ヘッダー行を準備
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const historySheet = ss.getSheetByName(historySheetName);
    if (!historySheet) {
        throw new Error(`履歴シートが見つかりません: ${historySheetName}`);
    }
    if (historySheet.getLastRow() === 0) {
      historySheet.appendRow(['取得日時', 'ルームID', 'メッセージID', '送信者アカウントID', '送信者名', '本文', '送信日時']);
      console.log(`シート「${historySheetName}」にヘッダー行を追加しました。`);
    }

    const roomIds = getRoomIdsFromSheet(spreadsheetId, roomIdSheetName);

    for (const roomId of roomIds) {
      processedRoomCount++;
      console.log(`\n--- [${processedRoomCount}/${roomIds.length}] ルームID: ${roomId} の処理を開始 ---`);

      // --- 時間チェック (ルーム処理開始前) ---
      if (isTimeRunningOut(startTime)) {
        stoppedDueToTimeLimit = true;
        break; // 時間切れならルーム処理ループを抜ける
      }

      let currentRoomProcessedMessages = 0;
      let messagesToWriteBatch: (string | number)[][] = [];
      let lastWrittenMessageIdInRoom : string | null = null; // このルームで最後に書き込み成功したID
      let stoppedInThisRoomDueToLimit = false;

      try {
        const messages = fetchChatworkMessages(roomId, chatworkApiToken);
        if (messages.length === 0) {
          console.log(`ルーム ${roomId}: 新規メッセージなし、または取得失敗。`);
          continue; // 次のルームへ
        }

        const lastProcessedMessageId = getLastMessageId(spreadsheetId, roomIdSheetName, roomId);
        console.log(`ルーム ${roomId}: 前回最終メッセージID (シートから取得): ${lastProcessedMessageId || 'なし'}`);

        // メッセージIDでソート (昇順) されている前提
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          const currentMessageId = String(msg.message_id);

          // --- 時間チェック (メッセージ処理前) ---
          if (isTimeRunningOut(startTime)) {
            stoppedDueToTimeLimit = true;
            stoppedInThisRoomDueToLimit = true;
            break; // 時間切れならメッセージ処理ループを抜ける
          }

          // 処理済みメッセージはスキップ
          if (lastProcessedMessageId && currentMessageId <= lastProcessedMessageId) {
            continue;
          }

          // この実行でのルームごとの処理メッセージ数制限
          if (currentRoomProcessedMessages >= MAX_MESSAGES_PER_ROOM_PER_RUN) {
             console.log(`ルーム ${roomId}: 1実行あたりのメッセージ処理上限 (${MAX_MESSAGES_PER_ROOM_PER_RUN}件) に達しました。残りは次回処理します。`);
             stoppedInThisRoomDueToLimit = true;
             break; // このルームのメッセージ処理ループを抜ける
          }

          // スプレッドシートに書き込むデータを整形
          const record = [
            new Date(), // 取得日時
            roomId,
            currentMessageId,
            String(msg.account.account_id),
            msg.account.name,
            msg.body,
            new Date(msg.send_time * 1000), // UNIX時間をDateオブジェクトに変換
          ];
          messagesToWriteBatch.push(record);
          currentRoomProcessedMessages++;
          totalProcessedMessageCount++;

          // バッチサイズに達したか、このルームの最後のメッセージか、メッセージ上限に達した場合
          const isLastMessageInRoom = (i === messages.length - 1);
          if (messagesToWriteBatch.length >= SPREADSHEET_WRITE_BATCH_SIZE || isLastMessageInRoom || stoppedInThisRoomDueToLimit) {
            console.log(`ルーム ${roomId}: ${messagesToWriteBatch.length} 件を書き込みます...(累計 ${currentRoomProcessedMessages} 件)`);
            try {
                writeMessagesToSheet(spreadsheetId, historySheetName, messagesToWriteBatch);
                // 書き込み成功したら、最後に書き込んだIDを記録
                lastWrittenMessageIdInRoom = currentMessageId;
                messagesToWriteBatch = []; // バッチをクリア
            } catch (writeError) {
                console.error(`ルーム ${roomId}: スプレッドシート書き込み中にエラーが発生しました。このバッチの処理を中断します。 Error: ${writeError}`);
                hasError = true;
                // 書き込みエラーが発生したら、このルームの処理は中断する（ID更新しない）
                stoppedInThisRoomDueToLimit = true; 
                break; // メッセージ処理ループを抜ける
            }
            
             // --- 時間チェック (書き込み後) ---
             if (isTimeRunningOut(startTime)) {
                 stoppedDueToTimeLimit = true;
                 stoppedInThisRoomDueToLimit = true;
                 break; // 時間切れならメッセージ処理ループを抜ける
             }
          }
        } // End of message loop for this room

      } catch (roomError) {
        console.error(`ルームID ${roomId} の処理中にエラーが発生しました: ${roomError}`);
        hasError = true;
        // ルーム単位のエラーはログに残し、次のルームへ進む
      } finally {
          // --- ルーム処理終了時の最終メッセージID保存 ---
          if (lastWrittenMessageIdInRoom) {
              const previousLastId = getLastMessageId(spreadsheetId, roomIdSheetName, roomId);
              if (!previousLastId || lastWrittenMessageIdInRoom > previousLastId) {
                  setLastMessageId(spreadsheetId, roomIdSheetName, roomId, lastWrittenMessageIdInRoom);
                  console.log(`ルーム ${roomId}: スプレッドシート(B列)に最終メッセージIDを更新しました: ${lastWrittenMessageIdInRoom}`);
              } else {
                   console.log(`ルーム ${roomId}: 最終メッセージID (${lastWrittenMessageIdInRoom}) はシートの値 (${previousLastId}) より新しくないため更新しません。`);
              }
          } else {
             console.log(`ルーム ${roomId}: 今回書き込み成功したメッセージなし。シートの最終メッセージIDは更新しません。`);
          }
          console.log(`--- ルームID: ${roomId} の処理完了 (今回処理件数: ${currentRoomProcessedMessages}) ---`);
      }
       if (stoppedDueToTimeLimit) break; // 時間制限フラグが立っていたらルーム処理ループも抜ける
    } // End of room loop

  } catch (error) {
    console.error("メイン処理で予期せぬエラーが発生しました:", error);
    hasError = true;
  }

  const endTime = new Date().getTime();
  const executionTimeSeconds = ((endTime - startTime) / 1000).toFixed(1);
  console.log(`\n処理を終了しました。`);
  console.log(` - 実行時間: ${executionTimeSeconds} 秒`);
  console.log(` - 処理ルーム数: ${processedRoomCount}`);
  console.log(` - 総処理メッセージ数: ${totalProcessedMessageCount}`);
  if (stoppedDueToTimeLimit) {
    console.warn("**実行時間制限のため、処理を中断しました。残りの処理は次回の実行で行われます。**");
  }
  if (hasError) {
    console.error("**処理中にエラーが発生しました。詳細は上記のログを確認してください。**");
  }
   if (!hasError && !stoppedDueToTimeLimit) {
     console.log("正常に完了しました。")
   }
}

// --- 以下、グローバルスコープに関数を公開 --- 
// これによりGASの実行メニューやトリガーから呼び出せるようになります。
// (global as any).main = main; // ユーザーの要望により削除 