const path = require("path");

module.exports = {
  mode: "production", // or 'development' for easier debugging
  entry: "./src/components/HarmonyExport.js", // Path to your component
  output: {
    path: path.resolve(__dirname, "build/js"), // Output directory
    filename: "harmony-export.js", // Output filename
    library: "HarmonyExport", // Library name (for UMD)
    libraryTarget: "umd", // Universal Module Definition
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
    ],
  },
};
