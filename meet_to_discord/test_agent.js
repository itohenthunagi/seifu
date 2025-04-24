// minutes-agentをテストするためのモックスクリプト
const agent = require('./dist/agents/minutes-agent');

// サンプルデータ
const sampleTranscriptText = `
山田: 皆さん、おはようございます。今日の会議を始めましょう。
鈴木: はい、よろしくお願いします。
山田: まず、前回の宿題の確認からです。佐藤さん、マーケティング資料の準備はいかがでしょうか？
佐藤: はい、完成しました。先週末に皆さんにメールで送りましたが、ご確認いただけましたか？
田中: 確認しました。いくつか修正点があります。後ほど詳細をお送りします。
山田: ありがとうございます。次に、新製品の発売日についてですが、予定通り来月15日でよろしいでしょうか？
鈴木: 開発チームとしては問題ありません。テストも完了しています。
佐藤: マーケティング側も準備OK です。プレスリリースも作成済みです。
山田: 素晴らしい。それでは発売日は来月15日で確定します。他に議題はありますか？
田中: 営業目標について少し議論したいと思います。
山田: はい、どうぞ。
田中: 第3四半期の目標がかなり高く設定されていますが、実現可能でしょうか？
鈴木: 新製品の売上を考慮すれば、達成できる可能性はあると思います。
佐藤: マーケティングも全力でサポートします。
山田: わかりました。目標は現状維持で、全員で頑張りましょう。最後に、次回の会議は来週水曜日の同じ時間でよろしいでしょうか？
一同: はい、大丈夫です。
山田: ありがとうございました。それでは会議を終了します。
`;

// テスト準備関数
function setupTest() {
  console.log('モックのセットアップを開始します');
  
  // 元の関数を保存
  const originalProcessTranscript = agent.default.processTranscript;
  
  // processTranscript関数を完全に置き換える
  agent.default.processTranscript = async function(params) {
    console.log(`文字起こしURI: ${params.transcriptGcsUri} の処理を開始`);
    
    try {
      // 完全に自己完結したモック実装
      // 内部関数は一切呼び出さず、すべての処理をここで行う
      
      console.log('モック: サンプルの文字起こしデータを使用します');
      
      // 1. 文字起こしテキストの取得（モック）
      const transcriptText = sampleTranscriptText;
      
      // 2. 議事録生成（モック）
      console.log(`モック: "${params.meetingTitle}"の議事録を生成中...`);
      const summaryText = `# 会議名: ${params.meetingTitle}

## 要約
これはテスト用のモック議事録です。

## 主要な議論
- 前回の宿題の確認
- 新製品の発売日について（来月15日に決定）
- 第3四半期の営業目標について

## 決定事項
- 製品発売日: 来月15日で確定
- 営業目標: 現状維持

## TODOと次のステップ
- マーケティング資料の修正（担当: 田中）
- プレスリリースの最終確認（担当: 佐藤）
- 次回会議: 来週水曜日
`;
      console.log('議事録の生成が完了しました');
      
      // 3. Google Docs作成（モック）
      const docId = "mock_doc_id_" + Date.now();
      console.log(`モック: Google Docs作成完了: ${docId}`);
      
      // 4. Discord通知（モック）
      console.log('モック: Discordに通知を送信しています...');
      console.log(`モック: タイトル「会議「${params.meetingTitle}」の議事録ができました」`);
      console.log(`モック: URL「https://docs.google.com/document/d/${docId}/edit」`);
      console.log('Discord通知が完了しました');
      
      return { docId, success: true };
      
    } catch (error) {
      console.error('エラー発生:', error);
      throw error;
    }
  };
  
  // 復元用に元の関数を保存
  agent.originalProcessTranscript = originalProcessTranscript;
}

// テスト後のクリーンアップ関数
function teardownTest() {
  // processTranscript関数を復元
  if (agent.originalProcessTranscript) {
    agent.default.processTranscript = agent.originalProcessTranscript;
    delete agent.originalProcessTranscript;
    console.log('元のprocessTranscript関数を復元しました');
  }
}

async function testAgent() {
  console.log('エージェントのテストを開始します...');

  try {
    // テスト前の準備
    setupTest();
    
    // テスト用のパラメータ
    const params = {
      transcriptGcsUri: 'gs://example-bucket/transcript.txt',
      meetingTitle: 'テスト会議: 製品開発ミーティング'
    };
    
    // プロセスを実行
    const result = await agent.default.processTranscript(params);
    
    console.log('テスト完了！');
    console.log('結果:', result);
    
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
  } finally {
    // テスト後のクリーンアップ
    teardownTest();
  }
}

// テスト実行
testAgent(); 