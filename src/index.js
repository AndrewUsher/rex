#!/usr/bin/env node
let routes = []
let config
let _port = 3000
const path = require('path')
const puppeteer = require('puppeteer')
const superstatic = require('superstatic').server
const shell = require('shelljs')
const caporal = require('caporal')
const fs = require('fs')
const _ = require('lodash')
const pkg = require('../package.json')

const { description, version } = pkg

const { DEBUG = 'false' } = process.env
const IS_DEBUG = DEBUG === 'true'

caporal
  .version(version)
  .description(description)
  .argument('<directory>', 'Directory your site lives in')
  .option(
    '--routes [routes]',
    'List of routes to prerender - Default is "/"',
    caporal.LIST,
    '/'
  )
  .option(
    '--port [port]',
    'Port used to run the build server - Default is port 3000',
    caporal.INT,
    3000
  )
  .action(async function(args, options, logger) {
    serve(args.directory, options.port)

    // Check for rex.config.js file
    if (fs.existsSync(path.join(process.cwd(), 'rex.config.js'))) {
      // get config file
      const configFile = require(path.join(process.cwd(), 'rex.config.js'))

      // call config function to return data
      const configObject = configFile()

      // Merge cli options with config file options
      config = Object.assign({}, options, configObject)
    }

    // Merge config file options with cli options and args
    config = _.mergeWith(config, options, args, mergeArrayValues)

    // If routes were provided
    if (config.routes) {
      // Iterate over routes to prerender
      // and create an array of file objects
      const staticFiles = config.routes.map(async route => {
        // Navigate and return contents of route
        const result = await go(config, route)

        // Wait for file to save
        return await saveFile(config.directory, route, result)
      })

      // Wait for all routes to be rendered
      await waitForStaticFiles(staticFiles)

      // Kills the server and exits the process
      process.exit()
    } else {
      // This block only runs if the only route is '/'

      // Navigate and return contents of route
      const result = await go(options)

      // Wait for file to save
      await saveFile(args.directory, '/', result)

      // Kills the server and exits the process
      process.exit()
    }
  })

caporal.parse(process.argv)

// Create local server
function serve(directory, port) {
  _port = port || 3000
  const app = superstatic({
    port: _port,
    config: {
      public: directory || 'dist',
      rewrites: [{ source: '**', destination: '/index.html' }]
    }
  })

  app.listen()
}

// TODO: Break these functions out into a `utils` folder
// so it will be easier to start testing

async function go(opts, route = '') {
  const browser = await puppeteer.launch({
    headless: !IS_DEBUG
  })
  const page = await browser.newPage()
  await page.goto(`http://localhost:${_port}${route}`)

  const contents = await page.evaluate(() => document.documentElement.outerHTML)

  await browser.close()
  return contents
}

async function saveFile(directory, route = '', contents) {
  return new Promise((res, rej) => {
    if (route != '/') {
      shell.mkdir('-p', path.join(process.cwd() + '/' + directory + route))
    }

    fs.writeFile(
      path.join(process.cwd() + '/' + directory + route, 'index.html'),
      contents,
      'utf-8',
      err => {
        if (err) rej(err)
        res()
      }
    )
  })
}

async function waitForStaticFiles(staticFiles) {
  return Promise.all(staticFiles)
}

function mergeArrayValues(objValue, srcValue) {
  if (_.isArray(objValue)) {
    return objValue.concat(srcValue)
  }
}
