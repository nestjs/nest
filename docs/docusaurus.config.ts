import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'NestJS Deep Dive',
  tagline: 'Master the Hidden Secrets of NestJS - Advanced Patterns, Performance, and Best Practices',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'nestjs', // Usually your GitHub org/user name.
  projectName: 'nest', // Usually your repo name.

  onBrokenLinks: 'warn', // Changed to 'warn' to allow build with placeholder links

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/nestjs/nest/tree/master/docs/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/nestjs/nest/tree/master/docs/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  // Temporarily disabled TypeDoc plugin - uncomment to generate API docs
  // plugins: [
  //   [
  //     'docusaurus-plugin-typedoc',
  //     {
  //       entryPoints: ['../packages/core/index.ts', '../packages/common/index.ts'],
  //       tsconfig: '../tsconfig.json',
  //       out: 'docs/api',
  //       exclude: ['../integration/**/*', '../sample/**/*', '**/*.spec.ts'],
  //       skipErrorChecking: true,
  //     },
  //   ],
  // ],

  themes: ['@docusaurus/theme-live-codeblock'],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/nestjs-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
      defaultMode: 'dark',
    },
    navbar: {
      title: 'NestJS Deep Dive',
      logo: {
        alt: 'NestJS Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          type: 'docSidebar',
          sidebarId: 'advancedSidebar',
          position: 'left',
          label: 'Advanced',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API Reference',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/nestjs/nest',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'Advanced Topics',
              to: '/docs/advanced/intro',
            },
            {
              label: 'API Reference',
              to: '/docs/api/intro',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/nestjs',
            },
            {
              label: 'Discord',
              href: 'https://discord.gg/G7Qnnhy',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/nestframework',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Official Docs',
              href: 'https://docs.nestjs.com',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/nestjs/nest',
            },
            {
              label: 'Blog',
              to: '/blog',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} NestJS. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['typescript', 'javascript', 'bash', 'json', 'yaml', 'docker'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
