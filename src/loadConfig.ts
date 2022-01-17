import { parse as parseToml } from '@iarna/toml';
import * as fs from 'fs';
import { PinboardClientConfig } from './core/PinboardClient.js';
import { resolve as resolvePath } from 'path';
import Ajv from 'ajv';

const configLocation = resolvePath(__dirname, '../pinboard.toml');

const ajv = new Ajv();

const validConfig = ajv.compile<PinboardClientConfig>({
  type: 'object',
  properties: {
    token: { type: 'string' }
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