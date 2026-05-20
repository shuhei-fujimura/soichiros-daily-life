# Claude への引き継ぎ — Soichiro's Daily Life

ユーザー全体の好みは `~/.claude/CLAUDE.md` を参照。
ここはこのプロジェクト固有の事情。

---

## ひとこと説明

子供（宗市朗・小学生）のスケートボード練習を、家族3人で記録・共有するスマホ向けPWAアプリ。
動画とできた回数を貯め、図鑑・成長メモで「育ち」を可視化する。

## 関連URL

- GitHub: https://github.com/shuhei-fujimura/soichiros-daily-life
- 本番URL: https://shuhei-fujimura.github.io/soichiros-daily-life/
- Firebase Console: https://console.firebase.google.com/project/soichiros-daily-life
- Firebase project ID: `soichiros-daily-life`（asia-northeast1, Blazeプラン）

## 技術スタック

- フロント: HTML/CSS/Vanilla JS（GitHub Pages）
- 認証: Firebase Auth（Google ログイン）
- DB: Firestore（リアルタイム購読）
- ストレージ: Firebase Storage（動画、最大200MB/本）
- 配信: GitHub Pages + manifest.webmanifest + sw.js でPWA化

## 家族・メンバー

| ロール | メール | 権限 |
|---|---|---|
| 親（本人） | s.fujimura0406@gmail.com | 全機能。親設定タブ表示 |
| 親（妻） | 0522fujimura@gmail.com | 全機能。親設定タブ表示 |
| 子供 | so3215.fuji@gmail.com | 親設定タブ非表示。記録・動画はOK |

親判定: `isParentEmail()`（app.jsで定義）
家族判定: `isFamilyEmail()`（app.js とセキュリティルール両方で定義）

## このプロジェクト特有のガードレール

- **Firestore/Storage ルールの家族メールリスト**は app.js の `isFamilyEmail` と必ず同期する。片方だけ変更しない。
- 動画アップロード上限は 200MB（Storage ルール側で強制）。
- Blazeプランだが、予算アラート¥100 設定済み。容量を増やす変更は事前相談。
- `apps_script/Code.gs` は旧構成の名残。動作には使われない。削除前に最終確認。

## 重要なデータの場所

- 技マスター: Firestore `tricks/` コレクション（99件、`migrate.html` で投入済み）
- 練習ログ: Firestore `practiceLogs/`（「+できた」を押すたび1件）
- 動画メタ: Firestore `videos/`
- 動画本体: Storage `videos/{uid}/{videoId}.{ext}`
- 親が選んだ今日のチャレンジ: Firestore `pinnedToday/{YYYY-MM-DD}`
- 「まずはこの5つ」: Firestore `settings/app.todays5`

## 進行中の作業 / TODO

- なし（PWA化まで完了）

## 既知の課題

- Service Workerのキャッシュ期間設定が雑。アップデート反映に強制リロードが必要なことあり。
- 60日より古い practiceLogs は集計表示に含まれない（取得対象外）。長期保持したい場合は要設計。

## 決定の経緯

→ `DECISIONS.md` を参照
