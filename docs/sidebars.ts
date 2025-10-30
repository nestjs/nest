import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Main documentation sidebar
  tutorialSidebar: [
    'intro',
    // Note: Additional getting started and core concept pages will be added
  ],

  // Advanced topics sidebar
  advancedSidebar: [
    'advanced/intro',
    {
      type: 'category',
      label: 'Dependency Injection Mastery',
      items: [
        'advanced/di/scopes',
        // More DI topics will be added here
      ],
    },
    {
      type: 'category',
      label: 'Performance Optimization',
      items: [
        'advanced/performance/intro',
        // More performance topics will be added here
      ],
    },
    {
      type: 'category',
      label: 'Microservices Architecture',
      items: [
        'advanced/microservices/intro',
        // More microservices topics will be added here
      ],
    },
    {
      type: 'category',
      label: 'Custom Decorators & Metadata',
      items: [
        'advanced/decorators/intro',
        // More decorator topics will be added here
      ],
    },
    {
      type: 'category',
      label: 'Testing Strategies',
      items: [
        'advanced/testing/intro',
        // More testing topics will be added here
      ],
    },
  ],

  // API Reference sidebar
  apiSidebar: [
    'api/intro',
    // API documentation will be generated here when TypeDoc is enabled
  ],
};

export default sidebars;
