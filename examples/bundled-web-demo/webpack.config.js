const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      title: 'NebulaDB Demo'
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 8080,
    hot: true
  },
  resolve: {
    fallback: {
      fs: false,
      path: false,
      crypto: require.resolve('crypto-browserify'),
      zlib: false,
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      util: false,
      assert: false,
      os: false,
      events: false,
      url: false,
      http: false,
      https: false,
      net: false,
      tls: false,
      child_process: false
    }
  }
};
