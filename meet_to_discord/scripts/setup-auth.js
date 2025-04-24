#!/usr/bin/env node

/**
 * Google Cloud認証設定セットアップスクリプト
 * 
 * このスクリプトは以下の設定を行います：
 * 1. 必要なGoogle Cloud APIの有効化
 * 2. サービスアカウントの作成
 * 3. 必要なIAMロールの付与
 * 4. Discord WebhookのSecret Manager登録
 */

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// インタラクティブなプロンプト作成
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 設定値
let config = {
  projectId: '',
  serviceAccountName: 'meet-to-discord-sa',
  serviceAccountDescription: 'Meet-to-Discord用のサービスアカウント',
  serviceAccountRoles: [
    'roles/storage.objectViewer',
    'roles/pubsub.publisher',
    'roles/secretmanager.secretAccessor',
    'roles/aiplatform.user',
    'roles/docs.editor',
    'roles/drive.editor'
  ],
  discordWebhookUrl: '',
  secretName: 'discord-webhook-url'
};

// GCloudコマンド実行ヘルパー関数
function runCommand(command) {
  console.log(`\n実行コマンド: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(`成功: ${output}`);
    return { success: true, output };
  } catch (error) {
    console.error(`エラー: ${error.message}`);
    return { success: false, error };
  }
}

// Google Cloud APIを有効化
function enableApis() {
  console.log('\n1. 必要なGoogle Cloud APIを有効化します...');
  
  const apis = [
    'secretmanager.googleapis.com',
    'aiplatform.googleapis.com',
    'pubsub.googleapis.com',
    'storage.googleapis.com',
    'docs.googleapis.com',
    'drive.googleapis.com',
    'sheets.googleapis.com',
    'calendar.googleapis.com',
    'meet.googleapis.com'
  ];
  
  return runCommand(`gcloud services enable ${apis.join(' ')} --project=${config.projectId}`);
}

// サービスアカウントの作成
function createServiceAccount() {
  console.log('\n2. サービスアカウントを作成します...');
  
  // サービスアカウントが既に存在するか確認
  const checkCommand = `gcloud iam service-accounts list --filter="email:${config.serviceAccountName}@${config.projectId}.iam.gserviceaccount.com" --project=${config.projectId}`;
  const { output } = runCommand(checkCommand);
  
  if (output && output.includes(`${config.serviceAccountName}@${config.projectId}.iam.gserviceaccount.com`)) {
    console.log(`サービスアカウント ${config.serviceAccountName} はすでに存在します。`);
    return { success: true };
  }
  
  return runCommand(`gcloud iam service-accounts create ${config.serviceAccountName} --display-name="${config.serviceAccountDescription}" --project=${config.projectId}`);
}

// IAMロールの付与
function assignRoles() {
  console.log('\n3. IAMロールを付与します...');
  
  const serviceAccountEmail = `${config.serviceAccountName}@${config.projectId}.iam.gserviceaccount.com`;
  
  for (const role of config.serviceAccountRoles) {
    console.log(`ロールを付与: ${role}`);
    const result = runCommand(`gcloud projects add-iam-policy-binding ${config.projectId} --member="serviceAccount:${serviceAccountEmail}" --role="${role}"`);
    
    if (!result.success) {
      return result;
    }
  }
  
  return { success: true };
}

// サービスアカウントキーの作成
function createServiceAccountKey() {
  console.log('\n4. サービスアカウントキーを作成します...');
  
  const serviceAccountEmail = `${config.serviceAccountName}@${config.projectId}.iam.gserviceaccount.com`;
  const keyFile = path.join(__dirname, '..', 'service-account-key.json');
  
  const result = runCommand(`gcloud iam service-accounts keys create ${keyFile} --iam-account=${serviceAccountEmail} --project=${config.projectId}`);
  
  if (result.success) {
    console.log(`サービスアカウントキーが ${keyFile} に保存されました。`);
    
    // .gitignoreにキーファイルを追加
    const gitignorePath = path.join(__dirname, '..', '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      if (!gitignoreContent.includes('service-account-key.json')) {
        gitignoreContent += '\n# Google Cloud サービスアカウントキー\nservice-account-key.json\n';
        fs.writeFileSync(gitignorePath, gitignoreContent);
        console.log('.gitignoreにキーファイルを追加しました。');
      }
    } else {
      fs.writeFileSync(gitignorePath, '# Google Cloud サービスアカウントキー\nservice-account-key.json\n');
      console.log('.gitignoreファイルを作成し、キーファイルを追加しました。');
    }
  }
  
  return result;
}

// Discord WebhookをSecret Managerに登録
function storeDiscordWebhook() {
  console.log('\n5. Discord Webhook URLをSecret Managerに登録します...');
  
  // シークレットの作成
  let result = runCommand(`gcloud secrets create ${config.secretName} --project=${config.projectId}`);
  
  // 既に存在する場合はスキップ
  if (!result.success && result.error && result.error.includes('already exists')) {
    console.log(`シークレット ${config.secretName} は既に存在します。`);
    result = { success: true };
  }
  
  if (result.success) {
    // シークレットの値を設定
    return runCommand(`echo -n "${config.discordWebhookUrl}" | gcloud secrets versions add ${config.secretName} --data-file=- --project=${config.projectId}`);
  }
  
  return result;
}

// メイン処理
async function main() {
  console.log('=== Google Cloud認証設定セットアップ ===');
  
  // プロジェクトIDの入力
  await new Promise(resolve => {
    rl.question('Google CloudプロジェクトIDを入力してください: ', (answer) => {
      config.projectId = answer.trim();
      resolve();
    });
  });
  
  // Discord Webhook URLの入力
  await new Promise(resolve => {
    rl.question('Discord Webhook URLを入力してください: ', (answer) => {
      config.discordWebhookUrl = answer.trim();
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
  
  // 各ステップを実行
  const steps = [
    { name: 'APIの有効化', fn: enableApis },
    { name: 'サービスアカウントの作成', fn: createServiceAccount },
    { name: 'IAMロールの付与', fn: assignRoles },
    { name: 'サービスアカウントキーの作成', fn: createServiceAccountKey },
    { name: 'Discord Webhook URLの登録', fn: storeDiscordWebhook }
  ];
  
  for (const step of steps) {
    console.log(`\n === ${step.name} を実行中... ===`);
    const result = step.fn();
    
    if (!result.success) {
      console.error(`エラー: ${step.name} に失敗しました。`);
      process.exit(1);
    }
  }
  
  console.log('\n === セットアップ完了 ===');
  console.log('以下の設定が完了しました:');
  console.log('1. 必要なGoogle Cloud APIの有効化');
  console.log('2. サービスアカウントの作成');
  console.log('3. 必要なIAMロールの付与');
  console.log('4. サービスアカウントキーの作成');
  console.log('5. Discord Webhook URLのSecret Manager登録');
  console.log('\n詳細はGitリポジトリルートの「作業ログ.md」を参照してください。');
}

// スクリプト実行
main().catch(error => {
  console.error('予期せぬエラーが発生しました:', error);
  process.exit(1);
}); 