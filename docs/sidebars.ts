import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  guideSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Part I: Foundations of Data Systems',
      collapsible: true,
      collapsed: false,
      items: [
        'part1/chapter01-tradeoffs',
        'part1/chapter02-nonfunctional-requirements',
        'part1/chapter03-data-models',
        'part1/chapter04-storage-retrieval',
        'part1/chapter05-encoding-evolution',
      ],
    },
    {
      type: 'category',
      label: 'Part II: Distributed Data',
      collapsible: true,
      collapsed: false,
      items: [
        'part2/chapter06-replication',
        'part2/chapter07-sharding',
        'part2/chapter08-transactions',
        'part2/chapter09-distributed-systems',
        'part2/chapter10-consistency-consensus',
      ],
    },
    {
      type: 'category',
      label: 'Part III: Derived Data',
      collapsible: true,
      collapsed: false,
      items: [
        'part3/chapter11-batch-processing',
        'part3/chapter12-stream-processing',
        'part3/chapter13-streaming-philosophy',
        'part3/chapter14-ethics',
      ],
    },
    'interactive-demo',
  ],
};

export default sidebars;
