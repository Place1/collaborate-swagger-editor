const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  context: path.resolve(__dirname),
  entry: {
    app: './src/index.tsx',
    editorWorker: './node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
    yamlWorker: './node_modules/monaco-languages/release/esm/yaml/yaml.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  module: {
		rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      hash: true,
      template: './index.html',
      filename: 'index.html'
    }),
  ],
  devServer: {
    port: 3000,
  },
}
