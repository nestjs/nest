// The Node.js releases @platformatic/kafka runs on (its "engines" field)
const [major, minor] = process.versions.node.split('.').map(Number);

export const isPlatformaticKafkaSupported =
  major > 22 || (major === 22 && minor >= 22);
