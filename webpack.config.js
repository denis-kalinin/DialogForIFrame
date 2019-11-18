const HtmlWebPackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
//var lodash = require('lodash');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
module.exports = {
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.html$/,
        use: [{ loader: "html-loader", options: { minimize: false } }]
      },
      {
       test: /\.css$/,
       use: ['style-loader', 'css-loader']
      }
    ]
  },
  devtool: 'inline-source-map',
  optimization: {
    moduleIds: 'hashed',
    minimize: false,
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
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebPackPlugin({
      template: "src/index.html",
      filename: "index.html",
      title: "Webpacked",
      meta: {viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}
    }),
    new CopyWebpackPlugin([
      { from: 'src/static', to: 'static' },  
    ]),
  ],
  output: {
    filename: '[name].[contenthash].js',
  },
  externals : {
    //lodash : '_'
    //jquery: '$',
    //datatables: 'databales.net-bs4'
  },
};
//////PRODUCTION////////
module.exports = {
  mode: 'production',
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
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebPackPlugin({
      template: "src/index.html",
      filename: "index.html",
      title: "Webpacked",
      meta: {viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}
    }),
    new CopyWebpackPlugin([
      { from: 'src/static', to: 'static' },      
      //{ from: 'src/closeable.html'},     
      //{ from: 'src/main.css'}
    ]),
  ],
  output: {
    filename: '[name].[contenthash].js',
  },
  externals : {},
};