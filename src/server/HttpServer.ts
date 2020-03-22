import { createServer } from "http";
import * as path from "path";
import * as finalhandler from 'finalhandler';
import * as serveStatic from 'serve-static';

const clientDirectory = path.join(__dirname, "../../dist");

const serve = serveStatic(clientDirectory);

export default createServer((req, res) => {
  const done = finalhandler(req, res);

  serve(req as any, res as any, done);
});

