import { Message } from '@google-cloud/pubsub';
import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();

/**
 * Google カレンダーのPush通知を受け取り、Meet情報を抽出してPub/Subに送信する
 * トリガー: Cloud Pub/Sub (calendar-events トピック)
 * @param {Object} cloudEvent Cloud Functionsのイベントオブジェクト
 */
export async function handler(cloudEvent: any): Promise<void> {
  try {
    // 受信データをデコード
    const message = cloudEvent.data || {};
    const data = Buffer.isBuffer(message) 
      ? JSON.parse(Buffer.from(message).toString())
      : message;
    
    console.log('カレンダーイベント受信:', JSON.stringify(data));
    
    // Meetリンクをチェック (会議ではないイベントは無視)
    if (!data.hangoutLink && !data.conferenceData) {
      console.log('Meetリンクなし - スキップ');
      return;
    }
    
    // 必要な情報を抽出
    const meetInfo = {
      calendarEventId: data.id,
      summary: data.summary,
      meetLink: data.hangoutLink || (data.conferenceData?.entryPoints?.[0]?.uri || null),
      meetId: extractMeetId(data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri),
      startTime: data.start?.dateTime || data.start?.date,
      endTime: data.end?.dateTime || data.end?.date,
      timestamp: new Date().toISOString()
    };
    
    console.log('抽出したMeet情報:', JSON.stringify(meetInfo));
    
    // Pub/Subトピックにパブリッシュ
    const targetTopic = process.env.TOPIC || 'meeting-events';
    const dataBuffer = Buffer.from(JSON.stringify(meetInfo));
    
    await pubsub.topic(targetTopic).publish(dataBuffer);
    console.log(`情報を ${targetTopic} トピックに送信しました`);
    
  } catch (error) {
    console.error('エラー発生:', error);
    throw error;
  }
}

/**
 * MeetリンクからMeet IDを抽出するヘルパー関数
 */
function extractMeetId(meetLink: string | undefined): string | null {
  if (!meetLink) return null;
  
  const meetIdMatch = meetLink.match(/\/([a-z0-9\-]+)(\?|$)/i);
  return meetIdMatch ? meetIdMatch[1] : null;
}
