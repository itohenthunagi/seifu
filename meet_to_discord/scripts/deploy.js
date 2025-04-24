#!/usr/bin/env node

/**
 * Meet-to-Discord デプロイスクリプト
 * 
 * このスクリプトは以下のデプロイを行います：
 * 1. ビルド (TypeScriptコンパイル)
 * 2. Pub/Subトピックの作成/確認
 * 3. Cloud Functionsのデプロイ
 *   - カレンダーイベントハンドラ関数
 *   - 会議文字起こしハンドラ関数
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// インタラクティブなプロンプト作成
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 設定値
let config = {
  projectId: '',
  region: 'asia-northeast1', // 東京リージョン
  topics: {
    calendarEvents: 'calendar-events',
    meetingEvents: 'meeting-events'
  },
  functions: {
    calendarHandler: {
      name: 'cal-event-handler',
      runtime: 'nodejs20',
      entryPoint: 'handler',
      sourceDir: 'dist/functions'
    },
    transcriptHandler: {
      name: 'transcript-handler',
      runtime: 'python312',
      entryPoint: 'main',
      sourceDir: 'functions'
    }
  }
};

// コマンド実行ヘルパー関数
function runCommand(command, options = {}) {
  const { showOutput = true, ignoreError = false } = options;
  
  console.log(`\n実行コマンド: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    if (showOutput) {
      console.log(`成功: ${output}`);
    }
    return { success: true, output };
  } catch (error) {
    console.error(`エラー: ${error.message}`);
    if (ignoreError) {
      return { success: false, error, ignored: true };
    }
    if (!options.continueOnError) {
      process.exit(1);
    }
    return { success: false, error };
  }
}

// TypeScriptのビルド
function buildTypeScript() {
  console.log('\n1. TypeScriptのビルドを実行します...');
  return runCommand('npm run build');
}

// Pub/Subトピックの作成
function createPubSubTopics() {
  console.log('\n2. Pub/Subトピックを作成/確認します...');
  
  // calendar-eventsトピック
  console.log(`\n2.1. ${config.topics.calendarEvents} トピックの作成...`);
  let result = runCommand(
    `gcloud pubsub topics create ${config.topics.calendarEvents} --project=${config.projectId}`,
    { ignoreError: true }
  );
  
  if (!result.success && result.error && result.error.includes('Resource already exists')) {
    console.log(`トピック ${config.topics.calendarEvents} は既に存在します。`);
  } else if (!result.success) {
    return result;
  }
  
  // meeting-eventsトピック
  console.log(`\n2.2. ${config.topics.meetingEvents} トピックの作成...`);
  result = runCommand(
    `gcloud pubsub topics create ${config.topics.meetingEvents} --project=${config.projectId}`,
    { ignoreError: true }
  );
  
  if (!result.success && result.error && result.error.includes('Resource already exists')) {
    console.log(`トピック ${config.topics.meetingEvents} は既に存在します。`);
  } else if (!result.success) {
    return result;
  }
  
  return { success: true };
}

// カレンダーイベントハンドラ関数のデプロイ
function deployCalendarHandler() {
  console.log('\n3. カレンダーイベントハンドラ関数をデプロイします...');
  
  const { name, runtime, entryPoint, sourceDir } = config.functions.calendarHandler;
  
  return runCommand(
    `gcloud functions deploy ${name} ` +
    `--gen2 ` +
    `--runtime=${runtime} ` +
    `--region=${config.region} ` +
    `--trigger-topic=${config.topics.calendarEvents} ` +
    `--entry-point=${entryPoint} ` +
    `--source=${sourceDir} ` +
    `--set-env-vars=TOPIC=${config.topics.meetingEvents},PROJECT_ID=${config.projectId} ` +
    `--project=${config.projectId}`
  );
}

// 会議文字起こしハンドラ関数のデプロイ
function deployTranscriptHandler() {
  console.log('\n4. 会議文字起こしハンドラ関数をデプロイします...');
  
  const { name, runtime, entryPoint, sourceDir } = config.functions.transcriptHandler;
  
  return runCommand(
    `gcloud functions deploy ${name} ` +
    `--gen2 ` +
    `--runtime=${runtime} ` +
    `--region=${config.region} ` +
    `--trigger-event-provider=workspace.googleapis.com ` +
    `--trigger-event-filters='type=transcript_ready' ` +
    `--trigger-event-filters='service=meet.googleapis.com' ` +
    `--entry-point=${entryPoint} ` +
    `--source=${sourceDir} ` +
    `--set-env-vars=TOPIC=${config.topics.meetingEvents},PROJECT_ID=${config.projectId} ` +
    `--project=${config.projectId}`
  );
}

// Workspace Events APIのプッシュ通知設定
function setupWorkspaceEventsWatcher() {
  console.log('\n5. Workspace Events APIのプッシュ通知を設定します...');
  
  // 設定はコンソールUIから行う必要がある旨を表示
  console.log(`
注意: Workspace Events APIのプッシュ通知設定は現在このスクリプトでは自動化できません。
以下の手順で手動設定が必要です:

1. Google Cloud コンソールを開く: https://console.cloud.google.com/
2. Google Workspace 通知の設定を開く: https://console.cloud.google.com/workspace/notifications
3. 「ウォッチャーを作成」をクリック
4. 以下の設定で作成:
   - 名前: meet-transcript-watcher
   - ドメイン: あなたのGoogleワークスペースドメイン
   - サービス: Google Meet
   - イベントタイプ: transcript_ready
   - 配信方法: Cloud Functions
   - 関数: ${config.functions.transcriptHandler.name}
   - リージョン: ${config.region}
5. 「作成」ボタンをクリック

詳細は「作業ログ.md」を参照してください。
  `);
  
  return { success: true };
}

// メイン処理
async function main() {
  console.log('=== Meet-to-Discord デプロイツール ===');
  
  // プロジェクトIDの入力
  await new Promise(resolve => {
    rl.question('Google CloudプロジェクトIDを入力してください: ', (answer) => {
      config.projectId = answer.trim();
      resolve();
    });
  });
  
  // リージョンの確認
  await new Promise(resolve => {
    rl.question(`デプロイリージョン (デフォルト: ${config.region}): `, (answer) => {
      if (answer.trim()) {
        config.region = answer.trim();
      }
      resolve();
    });
  });
  
  rl.close();
  
  // gcloudコマンドが利用可能か確認
  try {
    execSync('gcloud --version', { encoding: 'utf8' });
  } catch (error) {
    console.error('エラー: Google Cloud SDKがインストールされていないか、PATHに設定されていません。');
    console.error('Google Cloud SDKをインストールし、PATHに追加してください: https://cloud.google.com/sdk/docs/install');
    process.exit(1);
  }
  
  // サービスアカウントキーの存在確認
  const keyFile = path.join(__dirname, '..', 'service-account-key.json');
  if (!fs.existsSync(keyFile)) {
    console.log('\n警告: サービスアカウントキーファイルが見つかりません。');
    console.log('先に setup-auth.js を実行して、サービスアカウントを設定してください。');
    
    // 続行の確認
    await new Promise(resolve => {
      const tempRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      tempRl.question('サービスアカウントキーなしで続行しますか？ (y/N): ', (answer) => {
        if (answer.trim().toLowerCase() !== 'y') {
          console.log('デプロイを中止します。先にサービスアカウントを設定してください。');
          process.exit(0);
        }
        tempRl.close();
        resolve();
      });
    });
  }
  
  // 各ステップを実行
  const steps = [
    { name: 'TypeScriptビルド', fn: buildTypeScript },
    { name: 'Pub/Subトピック作成', fn: createPubSubTopics },
    { name: 'カレンダーイベントハンドラデプロイ', fn: deployCalendarHandler },
    { name: 'トランスクリプトハンドラデプロイ', fn: deployTranscriptHandler },
    { name: 'Workspace Events API設定', fn: setupWorkspaceEventsWatcher }
  ];
  
  for (const step of steps) {
    console.log(`\n === ${step.name} を実行中... ===`);
    const result = step.fn();
    
    if (!result.success && !result.ignored) {
      console.error(`エラー: ${step.name} に失敗しました。`);
      process.exit(1);
    }
  }
  
  console.log('\n === デプロイ完了 ===');
  console.log(`
以下のコンポーネントがデプロイされました:
1. Pub/Subトピック:
   - ${config.topics.calendarEvents}
   - ${config.topics.meetingEvents}
2. Cloud Functions:
   - ${config.functions.calendarHandler.name}
   - ${config.functions.transcriptHandler.name}

Workspace Events APIのプッシュ通知設定を忘れずに手動で行ってください。
詳細は「作業ログ.md」を参照してください。
  `);
}

// スクリプト実行
main().catch(error => {
  console.error('予期せぬエラーが発生しました:', error);
  process.exit(1);
}); 