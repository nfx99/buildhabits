module.exports = {
  plugins: [
    require('postcss-purgecss')({
      content: ['./src/**/*.js', './public/index.html'],
      defaultExtractor: content => content.match(/[ 0-\w-/:]+(?<!:)/g) || [],
    }),
  ],
}; 