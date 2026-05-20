# ハーネス設計 — Soichiro's Daily Life

## 1. 主AIエージェント

- Claude Code（CLI）
- モデル: Anthropic Claude（CLI設定で最新）

## 2. 接続するMCP / 外部連携

- [x] GitHub: コミット・push・PR（Bash経由でgitコマンド直接）
- [x] Firebase: Console操作は人間が手動、コード変更はClaude
- [x] Google Drive: ローカル同期フォルダ内のファイルを直接編集
- [ ] Notion: 未使用
- [ ] Slack / メール: 未使用
- [ ] ブラウザ自動: 未使用（人間が確認）

## 3. コンテキスト

- ユーザー情報: `~/.claude/CLAUDE.md`
- プロジェクト情報: `./CLAUDE.md`
- 要件定義: `./REQUIREMENTS.md`
- 決定ログ: `./DECISIONS.md`
- プロジェクトメモ: `~/.claude/projects/.../memory/project_skate_app.md`

## 4. フィードバックループ

- ローカルプレビュー: Google Drive同期フォルダなので、保存即同期される
- 本番反映: GitHub push → GitHub Pages の自動ビルド（1〜2分）
- 動作確認: 本番URLを Safari/Chrome で開く
- エラー確認: ブラウザコンソール、Firebase Console の Firestore/Storage 表示、ユーザーからの報告

## 5. ガードレール

- Firebase予算アラート: ¥100/月
- 動画アップ上限: 200MB（Storage ルール）
- 家族3アカウント以外はAuth拒否
- 親設定タブは子供アカウントで非表示（UI層）
- git force push禁止
- `apps_script/Code.gs` は触らない（旧構成の保存用）

## 6. 1回の作業の標準フロー

1. ユーザーが要望を日本語で伝える
2. Claudeが影響範囲と方針を提示（必要ならAskUserQuestion）
3. ユーザーが承認
4. Claudeがコード編集 → git commit → push
5. 1〜2分後、ユーザーが本番URL を強制リロード（Cmd+Shift+R）して確認
6. 問題があれば1へ戻る

## 7. 困ったときの相談先

- Claude Code 自体の使い方 → claude-code-guide subagent
- Firebaseの設定方法 → Firebase公式ドキュメント or claude-code-guide
- 緊急時の連絡先: 自分（脩平）/ 妻
