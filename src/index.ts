import * as Sentry from '@sentry/node';
import { homedir } from 'os';
import PinboardClient from './core/PinboardClient';
import loadConfig from './loadConfig';
import './models';
import { rootDir } from './util';

(async () => {
  const config = await loadConfig();

  Sentry.init({
    dsn: config.sentryDSN,
    environment: config.development === false ? 'production' : 'development',
    beforeSend: (event) => {
      const home = homedir();
      if (event.exception?.values)
        for (const exception of event.exception.values) {
          if (exception.stacktrace?.frames) {
            for (const frame of exception.stacktrace.frames) {
              // remove PII from stacktrace
              if (frame.filename)
                frame.filename = frame.filename
                  .replaceAll(rootDir, '.')
                  .replaceAll(home, '~');
            }
          }
        }

      return event;
    }
  });

  const client = new PinboardClient(config);
  await client.login();
})();
