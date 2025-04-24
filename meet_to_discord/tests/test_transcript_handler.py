import unittest
import json
import base64
import os
import sys
from unittest.mock import patch, MagicMock, mock_open

# テスト対象のモジュールへのパスを追加
sys.path.append(os.path.join(os.path.dirname(__file__), '../functions'))

# テスト対象のモジュールをインポート
import transcript_handler

class TestTranscriptHandler(unittest.TestCase):
    """トランスクリプトハンドラのテストクラス"""

    def setUp(self):
        """各テスト実行前の準備"""
        # テスト用のサンプルデータ
        self.sample_event_data = {
            "eventType": "transcript_ready",
            "meetingData": {
                "meetingId": "test_meeting_id",
                "conferenceId": "test_conference_id",
                "transcriptUri": "gs://test-bucket/test-transcript.txt",
                "meetingTitle": "テスト会議"
            },
            "receiveTime": "2025-04-24T15:00:00Z"
        }
        
        # Pub/Subへ送信するメッセージデータ
        self.expected_message = {
            "meetingId": "test_meeting_id",
            "conferenceId": "test_conference_id",
            "transcriptUri": "gs://test-bucket/test-transcript.txt",
            "meetingTitle": "テスト会議",
            "timestamp": "2025-04-24T15:00:00Z"
        }
        
    def _create_cloud_event(self, data):
        """Cloud EventsフォーマットのイベントデータをBase64エンコードして作成"""
        encoded_data = base64.b64encode(json.dumps(data).encode('utf-8')).decode('utf-8')
        return {"data": encoded_data}
        
    @patch('transcript_handler.publisher')
    @patch('transcript_handler.storage_client')
    def test_valid_event_processing(self, mock_storage, mock_publisher):
        """有効なイベントの処理テスト"""
        # モックの設定
        mock_topic_path = MagicMock()
        mock_publisher.topic_path.return_value = mock_topic_path
        
        mock_bucket = MagicMock()
        mock_storage.bucket.return_value = mock_bucket
        mock_blob = MagicMock()
        mock_bucket.blob.return_value = mock_blob
        mock_blob.exists.return_value = True
        
        # イベントデータを作成
        event = self._create_cloud_event(self.sample_event_data)
        
        # 環境変数を設定
        with patch.dict(os.environ, {"PROJECT_ID": "test-project", "TOPIC": "test-topic"}):
            # 関数を実行
            transcript_handler.main(event, None)
            
            # アサーション
            mock_publisher.topic_path.assert_called_once_with("test-project", "test-topic")
            mock_publisher.publish.assert_called_once()
            # 送信データの確認
            args, kwargs = mock_publisher.publish.call_args
            self.assertEqual(args[0], mock_topic_path)
            sent_data = json.loads(kwargs['data'].decode('utf-8'))
            self.assertEqual(sent_data, self.expected_message)
            
    @patch('transcript_handler.publisher')
    def test_invalid_event_type(self, mock_publisher):
        """無効なイベントタイプのテスト"""
        # 無効なイベントタイプを設定
        invalid_data = self.sample_event_data.copy()
        invalid_data["eventType"] = "other_event"
        
        # イベントデータを作成
        event = self._create_cloud_event(invalid_data)
        
        # 関数を実行
        transcript_handler.main(event, None)
        
        # publishは呼ばれないことを確認
        mock_publisher.publish.assert_not_called()
        
    @patch('transcript_handler.publisher')
    def test_missing_transcript_uri(self, mock_publisher):
        """トランスクリプトURIが欠落しているテスト"""
        # URIなしのデータ
        invalid_data = self.sample_event_data.copy()
        invalid_data["meetingData"] = {
            "meetingId": "test_meeting_id",
            "conferenceId": "test_conference_id",
            "meetingTitle": "テスト会議"
            # transcriptUriは省略
        }
        
        # イベントデータを作成
        event = self._create_cloud_event(invalid_data)
        
        # 関数を実行
        transcript_handler.main(event, None)
        
        # publishは呼ばれないことを確認
        mock_publisher.publish.assert_not_called()
        
    @patch('transcript_handler.publisher')
    @patch('transcript_handler.storage_client')
    def test_nonexistent_gcs_object(self, mock_storage, mock_publisher):
        """存在しないGCSオブジェクトのテスト"""
        # モックの設定
        mock_bucket = MagicMock()
        mock_storage.bucket.return_value = mock_bucket
        mock_blob = MagicMock()
        mock_bucket.blob.return_value = mock_blob
        # オブジェクトが存在しないと設定
        mock_blob.exists.return_value = False
        
        # イベントデータを作成
        event = self._create_cloud_event(self.sample_event_data)
        
        # 関数を実行
        transcript_handler.main(event, None)
        
        # publishは呼ばれないことを確認
        mock_publisher.publish.assert_not_called()
        
    @patch('transcript_handler.publisher')
    @patch('transcript_handler.storage_client')
    def test_invalid_gcs_uri_format(self, mock_storage, mock_publisher):
        """無効なGCS URIフォーマットのテスト"""
        # 無効なURIを設定
        invalid_data = self.sample_event_data.copy()
        invalid_data["meetingData"]["transcriptUri"] = "invalid://uri/format"
        
        # イベントデータを作成
        event = self._create_cloud_event(invalid_data)
        
        # 関数を実行
        transcript_handler.main(event, None)
        
        # publishは呼ばれないことを確認
        mock_publisher.publish.assert_not_called()
        
    @patch('transcript_handler.validate_transcript_format')
    @patch('transcript_handler.get_transcript_preview')
    @patch('transcript_handler.check_gcs_object_exists')
    @patch('transcript_handler.publisher')
    def test_transcript_format_warning(self, mock_publisher, mock_check, mock_preview, mock_validate):
        """文字起こし形式の警告テスト"""
        # モックの設定
        mock_check.return_value = True
        mock_preview.return_value = "サンプルテキスト（非標準形式）"
        # 形式が無効であると設定
        mock_validate.return_value = False
        
        # イベントデータを作成
        event = self._create_cloud_event(self.sample_event_data)
        
        # 関数を実行（環境変数を設定）
        with patch.dict(os.environ, {"PROJECT_ID": "test-project", "TOPIC": "test-topic"}):
            transcript_handler.main(event, None)
            
            # 警告が出ても処理は続行される（publishは呼ばれる）
            mock_publisher.publish.assert_called_once()
            
    @patch('transcript_handler.publisher')
    def test_no_event_data(self, mock_publisher):
        """イベントデータが空のテスト"""
        # 空のイベント
        event = {}
        
        # 関数を実行
        transcript_handler.main(event, None)
        
        # publishは呼ばれないことを確認
        mock_publisher.publish.assert_not_called()
            
if __name__ == '__main__':
    unittest.main() 