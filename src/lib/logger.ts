type Fields = {
  monitorId?: string;
  jobId?: string;
  duration?: number;
  result?: string;
  count?: number;
};
export function log(event: string, fields: Fields = {}) {
  console.info(
    JSON.stringify({ event, ...fields, timestamp: new Date().toISOString() }),
  );
}
