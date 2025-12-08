import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// =============================================================================
// CONFIGURE YOUR PROJECT HERE
// =============================================================================
const PROJECT_NAME = 'DDIA Study Guide';     // Display name
const GITHUB_USERNAME = 'YZXBiz';            // Your GitHub username
const REPO_NAME = 'ddia';                    // Repository name
// =============================================================================

const config: Config = {
  title: PROJECT_NAME,
  tagline: 'A comprehensive guide to designing scalable, reliable data systems',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  themes: ['@docusaurus/theme-live-codeblock'],

  // GitHub Pages deployment
  url: `https://${GITHUB_USERNAME}.github.io`,
  baseUrl: `/${REPO_NAME}/`,
  organizationName: GITHUB_USERNAME,
  projectName: REPO_NAME,
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',

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
          routeBasePath: '/',
          editUrl: `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/tree/main/docs/`,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.jpg',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: PROJECT_NAME,
      logo: {
        alt: `${PROJECT_NAME} Logo`,
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guideSidebar',
          position: 'left',
          label: 'Guide',
        },
        {
          href: `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}`,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Guide',
          items: [
            {label: 'Introduction', to: '/'},
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}`,
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} ${PROJECT_NAME}. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'json', 'go', 'java', 'python', 'csharp', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
