import { isKafkaCoreSupportedNode } from '../../utils/kafka-client.utils.js';

/**
 * kafka-core requires Node.js 24, while the framework and its CI still support
 * older releases, so specs that load it run only where it loads.
 */
export const isKafkaCoreSupported = isKafkaCoreSupportedNode();
