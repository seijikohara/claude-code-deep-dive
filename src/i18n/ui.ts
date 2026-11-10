// UI strings for the site pages. The deck content itself lives in src/chapters (Japanese edition).
export const languages = { en: "English", ja: "日本語" } as const;
export type Lang = keyof typeof languages;

export const ui = {
  en: {
    "site.title": "Claude Code Deep Dive",
    "site.description":
      "A reference deck on every feature of Claude Code 2.1.321, checked against the official documentation and the installed binary.",
    "home.lead":
      "Every feature of Claude Code 2.1.321 in one reference deck: commands, settings, extension points, multi-agent features, platforms, enterprise operation, and experimental options. Each fact comes from the official documentation, the changelog, or a run of the installed binary.",
    "home.editions": "Editions",
    "home.ja.title": "Japanese edition",
    "home.ja.body": "About 570 slides. Open it in the browser and navigate with the arrow keys.",
    "home.ja.open": "Open the deck",
    "home.en.title": "English edition",
    "home.en.body": "In preparation. The site is already set up for it.",
    "home.method": "How the deck is checked",
    "home.method.1":
      "Facts come from the official docs (228 pages), the changelog, `--help` output, and headless runs of 2.1.321.",
    "home.method.2":
      "Every slide names its sources. Features that are not generally available carry a status label.",
    "home.method.3":
      "Where the docs, the changelog, and the binary disagree, the slide shows both readings.",
    "home.keys": "Keys: → next chapter, ↓ next slide, Esc overview, Ctrl+Shift+F search.",
    "footer.unofficial": "Unofficial reference. Not affiliated with or endorsed by Anthropic.",
    "footer.source": "Source on GitHub",
  },
  ja: {
    "site.title": "Claude Code Deep Dive",
    "site.description":
      "Claude Code 2.1.321 の全機能を、公式ドキュメントと実機の動作にもとづいて解説するリファレンス資料です。",
    "home.lead":
      "Claude Code 2.1.321 の全機能を 1 つのリファレンス資料にまとめました。コマンド、設定、拡張ポイント、マルチエージェント機能、各プラットフォーム、エンタープライズ運用、実験的なオプションまで扱います。記述はすべて、公式ドキュメント、changelog、インストール済みのバイナリでの実行結果に基づきます。",
    "home.editions": "版",
    "home.ja.title": "日本語版",
    "home.ja.body": "約 570 枚。ブラウザで開き、矢印キーで進みます。",
    "home.ja.open": "スライドを開く",
    "home.en.title": "英語版",
    "home.en.body": "準備中です。サイトは英語版を載せられる構成になっています。",
    "home.method": "確認の方法",
    "home.method.1":
      "情報源は、公式ドキュメント（228 ページ）、changelog、`--help` の出力、2.1.321 のヘッドレス実行の結果です。",
    "home.method.2":
      "すべてのスライドに出典を記載し、一般提供前の機能にはステータスを付けています。",
    "home.method.3":
      "ドキュメント・changelog・実機の記述が食い違う箇所では、両方の説を並べて示します。",
    "home.keys": "操作: → 次の章、↓ 次のスライド、Esc 全体表示、Ctrl+Shift+F 検索",
    "footer.unofficial":
      "非公式のリファレンスです。Anthropic とは関係がなく、Anthropic の承認も受けていません。",
    "footer.source": "GitHub のソース",
  },
} as const;

export type UiKey = keyof (typeof ui)["en"];

/** Return a translator for `lang`. */
export function useTranslations(lang: Lang) {
  return (key: UiKey): string => ui[lang][key];
}
