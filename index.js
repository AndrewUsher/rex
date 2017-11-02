#!/usr/bin/env node
const path = require('path');
const puppeteer = require('puppeteer');
const superstatic = require('superstatic').server;
const shell = require('shelljs');
const caporal = require('caporal');
const fs = require('fs');

let routes = [];
let _port = 3000;

caporal
  .version('0.0.2')
  .description('Prerender your single page app')
  .argument('[directory]', 'Directory your site lives in')
  .option(
    '--routes',
    'List of routes to prerender - Default is "/"',
    caporal.LIST
  )
  .option(
    '--port',
    'Port used to run the build server - Default is port 3000',
    caporal.INT
  )
  .action(async function(args, options, logger) {
    serve(args.directory, options.port);
    if (options.routes) {
      const staticFiles = options.routes.map(async (route, index) => {
        const result = await go(options, route);
        return await saveFile(args.directory, route, result);
      });

      await waitForStaticFiles(staticFiles);
      process.exit();
    } else {
      const result = await go(options);
      await saveFile(args.directory, '/', result);
      process.exit();
    }
  });

caporal.parse(process.argv);

function serve(directory, port) {
  _port = port || 3000;
  const app = superstatic({
    port: _port,
    config: {
      public: directory || 'dist',
      rewrites: [{ source: '**', destination: '/index.html' }]
    }
  });

  app.listen();
}

async function go(opts, route = '') {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${_port}${route}`);

  const contents = await page.evaluate(
    () => document.documentElement.outerHTML
  );

  await browser.close();
  return contents;
}

async function saveFile(directory, route = '', contents) {
  return new Promise((res, rej) => {
    if (route != '/') {
      shell.mkdir('-p', path.join(process.cwd() + '/' + directory + route));
    }

    fs.writeFile(
      path.join(process.cwd() + '/' + directory + route, 'index.html'),
      contents,
      'utf-8',
      err => {
        if (err) rej(err);
        res();
      }
    );
  });
}

async function waitForStaticFiles(staticFiles) {
  return Promise.all(staticFiles);
  // .then(process.exit)
}
