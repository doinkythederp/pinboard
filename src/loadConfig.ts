import { parse as parseToml } from '@iarna/toml';
import Ajv from 'ajv';
import * as fs from 'fs';
import { resolve as resolvePath } from 'path';
import { PinboardClientConfig } from './core/PinboardClient.js';
import { rootDir } from './util.js';

const configLocation = resolvePath(rootDir, './pinboard.toml');

const ajv = new Ajv();

const validConfig = ajv.compile<PinboardClientConfig>({
  type: 'object',
  properties: {
    token: { type: 'string' },
    devServer: { type: 'string' },
    logger: {
      type: 'object',
      properties: {
        noColor: { type: 'boolean' },
        logFile: { type: 'string' },
        debug: {
          anyOf: [
            { type: 'boolean' },
            { type: 'array', items: { type: 'string' } }
          ]
        }
      }
    },
    deploy: {
      type: 'object',
      properties: {
        force: { type: 'boolean' },
        treatDevAsGlobal: { type: 'boolean' }
      }
    }
  },
  required: ['token']
});

export default async function loadConfig(): Promise<PinboardClientConfig> {
  try {
    await fs.promises.access(configLocation, fs.constants.R_OK);
  } catch {
    throw new Error(`Cannot read Pinboard config file @ ${configLocation}`);
  }

  const config = parseToml(await fs.promises.readFile(configLocation, 'utf-8'));

  if (!validConfig(config))
    throw new AggregateError(
      validConfig.errors!.map((err) => new Error(err.message)),
      `Failed to validate Pinboard config file @ ${configLocation}`
    );

  return config;
}
