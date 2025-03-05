from pytube import YouTube
import sys
import yt_dlp

def download_with_pytube(url):
    try:
        print("動画情報を取得中...")
        yt = YouTube(url)

        print(f"タイトル: {yt.title}")
        print(f"再生回数: {yt.views}")

        print("最高画質の動画を選択中...")
        video = yt.streams.get_highest_resolution()

        print("ダウンロードを開始します...")
        video.download()
        print("ダウンロードが完了しました！")
    except Exception as e:
        print(f"pytubeでエラーが発生しました: {str(e)}")
        print("yt-dlpでダウンロードを試みます...")
        download_with_ytdlp(url)

def download_with_ytdlp(url):
    try:
        ydl_opts = {
            'format': 'best',
            'outtmpl': '%(title)s.%(ext)s',
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        print("yt-dlpを使用してダウンロードが完了しました！")
    except Exception as e:
        print(f"yt-dlpでもエラーが発生しました: {str(e)}")
        print("別の動画URLを試すか、インターネット接続を確認してください。")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        url = sys.argv[1]
        download_with_pytube(url)
    else:
        print("使い方: python downloader.py [YouTube URL]")
        print("例: python downloader.py https://www.youtube.com/watch?v=E7qQETkUq0M")
