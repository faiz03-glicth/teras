import { envResult } from '../../config/env';
import { done, failed, type BootTask } from '../bootState';

export function envTask(): BootTask {
  return envResult.ok
    ? done
    : failed(
        'Teras is missing its configuration',
        `Check these values in .env: ${envResult.invalidKeys.join(', ')}`,
      );
}
