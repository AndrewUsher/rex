# Rex
**Simple single page app pre renderer cli**

## Use

Just tell rex where your app is.
```sh
rex dist
```

### Options

By default rex will only render the '/' route.
You can pass the routes you want prerendered using the `--routes` flag.
```sh
rex dist --routes=/,/contact,/blog
```

You can also specify a port number. Defaults to `3000`.
```sh
rex dist --port 8080
```

The output should be
* `index.html`
* `contact/index.html`
* `blog/index.html`

