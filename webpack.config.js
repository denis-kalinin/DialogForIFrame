const HtmlWebPackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const concat = require('./concat.js');

const config = {
  target: 'web',
    /*
  module: {
    rules: [
      {
        test: /\.html$/,
        use: [{ loader: "html-loader", options: { minimize: true } }]
      },
      {
       test: /\.css$/,
       use: ['style-loader', 'css-loader']
      }
    ]
  },
  optimization: {
    moduleIds: 'hashed',
    minimize: true,
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    },
    runtimeChunk: 'single',
  },
  */
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
  plugins: [
    new CopyWebpackPlugin([
      { from: 'src/static', to: 'static' },
    ]),
  ],
  output: {
    path: path.resolve(__dirname, 'docs'),
    //filename: '[name].[contenthash].js',
  },
  externals : {
    //lodash : '_'
    //jquery: '$',
  },
  module: {
    rules: []
  },
  devServer: {
    port: 8088,
    publicPath: '/DialogForIFrame/',
    openPage: 'DialogForIFrame/'

  },
  entry: {
    dialog: path.resolve(__dirname, 'src/static/js/dialog.js'),
    main: path.resolve(__dirname, 'src/index.js'),
  },
}

module.exports = ( env, argv ) => {
  config.mode = argv.mode;
  //////PRODUCTION////////
  const theWebcontext = '/DialogForIFrame/';
  if (config.mode === 'production') {
    const clean = new CleanWebpackPlugin();
    const twig = new CopyWebpackPlugin([
      { 
        from: 'src/assets/js/css.twig',
        to: 'topdialog.js',
        transform(content, path){
          const filesToAppend = [
            'src/assets/js/dialog-polyfill.js',
            'src/assets/js/dialog-top.js'
          ];
          return concat(content, path, './src/assets/styles/dialog.scss', filesToAppend);
        }
      },
    ]);
    const mini = new MiniCssExtractPlugin();
    config.plugins.push(twig, mini, clean);
  }
  //////DEVELOPMENT////////
  if (config.mode === 'development'){
    const staticFolder = new CopyWebpackPlugin([
      { from: 'src/static', to: 'static' },
    ]);
    const twig = new CopyWebpackPlugin([
      { 
        from: 'src/assets/js/css-inline.twig',
        to: 'topdialog.js',
        transform(content, path){
          const filesToAppend = [
            'src/assets/js/dialog-polyfill.js',
            'src/assets/js/dialog-top.js'
          ];
          return concat(content, path, './src/assets/styles/dialog.scss', filesToAppend);
        }
      },
    ]);
    const mini = new MiniCssExtractPlugin();
    config.plugins.push(staticFolder, twig, mini);
  }
  /// Common plugins ///////
  const indexPage =  
    new HtmlWebPackPlugin({
      template: "src/index.html",
      filename: "index.html",
      templateParameters: {
        webcontext: theWebcontext
      },
      title: "Webpacked",
      meta: {viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}
    });
  const tablePage =  
    new HtmlWebPackPlugin({
      template: "src/static/html/table.html",
      filename: "static/html/table.html",
      inject: "head",
      //chunks: ['topdialog'],
      templateParameters: {
        webcontext: theWebcontext
      },
      title: "Webpacked",
      meta: {viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}
    });
  const localtestPage = 
    new HtmlWebPackPlugin({
      template: "src/static/html/localtest.html",
      filename: "thelocaltest.html",
      inject: "head",
      //chunks: ['topdialog'],
      templateParameters: {
        webcontext: theWebcontext
      },
      title: "Webpacked",
      meta: {viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}
    });
  config.plugins.push( indexPage, localtestPage);


  config.module.rules.push({
    test: /\.(s*)css$/,
    use: [ 
      MiniCssExtractPlugin.loader,
      //'handlebars-loader',
      //'extract-loader', 
      'css-loader', 
      {
        loader: 'sass-loader',
        options: {
          sassOptions: {
            outputStyle: 'expanded',
          },
        },
      },
    ]
  });

  return config;
};