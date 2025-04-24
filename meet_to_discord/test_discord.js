const https = require('https');
const url = require('url');

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1364971222223290548/nuGSezRwVre_wt1FL51tsHpe1zMzi4wPPjE5Ve4InIm53ZZRFiiQR5xmJ-dCFGu1kNtn';

function sendTestMessage() {
  // 埋め込みメッセージを含む
  const message = {
    embeds: [
      {
        title: "テスト用議事録",
        description: "このメッセージはNode.jsから直接送信されたテストです。\n\n会議文字起こしからDiscordへの通知フローのテストです。",
        color: 5814783, // 青色
        url: "https://docs.google.com/document/d/example/edit",
        timestamp: new Date().toISOString()
      }
    ]
  };

  console.log('Discord Webhookにメッセージを送信中...');
  
  const data = JSON.stringify(message);
  console.log('送信データ:', data);
  
  const parsedUrl = url.parse(DISCORD_WEBHOOK_URL);
  
  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  
  const req = https.request(options, (res) => {
    console.log('ステータス:', res.statusCode);
    
    let responseBody = '';
    res.on('data', (chunk) => {
      responseBody += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('成功: Discord WebhookにPOSTしました');
      } else {
        console.error('エラー: Discord WebhookへのPOSTに失敗しました', 
                     'ステータス:', res.statusCode,
                     'レスポンス:', responseBody);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('例外が発生しました:', error);
  });
  
  req.write(data);
  req.end();
}

// テスト実行
sendTestMessage(); 