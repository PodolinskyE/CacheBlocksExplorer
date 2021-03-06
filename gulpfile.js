var gulp = require('gulp')
var gutil = require('gulp-util')
var clean = require('gulp-clean')
var cheerio = require('gulp-cheerio')
var wrapper = require('gulp-wrapper')
var rename = require('gulp-rename')
var htmlReplace = require('gulp-html-replace')
var fs = require('fs')
var path = require('path')
var cacheBuilder = require('gulp-cachebuild')
var webpack = require('webpack')
var WebpackDevServer = require('webpack-dev-server')
var ProgressPlugin = require('webpack/lib/ProgressPlugin')

gulp.task('default', ['build'])

gulp.task('build', ['xml'])

gulp.task('clean', function () {
  return gulp.src([
    './build/'
  ], {
      read: false
    })
    .pipe(clean())
})

gulp.task('webpack', ['clean'], function (callback) {
  var webpackConfig = require('./webpack.config.js')
  webpack(webpackConfig, function (err, stats) {
    if (err) throw new gutil.PluginError("webpack", err);
    gutil.log("[webpack]", stats.toString({
      // output options
    }));
    callback();
  });
})

gulp.task('csp', ['webpack'], function () {
  return gulp.src([
    './build/**/*',
    '!./build/xml',
    '!./build/**/*.xml'
  ])
  .pipe(wrapper({
    header: '<?xml version="1.0" encoding="UTF-8"?>\n<Export generator="Cache" version="24">\n<CSP name="${filename}" application="/blocks/" default="1"><![CDATA[',
    footer: ']]></CSP>\n</Export>'
  }))
  .pipe(rename(function(path ){
    path.extname += '.xml'
  }))
  .pipe(gulp.dest('./build/xml/'))
});

gulp.task('xml', ['clean', 'webpack'], function () {
  return gulp.src([
    './BlocksExplorer.prj.xml',
    './Blocks/**/*.xml'
  ])
    .pipe(cheerio({
      run: function ($, file) {
        // var staticFiles = fs.readdirSync('./build/')

        // staticFiles.map(function (fileName) {
        //   try {
        //     fullName = path.join('./build/', fileName)
        //     if (!fs.statSync(fullName).isDirectory()) {
        //       $('Project>Items').append(
        //         $('<ProjectItem>')
        //           .attr('type', 'CSP')
        //           .attr('name', fileName)
        //       );
        //       // $('Class[name="Blocks.Router"]').append($('<XData>')
        //       //   .attr('name', fileName.replace(/\./g, '_'))
        //       //   .append('<Description>*base64*</Description>')
        //       //   .append(
        //       //   $('<Data><![CDATA[ <data>' + (fs.readFileSync(fullName, {
        //       //     encoding: 'base64'
        //       //   })).replace(/[\n\r]/g, '') + '</data> ]]> </Data>')
        //       //   )
        //       // )
        //     }
        //   } catch (err) {
        //     console.log(err)
        //   }
        // })

      },
      parserOptions: {
        xmlMode: true,
        prettify: true
      }
    }))
    .pipe(gulp.dest('./build/xml/'))
})

gulp.task('project', ['clean', 'xml', 'csp'], function () {
  return gulp.src([
    './build/xml/BlocksExplorer.prj.xml',
    './build/xml/**/*.xml',
    '!./build/xml/**/*Installer.cls.xml'
  ])
    .pipe(cacheBuilder('CacheBlocksExplorerProject.xml'))
    .pipe(gulp.dest('./build/'))
})

gulp.task('standalone', ['project'], function () {
  return gulp.src([
    './build/xml/StandaloneInstaller.cls.xml'
  ])
    .pipe(cheerio({
      run: function ($, file) {
        var projectFile = './build/CacheBlocksExplorerProject.xml'
        var projectData = (fs.readFileSync(projectFile, {
          encoding: 'base64'
        })).replace(/[\r\n]/g, '')

        try {
          $('Class[name="Blocks.StandaloneInstaller"]')
            .append($('<XData>')
              .attr('name', 'Data')
              .append('<Description>*base64*</Description>')
              .append(
              $('<Data><![CDATA[ <data>' + projectData + '</data> ]]> </Data>')
              )
            )
          $('Class[name="Blocks.StandaloneInstaller"]>Parameter[name="AUTOINSTALL"]>Default')
            .text('1')
        } catch (err) {
          console.log(err)
        }
      },
      parserOptions: {
        xmlMode: true,
        prettify: true
      }
    }))
    .pipe(gulp.dest('./build/'))
})

gulp.task('serve', function (callback) {
  const host = 'localhost'
  const port = 9000

  var webpackConfig = require('./webpack.config.js')

  webpackConfig.entry.main.unshift(
    `webpack-dev-server/client?http://${host}:${port}/`
  );

  var compiler = webpack(webpackConfig)

  var WebpackDevServerConfig = {
    contentBase: './',
    historyApiFallback: true,
    stats: {
      assets: true,
      colors: true,
      version: true,
      hash: true,
      timings: true,
      chunks: false,
      chunkModules: false
    },
    inline: true,
    proxy: {
      '/rest': {
        target: 'http://localhost:57774/blocks'
      },
      '/websocket': {
        target: 'ws://localhost:57774/blocks',
        changeOrigin: true,
        ws: true
      }
    }
  }

  const server = new WebpackDevServer(compiler, WebpackDevServerConfig)
  server.listen(port, host, function (err) {
    if (err) throw new gutil.PluginError("webpack-dev-server", err);
  });
})
