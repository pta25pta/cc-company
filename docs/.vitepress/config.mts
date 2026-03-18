import { defineConfig } from "vitepress";

export default defineConfig({
  title: "cc-company",
  description: "Claude Code で仮想組織を構築・運営するプラグイン",
  lang: "ja",
  base: "/cc-company/",
  cleanUrls: true,

  head: [["link", { rel: "icon", href: "/favicon.ico" }]],

  themeConfig: {
    nav: [
      { text: "ガイド", link: "/guide/getting-started" },
      { text: "リファレンス", link: "/reference/departments" },
      {
        text: "GitHub",
        link: "https://github.com/Shin-sibainu/cc-company",
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "はじめに",
          items: [
            { text: "cc-company とは", link: "/guide/what-is-cc-company" },
            { text: "クイックスタート", link: "/guide/getting-started" },
          ],
        },
        {
          text: "使い方",
          items: [
            { text: "秘書との日常", link: "/guide/daily-usage" },
            { text: "部署を追加する", link: "/guide/adding-departments" },
            { text: "MCP連携ガイド", link: "/guide/mcp-integration" },
            { text: "v1 からのアップグレード", link: "/guide/migration" },
          ],
        },
        {
          text: "事例",
          items: [
            { text: "活用事例", link: "/guide/use-cases" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "リファレンス",
          items: [
            { text: "部署一覧", link: "/reference/departments" },
            { text: "ファイル構成", link: "/reference/file-structure" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/Shin-sibainu/cc-company" },
    ],

    footer: {
      message: "MIT License",
      copyright: "© 2026 Shin-sibainu",
    },

    search: {
      provider: "local",
    },

    outline: {
      label: "目次",
    },

    docFooter: {
      prev: "前のページ",
      next: "次のページ",
    },
  },
});
