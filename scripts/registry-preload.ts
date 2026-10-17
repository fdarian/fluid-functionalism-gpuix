import { registryRuntimePlugin } from './registry-plugin';

Bun.plugin(registryRuntimePlugin({ scenarios: true }));
