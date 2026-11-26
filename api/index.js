import { handleWebRequest } from '../web/server.js';

export default async function handler(req, res) {
  return handleWebRequest(req, res, { serveStatic: false });
}
