import PinboardClient from './core/PinboardClient';
import loadConfig from './loadConfig';

(async () => {
  const config = await loadConfig();
  const client = new PinboardClient(config);
  await client.login();
})();
