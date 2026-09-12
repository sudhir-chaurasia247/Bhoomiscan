const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const activeLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function log(level, message, meta) {
  if (LEVELS[level] > activeLevel) return;
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`;
  if (meta instanceof Error) {
    console[level === "debug" ? "log" : level](line, meta.stack || meta.message);
    return;
  }
  if (meta !== undefined) {
    console[level === "debug" ? "log" : level](line, meta);
    return;
  }
  console[level === "debug" ? "log" : level](line);
}

module.exports = {
  error: (message, meta) => log("error", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  info: (message, meta) => log("info", message, meta),
  debug: (message, meta) => log("debug", message, meta),
};
