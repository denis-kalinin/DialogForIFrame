const HtmlWebPackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const path = require('path');
//var lodash = require('lodash');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const config = {
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
}

module.exports = ( env, argv ) => {
  config.mode = argv.mode;
  //////PRODUCTION////////
  let theWebcontext;
  if (config.mode === 'production') {
    theWebcontext = '/DialogForIframe';
    config.plugins.push(new CleanWebpackPlugin());
  }
  //////DEVELOPMENT////////
  if (config.mode === 'development'){
    theWebcontext = '';
  }
  const htmlPlugin = new HtmlWebPackPlugin({
    template: "src/index.html",
    filename: "index.html",
    templateParameters: {
      webcontext: theWebcontext
    },
    title: "Webpacked",
    meta: {viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}
  });
  config.plugins.push(htmlPlugin);

  return config;
};