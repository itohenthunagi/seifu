import base64
import json
import os
import re
from typing import Dict, Any, Optional, Tuple

from google.cloud import pubsub_v1
from google.cloud import storage
from google.api_core.exceptions import NotFound

# Pub/Subクライアントの初期化
publisher = pubsub_v1.PublisherClient()
# Cloud Storageクライアントの初期化
storage_client = storage.Client()

def main(event: Dict[str, Any], context) -> None:
    """
    Workspace Events APIからMeetの文字起こしイベント（transcript_ready）を受信して処理する
    
    Args:
        event: Workspace Events API イベントデータ
        context: イベントコンテキスト
    """
    try:
        # イベントタイプの確認
        if 'data' not in event:
            print("データなしでスキップします")
            return
            
        # イベントデータの解析
        data = json.loads(base64.b64decode(event['data']).decode('utf-8'))
        print(f"受信イベント: {json.dumps(data)}")
        
        # transcript_readyイベントかどうかチェック
        if data.get('eventType') != 'transcript_ready':
            print(f"文字起こしイベントではないのでスキップします: {data.get('eventType')}")
            return
        
        # 必要なデータの抽出
        transcript_info = {
            'meetingId': data.get('meetingData', {}).get('meetingId'),
            'conferenceId': data.get('meetingData', {}).get('conferenceId'),
            'transcriptUri': data.get('meetingData', {}).get('transcriptUri'),
            'meetingTitle': data.get('meetingData', {}).get('meetingTitle', '会議（タイトルなし）'),
            'timestamp': data.get('receiveTime')
        }
        
        print(f"抽出した文字起こし情報: {json.dumps(transcript_info)}")
        
        # データに必要なフィールドが含まれているかチェック
        if not transcript_info['transcriptUri']:
            print("文字起こしURIがないのでスキップします")
            return
            
        # URIの検証
        transcript_uri = transcript_info['transcriptUri']
        valid_uri, bucket_name, blob_name = validate_gcs_uri(transcript_uri)
        
        if not valid_uri:
            print(f"無効なGCS URI: {transcript_uri}")
            return
            
        # GCSのオブジェクトが存在するか確認
        if not check_gcs_object_exists(bucket_name, blob_name):
            print(f"文字起こしファイルが見つかりません: gs://{bucket_name}/{blob_name}")
            return
            
        # 文字起こしファイルのプレビュー（最初の数行）を取得
        transcript_preview = get_transcript_preview(bucket_name, blob_name)
        if transcript_preview:
            print(f"文字起こしプレビュー:\n{transcript_preview}")
            
            # 文字起こしの形式を検証
            if not validate_transcript_format(transcript_preview):
                print("警告: 文字起こしの形式が標準的でない可能性があります")
        
        # 会議タイトルの補完（タイトルがない場合は日時を使用）
        if transcript_info['meetingTitle'] == '会議（タイトルなし）' and transcript_info['timestamp']:
            from datetime import datetime
            try:
                timestamp = datetime.fromisoformat(transcript_info['timestamp'].replace('Z', '+00:00'))
                formatted_time = timestamp.strftime('%Y-%m-%d %H:%M')
                transcript_info['meetingTitle'] = f'会議 {formatted_time}'
            except (ValueError, TypeError):
                # タイムスタンプのパース失敗時は無視
                pass
            
        # Pub/Subトピックにメッセージを送信
        target_topic = os.environ.get('TOPIC', 'meeting-events')
        project_id = os.environ.get('PROJECT_ID')
        if not project_id:
            print("環境変数 PROJECT_ID が設定されていません")
            # Google Cloud環境では、現在のプロジェクトIDを自動取得
            import google.auth
            _, project_id = google.auth.default()
            print(f"現在のプロジェクトIDを使用します: {project_id}")
            
        topic_path = publisher.topic_path(project_id, target_topic)
        
        message_json = json.dumps(transcript_info).encode('utf-8')
        publish_future = publisher.publish(topic_path, data=message_json)
        publish_future.result()  # メッセージが送信されるのを待つ
        
        print(f"文字起こし情報を {target_topic} トピックに送信しました")
        
    except Exception as e:
        print(f"エラーが発生しました: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise

def validate_gcs_uri(uri: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Google Cloud Storage URIを検証し、バケット名とオブジェクト名を抽出する
    
    Args:
        uri: 検証するURI（例: gs://bucket-name/path/to/file.txt）
        
    Returns:
        (有効かどうか, バケット名, オブジェクト名)のタプル
    """
    if not uri:
        return False, None, None
        
    # gs://bucket-name/path のパターンをチェック
    match = re.match(r'^gs://([^/]+)/(.+)$', uri)
    if not match:
        return False, None, None
        
    bucket_name = match.group(1)
    blob_name = match.group(2)
    
    return True, bucket_name, blob_name

def check_gcs_object_exists(bucket_name: str, blob_name: str) -> bool:
    """
    Google Cloud Storageのオブジェクトが存在するかチェックする
    
    Args:
        bucket_name: バケット名
        blob_name: オブジェクト名（パス）
        
    Returns:
        オブジェクトが存在すればTrue、そうでなければFalse
    """
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        return blob.exists()
    except Exception as e:
        print(f"GCSオブジェクト存在チェック中にエラー: {e}")
        return False

def get_transcript_preview(bucket_name: str, blob_name: str, max_lines: int = 5) -> Optional[str]:
    """
    文字起こしファイルの最初の数行を取得する
    
    Args:
        bucket_name: バケット名
        blob_name: オブジェクト名（パス）
        max_lines: 取得する最大行数
        
    Returns:
        ファイルの最初の数行、またはエラー時はNone
    """
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        # ストリーミングダウンロード（全体をダウンロードせず一部だけ取得）
        with blob.open("r") as f:
            lines = []
            for _ in range(max_lines):
                line = f.readline()
                if not line:
                    break
                lines.append(line.strip())
                
            return "\n".join(lines)
    except Exception as e:
        print(f"ファイルプレビュー取得中にエラー: {e}")
        return None

def validate_transcript_format(text: str) -> bool:
    """
    文字起こしの形式が標準的かどうかを検証する
    
    Args:
        text: 検証するテキスト
        
    Returns:
        形式が妥当と思われればTrue
    """
    if not text:
        return False
        
    # Meet文字起こしの典型的なパターン: "名前: テキスト" または "HH:MM:SS 名前: テキスト"
    patterns = [
        r'\d{2}:\d{2}:\d{2}\s+.+:.+',  # 00:00:00 名前: テキスト
        r'.+:.+',                       # 名前: テキスト
    ]
    
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # どれかのパターンにマッチすればOK
        if any(re.match(pattern, line) for pattern in patterns):
            return True
            
    return False
