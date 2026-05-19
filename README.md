# Soichiro's Daily Life

子供のスケートボード練習を、毎日のチャレンジ・動画・成長ログで支えるWebアプリです。

- 「まずはこの5つ」で今日やる技を絞る
- ガチャ風の「次のチャレンジ」
- 「できた」を押すと回数と日付を記録
- 技一覧、できた図鑑、成長メモを表示
- 動画を撮ってApps Script経由でGoogle Driveへ保存
- スプレッドシートに動画URLや練習ログを記録
- 日付が変わると今日の進捗は自動でリセット
- 技名、種類、レベルで検索・絞り込み
- 各カードから動画検索を開ける
- 技カテゴリごとの背景画像を表示

## Repository

GitHubリポジトリ名は `soichiros-daily-life` を想定しています。

## GitHub Pages

このフォルダは静的ファイルだけで動くため、GitHub Pagesでそのまま公開できます。

公開対象ファイル:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `data/tricks.json`
- `data/sync_meta.json`
- `assets/backgrounds/*.jpg`
- `apps_script/Code.gs`
- `.nojekyll`

## Apps Script

`apps_script/Code.gs` をGoogle Apps Scriptへ貼り付けてWebアプリとしてデプロイすると、動画をGoogle Driveに保存し、スプレッドシートへ記録できます。

## 技リスト更新

Excelの技リストを更新したあと、ローカルで `sync_from_excel.py` を実行すると `data/tricks.json` を更新できます。
