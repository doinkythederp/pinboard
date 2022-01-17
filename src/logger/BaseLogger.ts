export default interface BaseLogger {
  debug: (msg: unknown) => void;
  info: (msg: unknown) => void;
  warn: (msg: unknown) => void;
  error: (msg: unknown) => void;
}
